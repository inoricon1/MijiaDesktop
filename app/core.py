"""米家云端访问 + 本地历史记录。界面层（main.py）只和这里打交道。"""
import base64
import io
import json
import os
import sqlite3
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import qrcode
from mijiaAPI import mijiaAPI

from spec import TREND_KEYS, SpecStore, summarize

DATA_DIR = Path(os.environ.get("APPDATA", Path.home())) / "MijiaDesktop"
DATA_DIR.mkdir(parents=True, exist_ok=True)
AUTH_FILE = DATA_DIR / "auth.json"
SETTINGS_FILE = DATA_DIR / "settings.json"

DEFAULT_SETTINGS = {
    "poll_seconds": 60,
    "favorites": [],      # 置顶/小组件模式显示的设备 did
    "hidden": [],         # 隐藏的设备 did
    "home_id": None,
    "on_top": False,
    "theme": "auto",
    "show_all": False,    # 显示全部属性（含调试 / 不方便设置的）
}


class History:
    def __init__(self, path: Path):
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.lock = threading.Lock()
        with self.lock:
            self.db.execute("CREATE TABLE IF NOT EXISTS s (did TEXT, k TEXT, ts INTEGER, v REAL)")
            self.db.execute("CREATE INDEX IF NOT EXISTS s_i ON s (did, k, ts)")
            self.db.execute("DELETE FROM s WHERE ts < ?", (int(time.time()) - 14 * 86400,))
            self.db.commit()

    def add(self, rows):
        if not rows:
            return
        with self.lock:
            self.db.executemany("INSERT INTO s VALUES (?,?,?,?)", rows)
            self.db.commit()

    def get(self, did, k, hours):
        since = int(time.time()) - int(hours * 3600)
        with self.lock:
            cur = self.db.execute("SELECT ts, v FROM s WHERE did=? AND k=? AND ts>=? ORDER BY ts",
                                  (did, k, since))
            return cur.fetchall()

    def last_ts(self, did, k):
        with self.lock:
            r = self.db.execute("SELECT MAX(ts) FROM s WHERE did=? AND k=?", (did, k)).fetchone()
            return r[0] or 0


def _make_api() -> mijiaAPI:
    """mijiaAPI 默认用系统 locale（Windows 上是 'Chinese (Simplified)_China'），小米服务器不认，
    会把设备默认名称返回成英文，这里强制用 zh_CN。"""
    api = mijiaAPI(str(AUTH_FILE))
    api.locale = "zh_CN"
    api.service_login_url = "https://account.xiaomi.com/pass/serviceLogin?_json=true&sid=mijia&_locale=zh_CN"
    if api.auth_data:
        api._init_session()
    return api


# 老设备的云端历史不用 siid.piid，而是用旧属性名
LEGACY_KEYS = {"temperature": "temperature", "relative-humidity": "humidity", "pm2.5-density": "pm25",
               "co2-density": "co2", "tvoc-density": "tvoc", "illumination": "illumination"}


class Mijia:
    def __init__(self):
        self.api = _make_api()
        self.specs = SpecStore(DATA_DIR / "specs")
        self.history = History(DATA_DIR / "history.db")
        self.lock = threading.RLock()
        self.devices = {}     # did -> device dict (含 summary)
        self._urn = {}        # did -> spec_type
        self.homes = []
        self._hkey = {}       # (did, "siid.piid") -> 云端历史用的 key（None 表示云端没有）
        self._hcache = {}     # (did, k, hours) -> (取数时间, rows)
        self.login_state = {"state": "idle", "msg": ""}
        self.settings = dict(DEFAULT_SETTINGS)
        if SETTINGS_FILE.exists():
            try:
                self.settings.update(json.loads(SETTINGS_FILE.read_text(encoding="utf-8")))
            except Exception:
                pass

    # ---------- 设置 ----------
    def save_settings(self, patch: dict):
        self.settings.update(patch or {})
        SETTINGS_FILE.write_text(json.dumps(self.settings, ensure_ascii=False, indent=2), encoding="utf-8")
        return self.settings

    # ---------- 登录 ----------
    def is_logged_in(self) -> bool:
        with self.lock:
            if not self.api.auth_data:
                return False
            if self.api.available:
                return True
            try:
                self.api._refresh_token()
                return True
            except Exception:
                return False

    def start_login(self) -> dict:
        with self.lock:
            data = self.api._get_qr_login_data()
        if data.get("refreshed"):
            self.login_state = {"state": "ok", "msg": ""}
            return {"refreshed": True}
        img = qrcode.make(data["loginUrl"], box_size=8, border=2)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        self.login_state = {"state": "waiting", "msg": "请用米家 App 扫码"}

        def wait():
            try:
                self.api._complete_qr_login(data)
                self.login_state = {"state": "ok", "msg": "登录成功"}
            except Exception as e:
                self.login_state = {"state": "error", "msg": str(e)}

        threading.Thread(target=wait, daemon=True).start()
        return {"qr": "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()}

    def logout(self):
        with self.lock:
            if AUTH_FILE.exists():
                AUTH_FILE.unlink()
            self.api = _make_api()
        self.devices = {}

    # ---------- 设备列表 ----------
    def load(self) -> dict:
        with self.lock:
            homes = self.api.get_homes_list()
            devices = []
            for h in homes:
                devices.extend(self.api.get_devices_list(h["id"]))
            try:
                scenes = self.api.get_scenes_list()
            except Exception:
                scenes = []

        room_of, home_out = {}, []
        for h in homes:
            rooms = []
            for r in h.get("roomlist", []) or []:
                rooms.append({"id": str(r["id"]), "name": r["name"]})
                for did in r.get("dids", []) or []:
                    room_of[did] = str(r["id"])
            home_out.append({"id": str(h["id"]), "name": h["name"], "rooms": rooms})
        self.homes = home_out

        # 并发拉取 spec（首次较慢，之后走缓存）
        urns = {d.get("spec_type") for d in devices if d.get("spec_type")}
        with ThreadPoolExecutor(8) as ex:
            list(ex.map(self.specs.get, urns))

        out = {}
        for d in devices:
            spec = self.specs.get(d.get("spec_type"))
            out[d["did"]] = {
                "did": d["did"], "name": d.get("name", ""), "model": d.get("model", ""),
                "home_id": str(d.get("home_id", "")), "room_id": room_of.get(d["did"], ""),
                "online": bool(d.get("isOnline", True)),
                "kind": spec["kind"] if spec else (d.get("model", "").split(".")[1] if "." in d.get("model", "") else ""),
                "has_spec": spec is not None,
                "summary": summarize(spec),
            }
        self.devices = out
        self._urn = {d["did"]: d.get("spec_type") for d in devices}
        return {
            "homes": home_out,
            "devices": list(out.values()),
            "scenes": [{"id": s.get("scene_id"), "name": s.get("name"), "home_id": str(s.get("home_id"))}
                       for s in scenes],
            "settings": self.settings,
        }

    # ---------- 属性读取 ----------
    def _get_props(self, reqs: list) -> list:
        res = []
        for i in range(0, len(reqs), 80):
            chunk = reqs[i:i + 80]
            with self.lock:
                try:
                    r = self.api.get_devices_prop(chunk)
                except Exception:
                    r = []
            res.extend(r if isinstance(r, list) else [r])
        return res

    def _record(self, results):
        now = int(time.time())
        rows = []
        for r in results:
            dev = self.devices.get(r.get("did"))
            if not dev or r.get("code", 0) != 0 or not isinstance(r.get("value"), (int, float)) \
                    or isinstance(r.get("value"), bool):
                continue
            key = f"{r['siid']}.{r['piid']}"
            pkey = self._pkey(dev, r["siid"], r["piid"])
            if pkey not in TREND_KEYS:
                continue
            # 每个属性至少间隔 4 分钟记一条，避免数据库膨胀
            if now - self.history.last_ts(r["did"], key) < 240:
                continue
            rows.append((r["did"], key, now, float(r["value"])))
        self.history.add(rows)

    def _pkey(self, dev, siid, piid):
        s = dev["summary"]
        for p in s.get("env", []):
            if p["siid"] == siid and p["piid"] == piid:
                return p["key"]
        return None

    @staticmethod
    def _fmt(results):
        out = {}
        for r in results:
            out.setdefault(r["did"], {})[f"{r['siid']}.{r['piid']}"] = {
                "v": r.get("value"), "code": r.get("code", 0), "t": r.get("updateTime"),
            }
        return out

    def poll(self) -> dict:
        reqs = []
        for d in self.devices.values():
            if not d["online"] or d["did"] in self.settings["hidden"]:
                continue
            s = d["summary"]
            for p in s["sensors"] + s["status"] + ([s["power"]] if s["power"] else []):
                reqs.append({"did": d["did"], "siid": p["siid"], "piid": p["piid"]})
        results = self._get_props(reqs)
        self._record(results)
        return {"values": self._fmt(results), "ts": int(time.time())}

    # ---------- 历史 / 趋势 ----------
    def _cloud_fetch(self, did, key, since, until):
        rows = []
        end = until
        for _ in range(80):  # 每页最多 1000 条，翻页往前取（一年的高频数据约 6 万条）
            with self.lock:
                try:
                    r = self.api._request("/user/get_user_device_data", {
                        "did": did, "uid": self.api.auth_data.get("userId"), "key": key, "type": "prop",
                        "time_start": since, "time_end": end, "limit": 1000})
                except Exception:
                    r = []
            for it in r or []:
                try:
                    v = json.loads(it["value"])
                    v = float(v[0] if isinstance(v, list) else v)
                    rows.append((int(it["time"]), v))
                except Exception:
                    continue
            if not r or len(r) < 1000:
                break
            end = min(int(it["time"]) for it in r) - 1
        return rows

    def _cloud(self, did, p, hours):
        k = f"{p['siid']}.{p['piid']}"
        ck = (did, k, hours)
        hit = self._hcache.get(ck)
        if hit and time.time() - hit[0] < (600 if hours <= 24 else 1800):
            return hit[1]
        now = int(time.time())
        since = now - int(hours * 3600)
        known = self._hkey.get((did, k), "?")
        cands = [known] if known != "?" else [k, LEGACY_KEYS.get(p["key"])]
        rows = []
        for key in cands:
            if not key:
                continue
            rows = self._cloud_fetch(did, key, since, now)
            if rows:
                self._hkey[(did, k)] = key
                break
        else:
            if known == "?":
                self._hkey[(did, k)] = None
        self._hcache[ck] = (time.time(), rows)
        return rows

    def series(self, did, p, hours):
        """云端历史 + 本地记录合并，按时间排序。"""
        k = f"{p['siid']}.{p['piid']}"
        merged = dict(self._cloud(did, p, hours))
        for t, v in self.history.get(did, k, hours):
            merged.setdefault(t, v)
        return sorted(merged.items())

    @staticmethod
    def _bucket(rows, n, t0, t1):
        """按时间分桶取平均，曲线更平滑，点数也可控。"""
        if len(rows) <= n:
            return [[t, v] for t, v in rows]
        size = (t1 - t0) / n or 1
        buckets = {}
        for t, v in rows:
            buckets.setdefault(int((t - t0) / size), []).append((t, v))
        out = []
        for i in sorted(buckets):
            b = buckets[i]
            out.append([b[-1][0], sum(v for _, v in b) / len(b)])
        return out

    def trends(self) -> dict:
        """每个环境读数的 24 小时曲线 + 1 小时前的值 + 今日最高最低。"""
        now = int(time.time())
        out = {}
        for d in list(self.devices.values()):
            if not d["online"] or d["did"] in self.settings["hidden"]:
                continue
            for p in d["summary"].get("env", []):
                rows = self.series(d["did"], p, 24)
                if not rows:
                    continue
                # 约 1 小时前的值（太久远的点不算，避免离线后误报变化）
                past = [(t, v) for t, v in rows if t <= now - 3000]
                vs = [v for _, v in rows]
                out.setdefault(d["did"], {})[f"{p['siid']}.{p['piid']}"] = {
                    "pts": self._bucket(rows, 96, now - 86400, now),
                    "v1h": past[-1][1] if past and past[-1][0] >= now - 3 * 3600 else None,
                    "min": min(vs), "max": max(vs), "last": rows[-1][1], "last_t": rows[-1][0],
                }
        return out

    def detail(self, did: str) -> dict:
        dev = self.devices.get(did)
        if not dev:
            return {"error": "设备不存在"}
        spec = self.specs.get(self._urn.get(did))
        values = {}
        if spec and dev["online"]:
            reqs = [{"did": did, "siid": p["siid"], "piid": p["piid"]}
                    for s in spec["services"] for p in s["props"] if p["read"]]
            values = self._fmt(self._get_props(reqs)).get(did, {})
        return {"device": dev, "spec": spec, "values": values}

    def history_of(self, did, siid, piid, hours=24):
        spec = self.specs.get(self._urn.get(did))
        p = next((p for s in (spec or {}).get("services", []) for p in s["props"]
                  if p["siid"] == int(siid) and p["piid"] == int(piid)), None)
        if not p:
            return []
        now = int(time.time())
        return self._bucket(self.series(did, p, hours), 300, now - int(hours * 3600), now)

    # ---------- 控制 ----------
    def set_prop(self, did, siid, piid, value) -> dict:
        with self.lock:
            r = self.api.set_devices_prop({"did": did, "siid": int(siid), "piid": int(piid), "value": value})
        return {"code": r.get("code", -1), "message": r.get("message", "")}

    def action(self, did, siid, aiid, args=None) -> dict:
        p = {"did": did, "siid": int(siid), "aiid": int(aiid), "in": args or []}
        with self.lock:
            r = self.api.run_action(p)
        return {"code": r.get("code", -1), "message": r.get("message", "")}

    def run_scene(self, scene_id, home_id):
        with self.lock:
            return bool(self.api.run_scene(scene_id, home_id))

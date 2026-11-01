"""青萍开放平台（developer.qingping.co）客户端：读取青萍物联账号下的设备和历史数据。

文档：https://developer.qingping.co/cloud-to-cloud/open-apis
认证：OAuth 2.0 client credentials（App Key / App Secret），token 有效期 2 小时。
"""
import base64
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import requests

OAUTH_URL = "https://oauth.cleargrass.com/oauth2/token"
API_BASE = "https://apis.cleargrass.com/v1/apis"

# 青萍数据字段 → 和米家 MIoT 一致的属性描述（piid 只是本地编号，用来区分同一设备的不同读数）
FIELDS = [
    ("temperature", 1, "temperature", "温度", "°C", "float"),
    ("humidity", 2, "relative-humidity", "湿度", "%", "float"),
    ("co2", 3, "co2-density", "CO₂", "ppm", "int"),
    ("pm25", 4, "pm2.5-density", "PM2.5", "μg/m³", "int"),
    ("pm10", 5, "pm10-density", "PM10", "μg/m³", "int"),
    ("tvoc", 6, "tvoc-density", "TVOC", "ppb", "int"),
    ("pressure", 7, "atmospheric-pressure", "气压", "kPa", "float"),
    ("noise", 8, "noise", "噪音", "dB", "int"),
    ("battery", 9, "battery-level", "电量", "%", "int"),
]
BY_FIELD = {f[0]: f for f in FIELDS}
BY_PIID = {f[1]: f for f in FIELDS}


def norm_mac(mac: str) -> str:
    return (mac or "").replace(":", "").replace("-", "").upper()


class QingpingError(Exception):
    pass


class Qingping:
    def __init__(self, key: str, secret: str):
        self.key, self.secret = key.strip(), secret.strip()
        self._token = None
        self._exp = 0
        self._lock = threading.Lock()
        self._list = (0, [])   # (取数时间, 设备列表)

    def _auth(self) -> str:
        with self._lock:
            if self._token and time.time() < self._exp - 120:
                return self._token
            basic = base64.b64encode(f"{self.key}:{self.secret}".encode()).decode()
            r = requests.post(OAUTH_URL, headers={"Authorization": f"Basic {basic}"},
                              data={"grant_type": "client_credentials", "scope": "device_full_access"}, timeout=15)
            if r.status_code != 200:
                raise QingpingError(f"青萍授权失败（{r.status_code}），请检查 App Key / App Secret")
            j = r.json()
            self._token = j["access_token"]
            self._exp = time.time() + int(j.get("expires_in", 7200))
            return self._token

    def _get(self, path: str, **params) -> dict:
        # 每个请求都要带一个 20 秒内有效、不能重复的毫秒时间戳
        params["timestamp"] = int(time.time() * 1000)
        r = requests.get(API_BASE + path, params=params, timeout=20,
                         headers={"Authorization": f"Bearer {self._auth()}"})
        if r.status_code == 401:
            self._token = None
            raise QingpingError("青萍授权已失效")
        if r.status_code != 200:
            raise QingpingError(f"青萍接口错误 {r.status_code}: {r.text[:120]}")
        return r.json()

    def devices(self, max_age: float = 50) -> list:
        """设备列表（含最新读数），短时间内重复调用走缓存。"""
        if time.time() - self._list[0] < max_age:
            return self._list[1]
        out, offset = [], 0
        while True:
            j = self._get("/devices", offset=offset, limit=50)
            out.extend(j.get("devices", []))
            offset += 50
            if offset >= j.get("total", 0) or not j.get("devices"):
                break
        self._list = (time.time(), out)
        return out

    def history(self, mac: str, start: int, end: int, max_pages: int = 400) -> list:
        """历史数据，按时间升序返回 [{field: value, ..., "timestamp": t}]。

        接口每页最多 200 条；先取第一页拿到总数，剩下的页并发取（一年的数据从约 100 秒降到几秒）。"""
        def page(offset):
            j = self._get("/devices/data", mac=mac, start_time=start, end_time=end, offset=offset, limit=200)
            return j.get("total", 0), j.get("data", [])

        total, first = page(0)
        pages = [first]
        offsets = list(range(200, min(total, max_pages * 200), 200))
        if offsets:
            with ThreadPoolExecutor(8) as ex:
                pages.extend(ex.map(page_retry(page), offsets))
        rows = []
        for data in pages:
            for d in data:
                row = {k: v.get("value") for k, v in d.items() if isinstance(v, dict)}
                if row.get("timestamp"):
                    rows.append(row)
        rows.sort(key=lambda r: r["timestamp"])
        return rows


def page_retry(fn, tries=3):
    """并发请求偶尔会被限流，失败的页重试几次。"""
    def run(offset):
        for i in range(tries):
            try:
                return fn(offset)[1]
            except Exception:
                if i == tries - 1:
                    raise
                time.sleep(0.5 * (i + 1))
    return run


def spec_for(dev: dict) -> dict:
    """给青萍设备造一份和 MIoT spec 同结构的描述，界面就能和米家设备一样展示。"""
    fields = [f for f in FIELDS if f[0] in (dev.get("data") or {})]
    props = [{
        "siid": 0, "piid": piid, "key": key, "name": name, "type": typ, "unit": unit, "scale": 1,
        "read": True, "write": False, "range": None, "values": None, "simple": True,
    } for field, piid, key, name, unit, typ in fields]
    return {"v": 0, "urn": "", "name": dev["info"].get("product", {}).get("name", "青萍设备"),
            "kind": "air-monitor" if any(f[0] in ("co2", "pm25") for f in fields) else "temperature-humidity-sensor",
            "services": [{"siid": 0, "key": "environment", "name": "环境", "props": props, "actions": []}]}

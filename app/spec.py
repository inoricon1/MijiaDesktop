"""MIoT spec 解析：从 miot-spec.org 拉取设备规格 + 中文翻译，并做本地缓存。

相比 mijiaAPI 自带的 get_device_info，这里额外保留了单位、服务分组、
中文名称，并给每个属性/动作打上 simple 标记：调试用、不方便在桌面上设置、
或者只有英文名的条目在「简洁模式」下不显示。
"""
import json
import re
import threading
from pathlib import Path

import requests

SPEC_URL = "https://miot-spec.org/miot-spec-v2/instance"
LANG_URL = "https://miot-spec.org/instance/v2/multiLanguage"
SPEC_VERSION = 6

# 很多设备的 spec 没有 zh_cn 翻译，用这份常用词典兜底（服务 / 属性 / 动作共用）
ZH = {
    # 属性
    "on": "开关", "brightness": "亮度", "color-temperature": "色温", "color": "颜色",
    "mode": "模式", "fan-level": "风速", "temperature": "温度", "relative-humidity": "湿度",
    "target-temperature": "目标温度", "target-humidity": "目标湿度",
    "pm2.5-density": "PM2.5", "pm10-density": "PM10", "co2-density": "CO₂",
    "tvoc-density": "TVOC", "hcho-density": "甲醛", "air-quality": "空气质量",
    "illumination": "光照度", "battery-level": "电量", "charging-state": "充电状态",
    "motion-state": "有人移动", "occupancy-status": "有人状态", "no-motion-duration": "无人时长",
    "contact-state": "门窗状态", "submersion-state": "浸水", "smoke-concentration": "烟雾浓度",
    "gas-concentration": "燃气浓度", "electric-power": "功率", "power-consumption": "耗电量",
    "electric-current": "电流", "voltage": "电压", "fault": "故障", "status": "状态",
    "physical-controls-locked": "童锁", "alarm": "提示音", "volume": "音量", "mute": "静音",
    "target-position": "目标位置", "current-position": "当前位置", "motor-control": "电机控制",
    "filter-life-level": "滤芯剩余", "filter-used-time": "滤芯已用", "horizontal-swing": "左右摆风",
    "vertical-swing": "上下摆风", "heat-level": "档位", "water-level": "水位", "dry": "干燥",
    "eco": "节能", "sleep-mode": "睡眠模式", "countdown-time": "倒计时", "speed-level": "转速",
    "atmospheric-pressure": "气压", "uv-index": "紫外线指数", "left-time": "剩余时间",
    "door-state": "门状态", "playing-state": "播放状态", "input-control": "信号源",
    "night-shot": "夜视", "image-rollover": "画面翻转", "time-watermark": "时间水印",
    "wdr-mode": "宽动态", "glimmer-full-color": "微光全彩", "recording-mode": "录制模式",
    "motion-tracking": "移动追踪", "motion-detection": "移动侦测", "detection-sensitivity": "灵敏度",
    "alarm-interval": "报警间隔", "ir-mode": "模式", "ir-temperature": "温度",
    "download-speed": "下载速度", "upload-speed": "上传速度", "connected-device-number": "连接设备数",
    # 服务
    "light": "灯", "switch": "开关", "battery": "电池", "environment": "环境",
    "temperature-humidity-sensor": "温湿度", "air-purifier": "空气净化器", "fan": "风扇",
    "curtain": "窗帘", "air-conditioner": "空调", "heater": "取暖器", "humidifier": "加湿器",
    "dehumidifier": "除湿机", "filter": "滤芯", "outlet": "插座", "indicator-light": "指示灯",
    "illumination-sensor": "光照传感器", "motion-sensor": "人体传感器", "magnet-sensor": "门窗传感器",
    "occupancy-sensor": "存在传感器", "camera-control": "摄像机", "memory-card-management": "存储卡",
    "speaker": "扬声器", "microphone": "麦克风", "play-control": "播放控制",
    "ir-aircondition-control": "空调遥控", "screen": "屏幕", "delay": "延时",
    # 动作
    "toggle": "切换开关", "turn-on": "开机", "turn-off": "关机", "play": "播放", "pause": "暂停",
    "next": "下一首", "previous": "上一首", "stop": "停止", "fan-speed-up": "风速 +",
    "fan-speed-down": "风速 −", "temperature-up": "温度 +", "temperature-down": "温度 −",
    "start-wash": "开始洗涤", "stop-washing": "停止洗涤", "ptz-calibrate": "云台校准",
}

# 这些名称即使 spec 有中文翻译也用这里的（更短 / 更自然）
OVERRIDE = {
    "temperature": "温度", "relative-humidity": "湿度", "co2-density": "CO₂", "battery-level": "电量",
    "filter-life-level": "滤芯剩余", "air-quality": "空气质量", "electric-power": "功率",
    "press-home": "主页", "press-menu": "菜单", "press-back": "返回", "press-ok": "确定",
    "press-left": "◀ 左", "press-right": "右 ▶", "press-up": "▲ 上", "press-down": "▼ 下",
    "press-volume-down": "音量 −", "press-volume-up": "音量 +", "press-play-pause": "播放/暂停",
}

# 枚举值的英文 → 中文
VALUE_ZH = {
    "idle": "空闲", "busy": "忙碌", "delay": "延迟", "low": "低", "middle": "中", "medium": "中",
    "high": "高", "auto": "自动", "on": "开", "off": "关", "open": "打开", "close": "关闭",
    "closed": "关闭", "charging": "充电中", "not charging": "未充电", "abnormal": "异常",
    "normal": "正常", "locked": "已上锁", "unlocked": "已开锁", "no faults": "无故障",
    "no fault": "无故障", "nofault": "无故障", "faults": "有故障", "fault": "故障", "yes": "是",
    "no": "否", "empty": "空", "indoor": "门内", "outdoor": "门外", "ready": "就绪",
    "in progress": "进行中", "finished": "已完成", "none": "无", "clean": "需清洗",
    "playing": "播放中", "paused": "已暂停", "stopped": "已停止", "single cycle": "单曲循环",
    "cool": "制冷", "dry": "除湿", "heat": "制热", "fan": "送风", "sleep": "睡眠",
    "manual": "手动", "favorite": "最爱", "night": "夜间", "reading": "阅读", "computer": "电脑",
    "night reading": "夜读", "anti-blue": "护眼", "effective work": "高效工作", "candle": "烛光",
    "twinkle": "闪烁", "not recording": "不录制", "all record": "始终录制",
    "motion record": "移动时录制", "two-way": "双向", "one-way": "单向", "strong": "强",
    "weak": "弱", "level1": "一档", "level2": "二档", "level3": "三档", "level4": "四档",
    "increase": "增加", "decrease": "减少", "not push": "不推送", "only pass": "仅经过",
    "only stay": "仅逗留", "brightest": "最亮", "glimmer": "微光", "led_closed": "关闭",
    "lacksalt": "缺盐", "opendoortimeout": "门未关超时", "both": "两者", "smart": "智能",
    "basic": "标准", "intensive": "强力", "quick wash": "快速洗", "energy saving": "节能",
    "self clean": "自清洁", "mode-change": "模式切换", "water-out": "出水",
    "pirmode": "感应出水", "intermittentmode": "间歇出水", "alltimemode": "常出水",
    "idle hang up": "空闲", "calling": "通话中", "single": "单口", "banlance": "均衡",
    "balance": "均衡", "english": "英文", "chinese": "中文",
}

UNITS = {
    "celsius": "°C", "fahrenheit": "°F", "percentage": "%", "lux": "lx", "ppm": "ppm",
    "μg/m3": "μg/m³", "mg/m3": "mg/m³", "kWh": "kWh", "watt": "W", "W": "W", "V": "V", "A": "A",
    "seconds": "秒", "minutes": "分钟", "hours": "小时", "days": "天", "kelvin": "K", "pascal": "Pa",
    "kpa": "kPa", "mA": "mA", "metre": "m", "rgb": "",
}
# spec 里没写单位时按属性类型补上
DEFAULT_UNITS = {
    "pm2.5-density": "μg/m³", "pm10-density": "μg/m³", "co2-density": "ppm",
    "relative-humidity": "%", "battery-level": "%", "illumination": "lx", "electric-power": "W",
}

# 作为「传感器读数」在卡片上突出显示的属性，按优先级排序
SENSOR_KEYS = [
    "temperature", "relative-humidity", "pm2.5-density", "co2-density", "illumination",
    "hcho-density", "tvoc-density", "pm10-density", "air-quality", "electric-power",
    "motion-state", "occupancy-status", "contact-state", "submersion-state",
    "no-motion-duration", "smoke-concentration", "gas-concentration", "atmospheric-pressure",
    "battery-level", "filter-life-level",
]
# 只有这些服务里的温湿度才算「环境」读数（排除插座内部温度、笔记本 CPU 温度之类）
ENV_SERVICES = {
    "temperature-humidity-sensor", "environment", "air-monitor", "illumination-sensor",
    "air-quality-monitor", "co2-sensor", "pm2-5-sensor", "pressure-sensor",
}
ENV_ONLY_KEYS = {"temperature", "relative-humidity", "illumination", "atmospheric-pressure"}
# 可画历史曲线的数值型属性
TREND_KEYS = {
    "temperature", "relative-humidity", "pm2.5-density", "co2-density", "illumination",
    "hcho-density", "tvoc-density", "pm10-density", "electric-power", "atmospheric-pressure",
}
# 卡片上的次要状态（亮度、模式之类）
STATUS_KEYS = ["status", "mode", "brightness", "fan-level", "target-temperature", "target-humidity",
               "left-time", "current-position", "playing-state", "door-state", "water-level",
               "connected-device-number"]
CONTROL_SERVICES = {
    "light", "switch", "outlet", "fan", "air-purifier", "air-conditioner", "heater",
    "humidifier", "dehumidifier", "curtain", "airer", "television", "air-fresh",
    "kettle", "cooker", "washer", "vacuum", "ptc-bath-heater", "light-bath-heater", "dishwasher",
    "camera-control",
}

# ---- 简洁模式过滤规则 ----
HIDE_SERVICES = re.compile(
    r"^(p2p-stream|camera-ipc-cloud|message-router|historycal-sync|history.*|time-management|"
    r"self-check|family-guard|nas|aqi|ble-control|push.*|relay-event|device-display-unit|"
    r"extra-device-information|key-call|camera-fav-area|virtual-fence|other-functions|imilab-timer|"
    r"cruise|functions-enable|ai-scene|ai-detection|custom-service|.*-costom|.*-custom|dm-service|"
    r"madv-doorbell|guest-wifi|wifi|router-.*|microphone|intelligent-speaker|clock|remote-control|"
    r"speaker-mode|no-disturb)$")
HIDE_PROPS = re.compile(
    r"(current-time|event-|timestamp|-id$|^id$|identity|index|total-count|record-data|debug|"
    r"heartbeat|sync|offset|gop-value|codec|smp-rate|bit-width|audio-channel|talk-mode|resolution|"
    r"protocol|port-.*info|password|ssid|ip-address|subnet|dns|access-mode|encrypted|signal-strength|"
    r"wifi-|network-connection|storage-|fav-area|fence|clock-key|platform-id|moto-speed|aqi-|"
    r"set-filter|seek|test-spec|eco-code|count-down|countdown|switch-toggle|over-power|hand-gesture|"
    r"pets-type|check|dialog-ejected|connect-device-ids|device-inactive|state-playing|^request$|"
    r"^response$|working-time|surge-power|online-time|rssi|saturability|^flow$|filter-used-time|"
    r"used-time|all-work-time|wash-time|^stroke$|stains|appoint-time|book-|-remind|open-door-time|"
    r"preservation|warm-mode|dry-mode|duration|time-period|auto-screen-(start|over)|"
    r"dry-remain|clean-left|remaining-recording|feeding-type|max-schcdule|schedule|add-meal|"
    r"food-out-progress|plan-process|set-screen-display|food-intake|startuptimes|threeday|syswork|"
    r"^pir$|videonum|fourbat|^connected$|pwrdate|mcu-|battypedate|settingsync|ringer|motionpush|"
    r"vistpush|autoreply|fw-autoupgrade|videodelay|videolength|cloud-video|long-broadcast|"
    r"collection-interval|temperature-display-unit|hour-system|is-on|enable-time|ir-.*-up|"
    r"favorite-square|water-softener-level|operation-|lock-action|abnormal-condition)")
HIDE_ACTIONS = re.compile(
    r"(format|pop-up|reset|calibrat|p2p|stop-stream|upload-video|check|sync|trigger|^post$|"
    r"set-customize|^toggle|loop-|wake-up|play-radio|play-music|^seek$|-setting|-set$|-upd$|"
    r"turn-mode|stop-alarm|press-settings|press-play$|press-pause|play-pause-video)")
# 名称里允许出现的英文缩写
ABBR = re.compile(r"PM2\.5|PM10|TVOC|CO2|CO₂|ECO|HDR|WiFi|Wi-Fi|NFC|USB|IP|DNS|AI|UV|LED|APP|SD|MIC|AQI|[A-Z]\d")


def _short(urn: str) -> str:
    return urn.split(":")[3]


def _is_english(s: str) -> bool:
    if re.search(r"[一-鿿]", s):
        return False
    return bool(re.search(r"[A-Za-z]{3,}", ABBR.sub("", s)))


def _clean(name: str) -> str:
    """去掉 spec 名称里夹带的注释：换行后的内容、括号里的说明、'0:xx；1:xx' 这类枚举说明。"""
    name = name.split("\n")[0]
    name = re.sub(r"\s+\d\s*[:：].*$", "", name)
    short = re.sub(r"[（(][^）)]*[）)]", "", name).strip()
    name = (short or name).strip(" ：:，,。")
    if len(name) > 10 and re.search(r"[，,。]", name):
        name = re.split(r"[，,。]", name)[0]
    return name


def _value_label(s: str) -> str:
    return VALUE_ZH.get(s.strip().lower(), s)


class SpecStore:
    def __init__(self, cache_dir: Path):
        self.dir = cache_dir
        self.dir.mkdir(parents=True, exist_ok=True)
        self._mem = {}
        self._lock = threading.Lock()

    def get(self, urn: str) -> dict | None:
        if not urn:
            return None
        with self._lock:
            if urn in self._mem:
                return self._mem[urn]
        f = self.dir / (urn.replace(":", "_") + ".json")
        if f.exists():
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                if data.get("v") == SPEC_VERSION:
                    with self._lock:
                        self._mem[urn] = data
                    return data
            except Exception:
                pass
        try:
            data = self._fetch(urn)
        except Exception:
            return None
        f.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        with self._lock:
            self._mem[urn] = data
        return data

    def _fetch(self, urn: str) -> dict:
        raw = requests.get(SPEC_URL, params={"type": urn}, timeout=15).json()
        try:
            lang = requests.get(LANG_URL, params={"urn": urn}, timeout=10).json()["data"]
            zh = lang.get("zh_cn", {})
        except Exception:
            zh = {}

        def tr(key, short, fallback):
            if short in OVERRIDE:
                return OVERRIDE[short]
            v = zh.get(key)
            if v and not _is_english(v):
                return _clean(v)
            if short in ZH:
                return ZH[short]
            return _clean(fallback)

        services = []
        for svc in raw.get("services", []):
            s_short = _short(svc["type"])
            if s_short == "device-information":
                continue
            siid = svc["iid"]
            skey = f"service:{siid:03d}"
            hide_svc = bool(HIDE_SERVICES.match(s_short))
            props = []
            for p in svc.get("properties", []):
                p_short = _short(p["type"])
                pkey = f"{skey}:property:{p['iid']:03d}"
                fmt = p.get("format", "string")
                vtype = "bool" if fmt == "bool" else "float" if fmt == "float" else \
                    "string" if fmt == "string" else "int"
                access = p.get("access", [])
                raw_desc = p.get("description", p_short)
                vlist = None
                if p.get("value-list"):
                    vlist = []
                    for i, v in enumerate(p["value-list"]):
                        lbl = zh.get(f"{pkey}:valuelist:{i:03d}")
                        if not lbl or _is_english(lbl):
                            lbl = v.get("description", "") or str(v["value"])
                        lbl = _value_label(lbl)
                        vlist.append({"value": v["value"], "label": _clean(lbl) or str(v["value"])})
                unit = p.get("unit")
                unit = UNITS.get(unit, unit) if unit not in (None, "none", "") else DEFAULT_UNITS.get(p_short, "")
                # 像「电功率(单位0.01w)」这种，原始值需要换算
                scale = 1
                m = re.search(r"单位\s*([0-9.]+)\s*([a-zA-Z]+)", raw_desc + zh.get(pkey, ""))
                if m:
                    scale = float(m.group(1))
                    unit = {"w": "W", "kwh": "kWh", "v": "V", "a": "A", "ma": "mA"}.get(m.group(2).lower(), m.group(2))
                name = tr(pkey, p_short, raw_desc)
                rng = p.get("value-range")
                simple = not hide_svc and "read" in access and vtype != "string" \
                    and not HIDE_PROPS.search(p_short) and not _is_english(name) \
                    and not (rng and rng[1] - rng[0] > 100000 and scale == 1)
                if vlist is not None and (len(vlist) < 2 or any(not v["label"].strip() for v in vlist)):
                    simple = False
                # 红外遥控（空调等）只能写不能读，也要保留
                if s_short.startswith("ir-") and "write" in access and vtype != "string":
                    simple = True
                props.append({
                    "siid": siid, "piid": p["iid"], "key": p_short, "name": name,
                    "type": vtype, "unit": unit, "scale": scale,
                    "read": "read" in access, "write": "write" in access,
                    "range": rng, "values": vlist, "simple": simple,
                })
            actions = []
            for a in svc.get("actions", []):
                akey = f"{skey}:action:{a['iid']:03d}"
                a_short = _short(a["type"])
                name = tr(akey, a_short, a.get("description", a_short))
                nargs = len(a.get("in", []))
                actions.append({
                    "siid": siid, "aiid": a["iid"], "key": a_short, "name": name, "nargs": nargs,
                    "simple": (not hide_svc or s_short == "remote-control") and nargs == 0
                    and not HIDE_ACTIONS.search(a_short) and not _is_english(name)
                    and not (s_short == "remote-control" and a_short == "turn-off"),
                })
            services.append({
                "siid": siid, "key": s_short,
                "name": tr(skey, s_short, svc.get("description", s_short)),
                "props": props, "actions": actions,
            })
        return {"v": SPEC_VERSION, "urn": urn, "name": raw.get("description", ""),
                "kind": _short(urn), "services": services}


def summarize(spec: dict) -> dict:
    """挑出卡片需要的属性：主开关、传感器读数、次要状态、可画趋势的环境读数。"""
    if not spec:
        return {"power": None, "sensors": [], "status": [], "controllable": False}
    is_sensor_dev = any(k in spec["kind"] for k in ("sensor", "monitor"))
    svc_of = {}
    allp = []
    for s in spec["services"]:
        for p in s["props"]:
            svc_of[id(p)] = s["key"]
            allp.append(p)

    power = None
    for s in spec["services"]:
        if s["key"] in CONTROL_SERVICES or s["siid"] == 2:
            for p in s["props"]:
                if p["key"] == "on" and p["write"] and p["type"] == "bool":
                    power = p
                    break
        if power:
            break

    def ok_sensor(p):
        if p["key"] in ENV_ONLY_KEYS and not is_sensor_dev and svc_of[id(p)] not in ENV_SERVICES:
            return False
        return p["read"] and p["type"] != "string" and not (p["key"] == "battery-level" and p["type"] == "bool")

    def pick(keys, limit, accept, prefer_siid=None):
        out, seen = [], set()
        ordered = sorted(allp, key=lambda p: p["siid"] != prefer_siid) if prefer_siid else allp
        for k in keys:
            for p in ordered:
                if p["key"] == k and k not in seen and accept(p):
                    out.append(p)
                    seen.add(k)
                    break
            if len(out) >= limit:
                break
        return out

    sensors = pick(SENSOR_KEYS, 4, ok_sensor)
    main_siid = power["siid"] if power else 2
    status = pick(STATUS_KEYS, 2, lambda p: p["read"] and p["simple"] and p["type"] != "bool", main_siid)
    status = [p for p in status if p["siid"] == main_siid] or ([] if power else status[:1])
    controllable = power is not None or any(p["write"] and p["simple"] for p in allp) or \
        any(a["simple"] for s in spec["services"] for a in s["actions"])
    env = [p for p in sensors if p["key"] in TREND_KEYS]
    return {"power": power, "sensors": sensors, "status": status, "controllable": controllable,
            "env": env, "is_sensor": is_sensor_dev or (not power and bool(sensors))}

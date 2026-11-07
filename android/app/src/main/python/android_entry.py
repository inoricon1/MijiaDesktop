"""安卓版的 Python 入口：Kotlin 通过 Chaquopy 调用这里，再转给和桌面版共用的 api.Api。"""
import json
import os
import time

_api = None


def init(data_dir: str, tz: str):
    """数据放在 App 私有目录；时区交给 tzlocal（mijiaAPI 请求头里要用）。"""
    global _api
    os.environ["MIJIA_DATA_DIR"] = data_dir
    os.environ["TZ"] = tz
    if hasattr(time, "tzset"):
        time.tzset()
    from api import Api, log
    log.info("安卓版启动")
    _api = Api()


def call(name: str, args_json: str) -> str:
    fn = getattr(_api, name, None) if not name.startswith("_") else None
    if fn is None or not callable(fn):
        return json.dumps({"ok": False, "error": f"未知接口 {name}"}, ensure_ascii=False)
    return json.dumps(fn(*json.loads(args_json or "[]")), ensure_ascii=False, default=str)

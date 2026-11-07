"""暴露给界面的 API（桌面版 main.py 和安卓版共用，不依赖任何窗口库）。"""
import logging
import time
import traceback
from logging.handlers import RotatingFileHandler

from core import DATA_DIR, Mijia

# 运行日志：数据目录下 app.log（最多 1MB × 2 份），排查「界面上没显示」这类问题用
log = logging.getLogger("mijia")
log.setLevel(logging.INFO)
if not log.handlers:
    _h = RotatingFileHandler(DATA_DIR / "app.log", maxBytes=1_000_000, backupCount=1, encoding="utf-8")
    _h.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    log.addHandler(_h)


def safe(fn):
    """前端调用统一返回 {ok, data|error}，异常不会把窗口搞崩。"""
    def wrapper(self, *a, **kw):
        t = time.time()
        try:
            data = fn(self, *a, **kw)
            if time.time() - t > 5:
                log.info("%s 用时 %.1fs", fn.__name__, time.time() - t)
            return {"ok": True, "data": data}
        except Exception as e:
            log.error("%s 失败：%s\n%s", fn.__name__, e, traceback.format_exc())
            return {"ok": False, "error": str(e) or e.__class__.__name__}
    wrapper.__name__ = fn.__name__
    return wrapper


class Api:
    def __init__(self):
        self._m = Mijia()

    # 窗口相关的钩子，桌面版覆盖，安卓版什么都不做
    def _on_top_changed(self, on):
        pass

    def _widget(self, on):
        pass

    @safe
    def status(self):
        return {"logged_in": self._m.is_logged_in()}

    @safe
    def start_login(self):
        return self._m.start_login()

    @safe
    def login_state(self):
        return self._m.login_state

    @safe
    def logout(self):
        self._m.logout()

    @safe
    def load(self):
        d = self._m.load()
        log.info("load：%d 个设备，青萍=%s", len(d["devices"]), d.get("qingping"))
        return d

    @safe
    def log(self, msg):
        """前端的报错和诊断信息也写进日志。"""
        log.info("界面：%s", str(msg)[:2000])

    @safe
    def poll(self):
        return self._m.poll()

    @safe
    def set_qingping(self, key, secret):
        return self._m.set_qingping(key, secret)

    @safe
    def trends(self):
        return self._m.trends()

    @safe
    def detail(self, did):
        return self._m.detail(did)

    @safe
    def history(self, did, siid, piid, hours=24):
        return self._m.history_of(did, siid, piid, hours)

    @safe
    def set_prop(self, did, siid, piid, value):
        return self._m.set_prop(did, siid, piid, value)

    @safe
    def action(self, did, siid, aiid, args=None):
        return self._m.action(did, siid, aiid, args)

    @safe
    def run_scene(self, scene_id, home_id):
        return self._m.run_scene(scene_id, home_id)

    @safe
    def save_settings(self, patch):
        s = self._m.save_settings(patch)
        if "on_top" in (patch or {}):
            self._on_top_changed(bool(patch["on_top"]))
        return s

    @safe
    def widget_mode(self, on):
        """小组件模式：缩成一个小窗并置顶，只显示收藏的设备。"""
        self._widget(on)

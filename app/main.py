"""米家桌面版入口：pywebview 窗口 + 暴露给前端的 JS API。"""
import sys
import traceback
from pathlib import Path

import webview

from core import Mijia

HERE = Path(getattr(sys, "_MEIPASS", Path(__file__).parent))


def safe(fn):
    """前端调用统一返回 {ok, data|error}，异常不会把窗口搞崩。"""
    def wrapper(self, *a, **kw):
        try:
            return {"ok": True, "data": fn(self, *a, **kw)}
        except Exception as e:
            traceback.print_exc()
            return {"ok": False, "error": str(e) or e.__class__.__name__}
    wrapper.__name__ = fn.__name__
    return wrapper


class Api:
    def __init__(self):
        self._m = Mijia()
        self._win = None
        self._normal_size = (1280, 820)

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
        return self._m.load()

    @safe
    def poll(self):
        return self._m.poll()

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
        if "on_top" in (patch or {}) and self._win:
            self._win.on_top = bool(patch["on_top"])
        return s

    @safe
    def widget_mode(self, on):
        """小组件模式：缩成一个小窗并置顶，只显示收藏的设备。"""
        if not self._win:
            return
        if on:
            self._normal_size = (self._win.width, self._win.height)
            self._win.resize(380, 640)
            self._win.on_top = True
        else:
            self._win.resize(*self._normal_size)
            self._win.on_top = bool(self._m.settings.get("on_top"))


def main():
    api = Api()
    win = webview.create_window(
        "米家桌面版", str(HERE / "web" / "index.html"), js_api=api,
        width=1280, height=820, min_size=(360, 480),
        background_color="#F4F5F7", on_top=bool(api._m.settings.get("on_top")),
    )
    api._win = win
    webview.start(debug="--debug" in sys.argv, private_mode=False)


if __name__ == "__main__":
    main()

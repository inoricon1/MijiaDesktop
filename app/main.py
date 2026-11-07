"""米家桌面版入口：pywebview 窗口。界面调用的 API 在 api.py（和安卓版共用）。"""
import sys
from pathlib import Path

import webview

from api import Api, log

HERE = Path(getattr(sys, "_MEIPASS", Path(__file__).parent))


class DesktopApi(Api):
    def __init__(self):
        super().__init__()
        self._win = None
        self._normal_size = (1280, 820)

    def _on_top_changed(self, on):
        if self._win:
            self._win.on_top = on

    def _widget(self, on):
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
    log.info("启动")
    api = DesktopApi()
    win = webview.create_window(
        "米家桌面版", str(HERE / "web" / "index.html"), js_api=api,
        width=1280, height=820, min_size=(360, 480),
        background_color="#F4F5F7", on_top=bool(api._m.settings.get("on_top")),
    )
    api._win = win
    # 不用持久化的浏览器缓存：pywebview 固定用 127.0.0.1:42001 提供页面，持久缓存会让更新后的 app.js 不生效
    webview.start(debug="--debug" in sys.argv, private_mode=True)


if __name__ == "__main__":
    main()

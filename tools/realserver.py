"""用真实后端（只读）驱动前端，控制类调用一律假装成功，不会改动真实设备。"""
import json, sys, traceback
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

APP = Path(sys.argv[1])
sys.path.insert(0, str(APP))
from core import Mijia  # noqa

m = Mijia()
READ = {
    "status": lambda: {"logged_in": m.is_logged_in()}, "load": m.load, "poll": m.poll, "trends": m.trends,
    "detail": m.detail, "history": m.history_of,
}
SETTINGS = {}


def api(name, args):
    if name in READ:
        return READ[name](*args)
    if name == "save_settings":
        SETTINGS.update(args[0] or {})
        return {**m.settings, **SETTINGS}
    return {"code": 0, "message": "dry-run"}  # set_prop / action / run_scene / widget_mode 等：不执行


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw): super().__init__(*a, directory=str(APP / "web"), **kw)
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        try: res = {"ok": True, "data": api(self.path.strip("/"), body)}
        except Exception as e: traceback.print_exc(); res = {"ok": False, "error": repr(e)}
        b = json.dumps(res, ensure_ascii=False).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        if self.path.startswith("/dev"):
            html = (APP / "web" / "index.html").read_text(encoding="utf-8").replace(
                '<script src="app.js">', '<script>window.MOCK=new Proxy({},{get:(_,n)=>(...a)=>fetch("/"+n,{method:"POST",body:JSON.stringify(a)}).then(r=>r.json())})</script><script src="app.js">')
            b = html.encode(); self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8"); self.end_headers(); self.wfile.write(b); return
        super().do_GET()
    def log_message(self, *a): pass


ThreadingHTTPServer(("127.0.0.1", 8766), H).serve_forever()

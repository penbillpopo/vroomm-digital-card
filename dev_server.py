from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent


class CardHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        requested = (ROOT / self.path.lstrip("/").split("?", 1)[0]).resolve()
        try:
            requested.relative_to(ROOT)
        except ValueError:
            self.send_error(404)
            return

        if self.path.split("?", 1)[0].rstrip("/") not in ("", "/") and not requested.exists():
            self.path = "/index.html"
        super().do_GET()


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8000), CardHandler).serve_forever()

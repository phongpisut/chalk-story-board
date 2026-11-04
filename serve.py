# Static server for public/ that makes the browser revalidate every file (no stale app.js after edits).
import functools, http.server, pathlib, sys

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 5186
root = pathlib.Path(__file__).parent / 'public'
http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Handler, directory=str(root))).serve_forever()

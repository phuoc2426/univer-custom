"""
Simple file server for Univer Embed with Tags.

Serves static files + handles PUT/POST writes to the data/ directory.
No dependencies required — uses Python's built-in http.server.

Usage:
    python server.py
    python server.py --port 8080
    python server.py --port 8080 --host 0.0.0.0

Then open http://localhost:8080 in your browser.
"""

import http.server
import json
import os
import sys
import urllib.parse

# ── Config ──────────────────────────────────────────────
HOST = "127.0.0.1"
PORT = 8080
DATA_DIR = "data"  # writable directory for JSON persistence
# ────────────────────────────────────────────────────────

ROOT = os.path.dirname(os.path.abspath(__file__))


class UniverFileServer(http.server.SimpleHTTPRequestHandler):
    """
    GET  — serves any file under project root (static)
    PUT  — writes request body to a file inside data/ only
    POST — same as PUT (for compatibility)
    DELETE — deletes a file inside data/ only
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    # ── CORS headers (allow browser fetch from same origin) ──

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    # ── Write handlers ──

    def do_GET(self):
        # Health endpoint for launchers / UI probes
        path = urllib.parse.urlparse(self.path).path
        if path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "ok": True,
                "message": "Server is running",
                "dataDir": DATA_DIR,
            }).encode("utf-8"))
            return

        super().do_GET()

    def do_PUT(self):
        self._handle_write()

    def do_POST(self):
        self._handle_write()

    def do_DELETE(self):
        self._handle_delete()

    # ── Internal: write file ──

    def _resolve_data_path(self):
        """
        Resolve the request path to an absolute path.
        Returns (abs_path, rel_to_data) or sends error and returns (None, None).
        """
        # Parse the URL path (strip query string)
        url_path = urllib.parse.urlparse(self.path).path
        # Remove leading slash, decode %XX
        rel = urllib.parse.unquote(url_path).lstrip("/")
        abs_path = os.path.normpath(os.path.join(ROOT, rel))
        data_root = os.path.normpath(os.path.join(ROOT, DATA_DIR))

        # Security: only allow writes inside data/
        if not abs_path.startswith(data_root + os.sep) and abs_path != data_root:
            self.send_response(403)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Writes are only allowed inside the data/ directory.",
                "requested": rel,
            }).encode("utf-8"))
            return None, None

        return abs_path, rel

    def _handle_write(self):
        abs_path, rel = self._resolve_data_path()
        if abs_path is None:
            return

        # Read request body
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else b""

        # Ensure parent directory exists
        parent = os.path.dirname(abs_path)
        os.makedirs(parent, exist_ok=True)

        # Atomic write: write to .tmp then rename
        tmp_path = abs_path + ".tmp"
        try:
            with open(tmp_path, "wb") as f:
                f.write(body)
            os.replace(tmp_path, abs_path)
        except Exception as e:
            # Clean up tmp on failure
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": str(e),
            }).encode("utf-8"))
            return

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({
            "ok": True,
            "path": rel,
            "size": len(body),
        }).encode("utf-8"))

        self.log_message("WRITE %s (%d bytes)", rel, len(body))

    def _handle_delete(self):
        abs_path, rel = self._resolve_data_path()
        if abs_path is None:
            return

        if not os.path.exists(abs_path):
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "File not found"}).encode("utf-8"))
            return

        try:
            os.remove(abs_path)
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"ok": True, "deleted": rel}).encode("utf-8"))

        self.log_message("DELETE %s", rel)

    # ── Logging ──

    def log_message(self, fmt, *args):
        sys.stderr.write("[server] %s - %s\n" % (self.address_string(), fmt % args))


def main():
    host = HOST
    port = PORT

    # Simple CLI args: --port NNNN --host X.X.X.X
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--port" and i + 1 < len(args):
            port = int(args[i + 1])
            i += 2
        elif args[i] == "--host" and i + 1 < len(args):
            host = args[i + 1]
            i += 2
        else:
            i += 1

    # Ensure data directory exists
    data_path = os.path.join(ROOT, DATA_DIR)
    os.makedirs(data_path, exist_ok=True)
    os.makedirs(os.path.join(data_path, "templates_store"), exist_ok=True)

    server = http.server.HTTPServer((host, port), UniverFileServer)
    print(f"──────────────────────────────────────────")
    print(f"  Univer File Server")
    print(f"  http://{host}:{port}")
    print(f"  Data directory: {data_path}")
    print(f"  Press Ctrl+C to stop")
    print(f"──────────────────────────────────────────")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        server.server_close()


if __name__ == "__main__":
    main()

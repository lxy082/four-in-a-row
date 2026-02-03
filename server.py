import http.server
import os
import socketserver

PORT = 8000
ROOT = os.path.join(os.path.dirname(__file__), "dist")

os.chdir(ROOT)

handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("", PORT), handler) as httpd:
    print(f"Serving {ROOT} at http://localhost:{PORT}")
    httpd.serve_forever()

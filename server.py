import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "3000"))
MAX_RESPONSE_BYTES = 5 * 1024 * 1024


def is_allowed_local_origin(origin):
    if origin == "null":
        return True
    try:
        parsed = urlsplit(origin)
    except ValueError:
        return False
    return parsed.scheme == "http" and (parsed.hostname or "").lower() in {
        "localhost",
        "127.0.0.1",
        "::1",
    }


def is_allowed_article_url(value):
    parsed = urlsplit(value)
    hostname = (parsed.hostname or "").lower()
    return parsed.scheme == "https" and (
        hostname == "dantri.com.vn" or hostname.endswith(".dantri.com.vn")
    )


def detect_category(url):
    """
    Tự động phân loại chuyên mục dựa trên từ khóa xuất hiện trong URL
    """
    url_lower = (url or "").lower()
    
    category_map = {
        "/the-thao": "Thể thao",
        "/kinh-doanh": "Kinh doanh",
        "/thoi-su": "Thời sự",
        "/the-gioi": "Thế giới",
        "/phap-luat": "Pháp luật",
        "/suc-khoe": "Sức khỏe",
        "/doi-song": "Đời sống",
        "/du-lich": "Du lịch",
        "/bat-dong-san": "Bất động sản",
        "/giai-tri": "Giải trí",
        "/giao-duc": "Giáo dục",
        "/cong-nghe": "Công nghệ"
    }
    
    for path, cat_name in category_map.items():
        if path in url_lower:
            return [cat_name]
            
    return ["Thời sự"]


class AllowedRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        if not is_allowed_article_url(new_url):
            raise HTTPError(
                new_url, code, "Redirect destination is not allowed", headers, response
            )
        return super().redirect_request(
            request, response, code, message, headers, new_url
        )


class NewsHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        origin = self.headers.get("Origin")
        if origin and is_allowed_local_origin(origin):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        if urlsplit(self.path).path != "/api/fetch-article":
            self.send_error(404)
            return
        self.send_response(204)
        origin = self.headers.get("Origin")
        if origin and is_allowed_local_origin(origin):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Vary", "Origin")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if urlsplit(self.path).path != "/api/fetch-article":
            return super().do_GET()

        article_url = parse_qs(urlsplit(self.path).query).get("url", [""])[0]
        if not is_allowed_article_url(article_url):
            self.send_json(
                400,
                {"error": "Chỉ hỗ trợ URL HTTPS thuộc dantri.com.vn."},
            )
            return

        try:
            request = Request(
                article_url,
                headers={
                    "Accept": "text/html,application/xhtml+xml",
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36"
                    ),
                },
            )
            opener = build_opener(AllowedRedirectHandler())
            with opener.open(request, timeout=15) as upstream:
                content_type = upstream.headers.get_content_type()
                if content_type not in ("text/html", "application/xhtml+xml"):
                    self.send_json(502, {"error": "URL không trả về trang HTML."})
                    return

                content = upstream.read(MAX_RESPONSE_BYTES + 1)
                if len(content) > MAX_RESPONSE_BYTES:
                    self.send_json(502, {"error": "Trang nguồn vượt quá giới hạn 5 MB."})
                    return

                encoding = upstream.headers.get_content_charset() or "utf-8"
                html = content.decode(encoding, errors="replace")
                if not html.strip():
                    self.send_json(502, {"error": "Trang nguồn trả về nội dung rỗng."})
                    return

                # Trả về cả HTML và chuyên mục tự động phát hiện được từ URL
                auto_cat = detect_category(article_url)
                self.send_json(200, {"html": html, "autoCategory": auto_cat})
        except Exception as error:
            self.send_json(502, {"error": f"Không tải được bài viết: {error}"})


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), NewsHandler)
    print(f"News Today is running at http://127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nNews Today server stopped.")
        server.server_close()
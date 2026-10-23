# News Today — Bài tập lớn xây dựng website tin tức

## Cấu trúc thư mục

- `index.html`: trang chủ, danh sách chuyên mục và bài viết.
- `detail.html`: trang chi tiết bài viết.
- `crawler.html`: trang thử nghiệm trích xuất bài viết theo URL.
- `css/style.css`: giao diện responsive.
- `js/app.js`: hiển thị menu và danh sách bài viết.
- `js/detail.js`: hiển thị chi tiết bài viết.
- `js/storage.js`: đọc dữ liệu JSON và lưu các bài crawl vào LocalStorage.
- `js/crawler.js`: thử lấy HTML từ URL và chuẩn hóa dữ liệu.
- `server.py`: phục vụ website và tải bài viết qua API cục bộ.
- `data/categories.json`: dữ liệu chuyên mục mẫu.
- `data/posts.json`: dữ liệu bài viết mẫu.

## Cách chạy bằng VS Code

1. Cài Python 3.8 trở lên.
2. Mở thư mục dự án trong VS Code.
3. Mở Terminal tại thư mục dự án và chạy `python server.py`; giữ cửa sổ Terminal này mở khi sử dụng website.
4. Truy cập `http://127.0.0.1:3000/crawler.html`, nhập URL Dân Trí và thử trích xuất. Server Python vừa phục vụ website vừa cung cấp API crawler.

Không mở trang crawler bằng Live Server hoặc `file://` trong quy trình này; nếu chưa chạy `python server.py`, trình duyệt sẽ không kết nối được API.

## Lưu ý quan trọng

- `categories.json` và `posts.json` hiện là dữ liệu mẫu, chưa phải bộ dữ liệu thu thập đầy đủ theo yêu cầu tối thiểu 10 bài/chuyên mục trong đề.
- Crawler dùng API cục bộ để tránh CORS phía trình duyệt. API chỉ chấp nhận HTTPS trên `dantri.com.vn` và các tên miền con; website nguồn vẫn có thể từ chối yêu cầu hoặc giới hạn truy cập.
- Các bài được lưu vào LocalStorage chỉ có trên trình duyệt và thiết bị hiện tại.

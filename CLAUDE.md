# TMS – hướng dẫn cho Claude (đọc trước khi làm tiếp)

Dự án: web app quản lý dự án và công việc cho Phòng Giải pháp CNTT (ngành điện lực). Giao diện và nội dung **tiếng Việt**. Người dùng không chuyên lập trình: giải thích đơn giản, làm xong phải chạy thử.

## Kiến trúc
- Web tĩnh thuần (ES modules, **không build**), thư viện từ CDN: Chart.js, ExcelJS, supabase-js.
- Dữ liệu: Supabase (Postgres + Auth + Realtime). Schema và phân quyền (RLS) ở `supabase/schema.sql`.
- Đăng nhập bằng *tên tài khoản* → ánh xạ thành email giả `<tên>@tms.vn` (xem `js/config.js`, `js/data.js`). Tài khoản đầu tiên tự thành Trưởng phòng.
- `js/data.js` có 2 adapter cùng giao diện: Supabase và DEMO (localStorage, khi `config.js` trống). Thêm tính năng dữ liệu thì sửa **cả hai** adapter và `schema.sql`.
- Phân quyền phải cưỡng chế ở RLS, giao diện chỉ ẩn nút cho tiện.
- Giao diện: mọi giá trị qua biến CSS (xem `DESIGN.md`). Không hard-code màu trong JS (trừ mẫu báo cáo in).

## Chạy thử
`python -m http.server 8765` trong thư mục này, mở `http://localhost:8765`. Chế độ DEMO: `truongphong/123456`, `nv1/123456`.

## Việc đang chờ
- **Chuyển dữ liệu từ hệ thống cũ** ("Phòng PGCNTT_Quản lý công việc", Google Apps Script + Google Sheet có các trang *Danh sách dự án*, *Danh sách công việc*, *Danh sách nhân viên*) sang TMS. Chờ người dùng gửi file Sheet gốc tải về dạng .xlsx. Kế hoạch: thêm chức năng "Nhập dự án và công việc từ Excel" (xem trước, báo lỗi, bỏ qua mã trùng), ghép Người phụ trách theo tên nhân viên đã nhập từ `DS TK.xlsx`, chạy thử DEMO rồi mới nhập thật. Không xin hay nhập mật khẩu của hệ thống cũ.
- Bản cập nhật Nhập người dùng từ Excel: cần chạy `supabase/migrations/002_profiles_email.sql` rồi tải code mới lên GitHub (nếu người dùng chưa làm).
- Không đưa file .xlsx chứa dữ liệu thật vào thư mục này (kho GitHub là Public).

## Việc còn có thể làm tiếp
- Nhắc việc qua email/Zalo khi sắp đến hạn (cần Supabase Edge Function + dịch vụ gửi tin).
- Nhập dữ liệu từ Excel; đính kèm file cho công việc; lịch sử thay đổi; biểu đồ Gantt.
- Cho nhân viên được phép tạo dự án (sửa policy `projects_write` trong schema.sql).
- Đã nối Supabase thật (dự án GPCNTT-TMS, vùng Tokyo, `js/config.js` đã điền URL và khóa Publishable). Đã kiểm tra kết nối và màn hình tạo Trưởng phòng đầu tiên; còn cần chạy thử thật: tạo Trưởng phòng, thêm nhân viên, đổi mật khẩu, phân quyền.

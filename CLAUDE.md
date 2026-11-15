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

## Quy trình cập nhật lên mạng (người dùng đã yêu cầu)
Người dùng KHÔNG kéo thả file lên GitHub. Mỗi lần cập nhật, Claude làm:
1. Sửa code trong `D:\TMS`, chạy thử (DEMO: thêm `?demo=1` sau link).
2. Tạo nhánh mới, commit, đẩy lên GitHub, tạo **PR có số** (`gh pr create`), rồi gửi người dùng link `https://github.com/hoaihoahong/tms/pull/<số>`. Người dùng chỉ bấm **Merge pull request** → **Confirm merge**; GitHub Pages tự cập nhật sau 1 đến 2 phút.
3. Gọi `gh` bằng `C:\Program Files\GitHub CLI\gh.exe`; đẩy bằng `git -c credential.helper= -c "credential.helper=!'C:/Program Files/GitHub CLI/gh.exe' auth git-credential" push`. Khóa đăng nhập là khóa fine-grained riêng cho kho `tms` (hết hạn 13/02/2027); hết hạn thì hướng dẫn người dùng tạo khóa mới và dán vào Terminal (không dán vào chat).
4. Không commit file Excel/dữ liệu cá nhân (kho là Public; `.gitignore` đã chặn). Khi có file SQL mới trong `supabase/migrations/`, nhắc người dùng chạy SQL trên Supabase trước khi merge.
5. Commit mới nhất nhắc: nhánh `cap-nhat/<chủ-đề>`, tiêu đề PR dạng "Cập nhật N: ...".

## Việc đang chờ
- **Chuyển dữ liệu từ hệ thống cũ** ("Phòng PGCNTT_Quản lý công việc", Google Sheet "Quản lý công việc DVPM"): 59 dự án (trang Milestones), 90 công việc, 14 nhân viên, 68 gợi ý đầu việc. Công cụ `tools/chuyen_du_lieu_he_thong_cu.py` + chức năng Nhập Excel (Người dùng, Dự án, Công việc) đã làm; còn thiếu file nguồn gốc (người dùng gửi lại), chạy công cụ, nhập theo thứ tự Người dùng → Dự án → Công việc và đối chiếu số lượng. Tài khoản Trưởng phòng trong TMS: `lytt`. Người dùng đã nhập nhầm 21 tài khoản từ `DS TK.xlsx` và muốn xóa nạp lại (SQL xóa nằm trong README). Không đọc/nhập cột mật khẩu của hệ thống cũ (đang lưu chữ thường trong Sheet cũ: nhắc người dùng xóa cột đó).
- Bản cập nhật Nhập người dùng từ Excel: cần chạy `supabase/migrations/002_profiles_email.sql` rồi tải code mới lên GitHub (nếu người dùng chưa làm).
- Không đưa file .xlsx chứa dữ liệu thật vào thư mục này (kho GitHub là Public).

## Việc còn có thể làm tiếp
- Nhắc việc qua email/Zalo khi sắp đến hạn (cần Supabase Edge Function + dịch vụ gửi tin).
- Nhập dữ liệu từ Excel; đính kèm file cho công việc; lịch sử thay đổi; biểu đồ Gantt.
- Cho nhân viên được phép tạo dự án (sửa policy `projects_write` trong schema.sql).
- Đã nối Supabase thật (dự án GPCNTT-TMS, vùng Tokyo, `js/config.js` đã điền URL và khóa Publishable). Đã kiểm tra kết nối và màn hình tạo Trưởng phòng đầu tiên; còn cần chạy thử thật: tạo Trưởng phòng, thêm nhân viên, đổi mật khẩu, phân quyền.

# TMS – Hệ thống quản lý công việc (Phòng Giải pháp CNTT)

Web app tiếng Việt quản lý **Dự án** và **Công việc (task)**: đăng nhập tên tài khoản + mật khẩu, phân quyền Trưởng phòng / Nhân viên, dữ liệu lưu trên mạng, dùng được trên máy tính, laptop, điện thoại. Xuất **Excel / Word / In** theo mẫu có tên phòng và chữ ký.

## Thành phần

| Thành phần | Vai trò | Chi phí |
|---|---|---|
| `index.html`, `css/`, `js/` | Giao diện web (không cần cài đặt, không cần build) | Miễn phí |
| **Supabase** | Cơ sở dữ liệu + đăng nhập + cập nhật tức thời | Gói Free đủ cho 1 phòng |
| **GitHub Pages / Netlify / Cloudflare Pages** | Đưa trang web lên mạng thành 1 đường link | Miễn phí |

## Xem thử ngay (chế độ DEMO)

Mở thư mục này bằng một máy chủ web tĩnh (vd: `python -m http.server 8765` rồi vào `http://localhost:8765`).
Khi `js/config.js` để trống, app chạy chế độ DEMO, dữ liệu mẫu lưu trong trình duyệt.
Tài khoản thử: `truongphong / 123456` (Trưởng phòng), `nv1 / 123456` (Nhân viên).

## Đưa vào dùng thật (làm 1 lần)

### Bước 1 – Tạo cơ sở dữ liệu Supabase
1. Vào https://supabase.com, đăng ký, **New project** (đặt mật khẩu database, chọn khu vực gần nhất như Singapore).
2. Menu **Authentication → Sign In / Providers → Email**: **tắt "Confirm email"** (vì tên đăng nhập là tên tài khoản, không phải email thật).
3. Menu **SQL Editor → New query**: dán toàn bộ file `supabase/schema.sql` → **Run**.
4. Menu **Project Settings → API**: copy **Project URL** và khóa **anon public**.

### Bước 2 – Nối app với Supabase
Mở `js/config.js`, điền `SUPABASE_URL` và `SUPABASE_ANON_KEY`. (Khóa anon là khóa công khai, được phép để trong code. **Tuyệt đối không dán khóa `service_role`.**)

### Bước 3 – Đưa lên mạng
Chọn một cách:
- **GitHub Pages**: tạo kho mới trên GitHub → tải cả thư mục lên → Settings → Pages → Branch `main` / root. Link dạng `https://<tên>.github.io/<kho>/`.
- **Netlify / Cloudflare Pages**: kéo thả cả thư mục này lên trang của họ.

### Bước 4 – Tài khoản đầu tiên
Mở link lần đầu, app hiện màn hình **"Tạo tài khoản Trưởng phòng"**. Người tạo đầu tiên là Trưởng phòng. Sau đó vào **Quản trị → Người dùng** để thêm nhân viên, cấp mật khẩu.

## Phân quyền

| Việc | Trưởng phòng | Nhân viên |
|---|---|---|
| Xem mọi dự án, công việc, báo cáo | ✔ | ✔ |
| Thêm / sửa / xóa dự án | ✔ | ✘ |
| Thêm công việc | ✔ | ✔ |
| Sửa công việc | Tất cả | Việc mình tạo hoặc được giao |
| Xóa công việc | Tất cả | Việc mình tạo |
| Quản lý người dùng, đặt lại mật khẩu, thông tin phòng | ✔ | ✘ |

Phân quyền được cưỡng chế ở **cơ sở dữ liệu** (Row Level Security trong `schema.sql`), không chỉ ẩn nút trên giao diện.

## Cấu trúc thư mục

```
index.html            Trang duy nhất (tải thư viện biểu đồ, Excel, Supabase từ CDN)
css/styles.css        Toàn bộ hệ thiết kế (xem DESIGN.md)
js/config.js          Cấu hình kết nối Supabase
js/data.js            Lớp dữ liệu: chế độ Supabase và chế độ DEMO
js/app.js             Màn hình: đăng nhập, tổng quan, dự án, công việc, báo cáo, quản trị
js/table.js           Bảng: sắp xếp, kéo giãn cột, kéo đổi vị trí cột
js/export.js          Xuất IN / Word / Excel
js/ui.js              Hộp thoại, thông báo, biểu tượng, tiện ích
supabase/schema.sql   Bảng dữ liệu, phân quyền, hàm quản trị
```

## Lưu ý vận hành
- **Sao lưu**: Supabase Free không tự sao lưu lâu dài. Định kỳ vào Table Editor → xuất CSV, hoặc dùng nút Excel trong app.
- **Gói Free** của Supabase tự tạm dừng nếu 7 ngày không ai truy cập; vào dashboard bấm Restore là chạy lại.
- GitHub Pages gói miễn phí cần kho **Public**. Điều này an toàn vì dữ liệu được bảo vệ bằng đăng nhập và phân quyền trong Supabase (khóa Publishable vốn là khóa công khai); chỉ có mã nguồn là ai cũng xem được. **Không bao giờ** đưa mật khẩu database, khóa `secret` hay `service_role` vào kho. Muốn kín mã nguồn thì dùng Netlify/Cloudflare Pages.

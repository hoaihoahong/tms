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

## Nhập người dùng hàng loạt từ Excel (Quản trị → Người dùng)

1. Bấm **Tải file mẫu** để lấy file đúng định dạng, hoặc dùng file có 3 cột đầu: **Tên tài khoản | Họ tên | Email** (dòng 1 là tiêu đề).
2. Bấm **Nhập từ Excel**, chọn file. App hiện màn hình xem trước, đánh dấu dòng hợp lệ và dòng lỗi.
3. Nhập **Mật khẩu mặc định** (lần đầu gõ một lần, các lần sau tự điền; lưu kín trong Supabase, chỉ Trưởng phòng xem được) rồi bấm **Nhập N tài khoản**.

Quy tắc: tên tài khoản tự bỏ dấu và bỏ khoảng trắng (Việt → viet); để trống Họ tên thì lấy theo Tên tài khoản; tài khoản đã có hoặc trùng trong file sẽ bị bỏ qua; quyền mặc định là Nhân viên. Supabase giới hạn khoảng 30 lần đăng ký mỗi 5 phút nên file lớn có thể phải nhập làm hai lần.

**Không đưa file danh sách nhân viên (.xlsx) vào kho GitHub** – chứa email thật, và kho là Public (đã có `.gitignore` chặn khi dùng Git).

## Nhập Dự án và Công việc từ Excel (Trưởng phòng)

- Trang **Dự án** → **Nhập từ Excel** (có nút **File mẫu**): cột *Mã dự án, Tên dự án, Loại dự án, Tên gói thầu, Khách hàng, Bộ phận giao việc, Mức độ quan tâm, Phụ trách KT, Phụ trách PDKD, Quản lý tổng thể, Ngày bắt đầu, Ngày Deadline, Trạng thái*. Dòng trùng mã dự án bị bỏ qua.
- Trang **Công việc** → **Nhập từ Excel**: cột *Mã dự án, Tên công việc, Ngày bắt đầu, Hạn hoàn thành, Người phụ trách, Mức ưu tiên, Trạng thái, Ghi chú, Người tạo, Ngày hoàn thành thực tế*. Người phụ trách và Người tạo ghi tên tài khoản hoặc họ tên. Trang tùy chọn **Gợi ý đầu việc** sẽ thành danh sách gợi ý khi gõ Tên công việc.
- **Thứ tự nhập:** Người dùng → Dự án → Công việc. Mọi lần nhập đều có màn hình xem trước, báo dòng lỗi và cảnh báo.
- `tools/chuyen_du_lieu_he_thong_cu.py`: chuyển file Google Sheet của hệ thống cũ (Milestones, Danh sách công việc, Danh sách nhân viên) thành một file Excel đúng định dạng trên. Mã dự án được tự sinh (DA-001…). File xuất ra chứa dữ liệu thật, **không đưa vào kho GitHub**.

**Xóa toàn bộ tài khoản nhân viên để nạp lại** (chỉ giữ tài khoản Trưởng phòng `lytt`): trong Supabase → SQL Editor, chạy
`delete from auth.users where id in (select id from public.profiles where username <> 'lytt');`
(Công việc đang giao cho những người này sẽ chuyển thành "Chưa giao".)

## Cập nhật phiên bản đã chạy thật
Khi có file SQL mới trong `supabase/migrations/`, chạy nó trong Supabase **trước**, rồi mới tải code mới lên GitHub. Bản 002: thêm cột Email và bảo vệ mật khẩu mặc định.

## Cấu trúc thư mục

```
index.html            Trang duy nhất (tải thư viện biểu đồ, Excel, Supabase từ CDN)
css/styles.css        Toàn bộ hệ thiết kế (xem DESIGN.md)
js/config.js          Cấu hình kết nối Supabase
js/data.js            Lớp dữ liệu: chế độ Supabase và chế độ DEMO
js/app.js             Màn hình: đăng nhập, tổng quan, dự án, công việc, báo cáo, quản trị
js/table.js           Bảng: sắp xếp, kéo giãn cột, kéo đổi vị trí cột
js/export.js          Xuất IN / Word / Excel
js/import.js          Đọc file Excel (người dùng, dự án, công việc), tạo file mẫu
tools/                Công cụ chạy một lần (chuyển dữ liệu từ hệ thống cũ)
js/ui.js              Hộp thoại, thông báo, biểu tượng, tiện ích
supabase/schema.sql   Bảng dữ liệu, phân quyền, hàm quản trị
```

## Lưu ý vận hành
- **Sao lưu**: Supabase Free không tự sao lưu lâu dài. Định kỳ vào Table Editor → xuất CSV, hoặc dùng nút Excel trong app.
- **Gói Free** của Supabase tự tạm dừng nếu 7 ngày không ai truy cập; vào dashboard bấm Restore là chạy lại.
- GitHub Pages gói miễn phí cần kho **Public**. Điều này an toàn vì dữ liệu được bảo vệ bằng đăng nhập và phân quyền trong Supabase (khóa Publishable vốn là khóa công khai); chỉ có mã nguồn là ai cũng xem được. **Không bao giờ** đưa mật khẩu database, khóa `secret` hay `service_role` vào kho. Muốn kín mã nguồn thì dùng Netlify/Cloudflare Pages.

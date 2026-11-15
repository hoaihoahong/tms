# Quy định thiết kế TMS

Mọi thành phần lấy giá trị từ biến CSS ở đầu `css/styles.css`. Người dùng đổi nhanh qua nút **Giao diện** (biểu tượng bảng màu) trên thanh trên cùng; lựa chọn được nhớ theo từng trình duyệt.

## Bảng màu (4 bộ)
| Bộ | Nền chính | Màu nhấn | Màu điểm nhấn | Dùng khi |
|---|---|---|---|---|
| **Xanh Điện lực** (mặc định) | Navy `#0A2540` / xanh `#0F4C81` | Vàng điện `#F2A900` | | Chuẩn ngành điện |
| Sáng thanh lịch | Trắng | Xanh ngọc `#0E7C86` | Cam `#E8590C` | Phòng sáng, in ấn |
| Tối chuyên nghiệp | `#0C1320` | Xanh trời `#4DA3F0` | Vàng `#FFC233` | Làm việc ban đêm |
| Xanh lá năng lượng | `#0C3524` | Lục `#17794A` | Vàng `#F2A900` | Năng lượng sạch |

Màu ngữ nghĩa cố định theo bộ: `--success` (xong), `--warning` (chú ý), `--danger` (quá hạn/lỗi), `--info`. Biểu đồ dùng `--chart-1…6`.

## Kiểu chữ
- Phông: Be Vietnam Pro (mặc định, hỗ trợ tiếng Việt tốt), Inter, Roboto, Segoe UI, phông có chân.
- Cỡ chữ gốc: Nhỏ 12pt (16px) · Vừa 13,5pt (18px) · **Lớn 15pt (20px, mặc định)** · Rất lớn 16,5pt (22px). Mọi cỡ khác tính theo `rem` nên tự lớn theo; độ rộng cột bảng mặc định cũng tự lớn theo cỡ chữ.
- **Quy tắc chữ rõ nét:** không dùng chữ mờ. Chữ thường `--text`, chữ phụ `--text-2` và `--text-3` đều đạt tương phản tối thiểu 7:1 trên nền; không dùng `opacity` cho chữ; nội dung đậm 500, nhãn và tiêu đề đậm 700; chữ nhỏ nhất là .8rem.
- Tiêu đề: đậm 650, tiêu đề cột bảng viết hoa cỡ .82rem.
- Biểu mẫu lớn (ví dụ Thêm dự án) mở hộp thoại gần toàn màn hình (`.modal.xl`), ô Tên dự án cao 5 dòng.

## Hình khối
- **Bo góc**: Vuông 2px · Vừa 10px (mặc định) · Tròn 16px (`--r`, `--r-sm`, `--r-lg`).
- **Bóng đổ**: Không · Nhẹ (mặc định) · Sâu (`--sh-sm/md/lg`).
- **Mật độ bảng**: Gọn · Vừa · Thoáng (`--pad-cell`).
- **Kiểu bảng**: Kẻ sọc (mặc định) · Lưới · Phẳng.

## Thành phần
Nút (`.btn`, `-primary`, `-accent`, `-danger`, `-ghost`) · ô nhập (`.in`) · thẻ (`.card`) · huy hiệu trạng thái (`.pill` + `ok/warn/bad/info/pri/acc`) · thanh tiến độ (`.bar`) · bảng (`.dt`, kéo giãn/kéo đổi cột) · kanban (`.kanban`) · hộp thoại (`.modal`) · thông báo (`.toast`).

## Chuyển động
Chuyển trang trượt nhẹ 0,35s · số KPI đếm lên · biểu đồ vẽ dần có độ trễ từng cột · thẻ nổi nhẹ khi rê chuột · hộp thoại bật mở. Tự tắt khi hệ điều hành bật "giảm chuyển động".

## Mẫu báo cáo (IN / Word / Excel)
Font Times New Roman 13pt, A4 ngang. Đầu trang: tên đơn vị, **tên phòng ban**, ngày/người in. Giữa: tiêu đề báo cáo, bảng có STT. Cuối: ngày tháng, ô ký **Người lập biểu** (người đang đăng nhập) và **Trưởng phòng** (tài khoản có quyền Trưởng phòng). Tên đơn vị, phòng, địa danh sửa tại **Quản trị → Thông tin phòng**.

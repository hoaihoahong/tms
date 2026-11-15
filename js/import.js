// Nhập danh sách người dùng từ file Excel (3 cột: Tên tài khoản, Họ tên, Email)
import { download } from './export.js';

export const stripAccents = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
const norm = (s) => stripAccents(s).toLowerCase().trim();

function cellText(v) {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v instanceof Date) return '';
    if ('text' in v) return cellText(v.text);
    if ('result' in v) return cellText(v.result);
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('').trim();
    if ('hyperlink' in v) return String(v.hyperlink).replace(/^mailto:/i, '').trim();
    return '';
  }
  return String(v).trim();
}

/** Đọc file .xlsx, trả về [{line, raw, username, full_name, email}] */
export async function readUsersExcel(file) {
  if (!/\.xlsx$/i.test(file.name)) throw new Error('Chỉ nhận file Excel đuôi .xlsx. Hãy bấm "Tải file mẫu" để dùng đúng định dạng.');
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.load(await file.arrayBuffer()); } catch { throw new Error('Không đọc được file Excel này (file hỏng hoặc có mật khẩu).'); }
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('File không có trang tính nào.');
  // Nhận diện dòng tiêu đề; nếu không có thì mặc định cột A, B, C
  const head = [1, 2, 3, 4, 5, 6].map((c) => norm(cellText(ws.getRow(1).getCell(c).value)));
  const iu = head.findIndex((h) => /tai khoan|dang nhap|ten tk|^tk$|username/.test(h));
  const inm = head.findIndex((h) => /ho ten|ho va ten|full ?name/.test(h));
  const ie = head.findIndex((h) => /mail/.test(h));
  const hasHeader = iu >= 0 || inm >= 0 || ie >= 0;
  const col = hasHeader ? { u: iu >= 0 ? iu + 1 : 1, n: inm >= 0 ? inm + 1 : 2, e: ie >= 0 ? ie + 1 : 3 } : { u: 1, n: 2, e: 3 };
  const rows = [];
  for (let r = hasHeader ? 2 : 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const raw = cellText(row.getCell(col.u).value), name = cellText(row.getCell(col.n).value), email = cellText(row.getCell(col.e).value);
    if (!raw && !name && !email) continue;
    // Tên đăng nhập: bỏ dấu tiếng Việt, bỏ khoảng trắng, viết thường (ví dụ "Việt" -> "viet")
    rows.push({ line: r, raw, username: stripAccents(raw).replace(/\s+/g, '').toLowerCase(), full_name: name || raw, email });
  }
  if (!rows.length) throw new Error('File không có dòng dữ liệu nào.');
  if (rows.length > 500) throw new Error('File có quá 500 dòng. Hãy chia nhỏ rồi nhập từng lần.');
  return rows;
}

/** Tạo và tải file Excel mẫu */
export async function downloadUserTemplate() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Danh sách nhân viên');
  ws.columns = [{ width: 24 }, { width: 32 }, { width: 38 }];
  const h = ws.addRow(['Tên tài khoản', 'Họ tên', 'Email']);
  h.eachCell((c) => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F4C81' } }; c.alignment = { vertical: 'middle' }; });
  h.height = 24;
  ws.addRow(['nguyenvana', 'Nguyễn Văn A', 'nguyenvana@congty.vn']);
  ws.addRow(['tranthib', 'Trần Thị B', 'tranthib@congty.vn']);
  ws.getCell('E1').value = 'Hướng dẫn';
  ws.getCell('E1').font = { bold: true };
  ws.getCell('E2').value = 'Tên tài khoản: tự bỏ dấu khi nhập (Việt -> viet). Để trống Họ tên thì lấy theo Tên tài khoản.';
  ws.getCell('E3').value = 'Mật khẩu mặc định được nhập ở màn hình xem trước khi nhập (chỉ Trưởng phòng thấy). Nhân viên nên đổi sau khi đăng nhập.';
  ws.getColumn(5).width = 90;
  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'Mau_nhap_nguoi_dung.xlsx');
}

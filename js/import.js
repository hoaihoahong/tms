// Nhập dữ liệu hàng loạt từ file Excel: Người dùng, Dự án, Công việc (+ Gợi ý đầu việc)
import { download } from './export.js';

export const stripAccents = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
const norm = (s) => stripAccents(s).toLowerCase().replace(/\s+/g, ' ').trim();
const pad = (n) => String(n).padStart(2, '0');

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

function mkDate(y, m, d) {
  y = +y; m = +m; d = +d;
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return { iso: '', bad: true };
  return { iso: `${y}-${pad(m)}-${pad(d)}`, bad: false };
}
/** Chuyển ô ngày (Date, "2026-08-03", "03/08/2026") thành {iso, bad} */
function toISO(v) {
  if (v == null || v === '') return { iso: '', bad: false };
  if (v instanceof Date) return isNaN(v) ? { iso: '', bad: true } : mkDate(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
  const t = cellText(v);
  if (!t) return { iso: '', bad: false };
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return mkDate(m[1], m[2], m[3]);
  m = t.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/); if (m) return mkDate(m[3], m[2], m[1]);
  return { iso: '', bad: true };
}

async function loadWorkbook(file) {
  if (!/\.xlsx$/i.test(file.name)) throw new Error('Chỉ nhận file Excel đuôi .xlsx. Hãy bấm "Tải file mẫu" để dùng đúng định dạng.');
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.load(await file.arrayBuffer()); } catch { throw new Error('Không đọc được file Excel này (file hỏng hoặc có mật khẩu).'); }
  if (!wb.worksheets.length) throw new Error('File không có trang tính nào.');
  return wb;
}
const pickSheet = (wb, ...res) => { for (const re of res) { const w = wb.worksheets.find((s) => re.test(norm(s.name))); if (w) return w; } return null; };

/** Đọc một bảng: tự tìm dòng tiêu đề trong 12 dòng đầu, khớp cột theo spec {trường: /regex/} */
function readTable(ws, spec, dateFields = []) {
  const ncol = Math.max(ws.columnCount, 1);
  for (let r = 1; r <= Math.min(ws.rowCount, 12); r++) {
    const heads = []; for (let c = 1; c <= ncol; c++) heads.push(norm(cellText(ws.getRow(r).getCell(c).value)));
    const map = {};
    Object.entries(spec).forEach(([f, re]) => { const i = heads.findIndex((h) => re.test(h)); if (i >= 0) map[f] = i + 1; });
    if (Object.keys(map).length < 3) continue;
    const rows = [];
    for (let rr = r + 1; rr <= ws.rowCount; rr++) {
      const row = ws.getRow(rr); const o = { line: rr }; let any = false;
      for (const f of Object.keys(map)) {
        const v = row.getCell(map[f]).value;
        if (dateFields.includes(f)) { const t = toISO(v); o[f] = t.iso; o[f + '_bad'] = t.bad; if (t.iso || t.bad) any = true; }
        else { o[f] = cellText(v); if (o[f]) any = true; }
      }
      if (any) rows.push(o);
    }
    return { map, rows };
  }
  return null;
}
const need = (t, fields, what) => {
  if (!t) throw new Error(`Không tìm thấy dòng tiêu đề của ${what}. Hãy bấm "Tải file mẫu" để dùng đúng định dạng.`);
  const miss = fields.filter((f) => !t.map[f.k]);
  if (miss.length) throw new Error(`Thiếu cột: ${miss.map((f) => f.l).join(', ')}.`);
  if (!t.rows.length) throw new Error('File không có dòng dữ liệu nào.');
  if (t.rows.length > 1000) throw new Error('File có quá 1000 dòng. Hãy chia nhỏ rồi nhập từng lần.');
};

/* ===================== NGƯỜI DÙNG ===================== */
/** [{line, raw, username, full_name, email, position, role}] ; role chỉ đặt khi file có cột Quyền */
export async function readUsersExcel(file) {
  const wb = await loadWorkbook(file);
  const ws = pickSheet(wb, /^nguoi dung$/, /nguoi dung|nhan vien/) || wb.worksheets[0];
  const head = Array.from({ length: Math.max(ws.columnCount, 6) }, (_, i) => norm(cellText(ws.getRow(1).getCell(i + 1).value)));
  const find = (re) => head.findIndex((h) => re.test(h));
  const iu = find(/tai khoan|dang nhap|ten tk|^tk$|username/), inm = find(/ho ten|ho va ten|full ?name/), ie = find(/mail/), ip = find(/chuc vu/), iq = find(/^quyen/);
  const hasHeader = iu >= 0 || inm >= 0 || ie >= 0;
  const col = hasHeader ? { u: iu >= 0 ? iu + 1 : 1, n: inm >= 0 ? inm + 1 : 2, e: ie >= 0 ? ie + 1 : 3, p: ip >= 0 ? ip + 1 : 0, q: iq >= 0 ? iq + 1 : 0 } : { u: 1, n: 2, e: 3, p: 0, q: 0 };
  const rows = [];
  for (let r = hasHeader ? 2 : 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const raw = cellText(row.getCell(col.u).value), name = cellText(row.getCell(col.n).value), email = cellText(row.getCell(col.e).value);
    if (!raw && !name && !email) continue;
    const position = col.p ? cellText(row.getCell(col.p).value) : '';
    const q = col.q ? norm(cellText(row.getCell(col.q).value)) : '';
    // Tên đăng nhập: bỏ dấu tiếng Việt, bỏ khoảng trắng, viết thường (ví dụ "Việt" -> "viet")
    rows.push({ line: r, raw, username: stripAccents(raw).replace(/\s+/g, '').toLowerCase(), full_name: name || raw, email, position,
      role: col.q ? (/admin|truong phong|quan tri/.test(q) ? 'truong_phong' : 'nhan_vien') : 'nhan_vien', hasRole: !!col.q });
  }
  if (!rows.length) throw new Error('File không có dòng dữ liệu nào.');
  if (rows.length > 500) throw new Error('File có quá 500 dòng. Hãy chia nhỏ rồi nhập từng lần.');
  return rows;
}

/* ===================== DỰ ÁN ===================== */
const P_SPEC = { code: /^ma du an|^ma$/, name: /^ten du an/, type: /loai du an/, bid_package: /goi thau|pham vi/, customer: /khach hang/, assigning_dept: /bo phan giao/,
  interest_level: /quan tam/, tech_lead: /phu trach (kt|ky thuat)/, biz_lead: /pdkd/, manager: /quan ly/, start_date: /ngay (bat dau|giao)/, deadline: /deadline|han hoan thanh/, status: /trang thai/ };
export async function readProjectsExcel(file) {
  const wb = await loadWorkbook(file);
  const ws = pickSheet(wb, /^du an$/, /du an|milestone/) || wb.worksheets[0];
  const t = readTable(ws, P_SPEC, ['start_date', 'deadline']);
  need(t, [{ k: 'code', l: 'Mã dự án' }, { k: 'name', l: 'Tên dự án' }], 'danh sách dự án');
  return t.rows;
}

/* ===================== CÔNG VIỆC (+ gợi ý đầu việc) ===================== */
const T_SPEC = { project_code: /^ma du an|^ma$/, project_name: /^ten du an/, name: /^ten cong viec/, start_date: /ngay bat dau/, due_date: /han hoan thanh/, assignee: /nguoi phu trach/,
  priority: /muc uu tien/, status: /trang thai/, note: /ghi chu/, creator: /nguoi tao/, completed_date: /hoan thanh thuc te/ };
export async function readTasksExcel(file) {
  const wb = await loadWorkbook(file);
  const ws = pickSheet(wb, /^cong viec$/, /cong viec/) || wb.worksheets[0];
  const t = readTable(ws, T_SPEC, ['start_date', 'due_date', 'completed_date']);
  need(t, [{ k: 'name', l: 'Tên công việc' }], 'danh sách công việc');
  if (!t.map.project_code && !t.map.project_name) throw new Error('Thiếu cột "Mã dự án" (hoặc "Tên dự án") để biết công việc thuộc dự án nào.');
  const lib = pickSheet(wb, /goi y dau viec|thu vien dau viec/);
  const library = [];
  if (lib) { const seen = new Set(); for (let r = 2; r <= lib.rowCount; r++) { const v = cellText(lib.getRow(r).getCell(1).value); if (v && !seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); library.push(v); } } }
  return { rows: t.rows, library };
}

/* ===================== FILE MẪU ===================== */
const HFILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F4C81' } };
function addSheet(wb, title, header, widths, samples) {
  const ws = wb.addWorksheet(title);
  ws.columns = widths.map((w) => ({ width: w }));
  const h = ws.addRow(header);
  h.eachCell((c) => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = HFILL; c.alignment = { vertical: 'middle', wrapText: true }; });
  h.height = 26;
  samples.forEach((s) => ws.addRow(s));
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  return ws;
}
async function saveWb(wb, name) {
  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name);
}
export async function downloadUserTemplate() {
  const wb = new ExcelJS.Workbook();
  const ws = addSheet(wb, 'Người dùng', ['Tên tài khoản', 'Họ tên', 'Email', 'Chức vụ', 'Quyền'], [22, 30, 36, 24, 16],
    [['nguyenvana', 'Nguyễn Văn A', 'nguyenvana@congty.vn', 'Chuyên viên', 'Nhân viên'], ['tranthib', 'Trần Thị B', 'tranthib@congty.vn', 'Phó Trưởng phòng', 'Trưởng phòng']]);
  ws.getCell('G1').value = 'Hướng dẫn'; ws.getCell('G1').font = { bold: true };
  ws.getCell('G2').value = 'Tên tài khoản tự bỏ dấu (Việt -> viet). Để trống Họ tên thì lấy theo Tên tài khoản. Cột Chức vụ và Quyền có thể bỏ.';
  ws.getCell('G3').value = 'Quyền "Trưởng phòng" hoặc "Admin" = toàn quyền; mọi giá trị khác = Nhân viên. Mật khẩu mặc định nhập ở màn hình xem trước.';
  ws.getColumn(7).width = 100;
  await saveWb(wb, 'Mau_nhap_nguoi_dung.xlsx');
}
export async function downloadProjectTemplate() {
  const wb = new ExcelJS.Workbook();
  addSheet(wb, 'Dự án', ['Mã dự án', 'Tên dự án', 'Loại dự án', 'Tên gói thầu', 'Khách hàng', 'Bộ phận giao việc', 'Mức độ quan tâm', 'Phụ trách KT', 'Phụ trách PDKD', 'Quản lý tổng thể', 'Ngày bắt đầu', 'Ngày Deadline', 'Trạng thái'],
    [14, 50, 18, 36, 22, 24, 18, 22, 22, 22, 14, 14, 16],
    [['DA-001', 'Trạm biến áp 110kV A', 'AIS', 'Gói thầu số 1', 'EVN Hà Nội', 'Ban Kỹ thuật', 'Quan trọng', 'Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C', '03/08/2026', '20/08/2026', 'Đang thực hiện']]);
  const g = wb.addWorksheet('Hướng dẫn');
  g.getColumn(1).width = 110;
  ['Mã dự án là duy nhất; dòng trùng mã với dự án đã có sẽ bị bỏ qua.',
    'Mức độ quan tâm: Bình thường, Quan trọng, Rất quan trọng.',
    'Trạng thái: Chuẩn bị, Đang thực hiện, Tạm dừng, Hoàn thành, Đã hủy.',
    'Ngày ghi dạng 03/08/2026 hoặc 2026-08-03; có thể để trống.'].forEach((t) => g.addRow([t]));
  await saveWb(wb, 'Mau_nhap_du_an.xlsx');
}
export async function downloadTaskTemplate() {
  const wb = new ExcelJS.Workbook();
  addSheet(wb, 'Công việc', ['Mã dự án', 'Tên dự án (để đối chiếu)', 'Tên công việc', 'Ngày bắt đầu', 'Hạn hoàn thành', 'Người phụ trách', 'Mức ưu tiên', 'Trạng thái', 'Ghi chú', 'Người tạo', 'Ngày hoàn thành thực tế'],
    [14, 36, 50, 14, 16, 20, 14, 14, 36, 16, 20],
    [['DA-001', 'Trạm biến áp 110kV A', 'Khảo sát hiện trạng', '03/08/2026', '08/08/2026', 'nguyenvana', 'Cao', 'Hoàn thành', '', 'lytt', '08/08/2026']]);
  addSheet(wb, 'Gợi ý đầu việc', ['Tên công việc'], [90], [['Khảo sát hiện trạng'], ['Lập giải pháp kỹ thuật']]);
  const g = wb.addWorksheet('Hướng dẫn'); g.getColumn(1).width = 110;
  ['Mã dự án phải khớp với một dự án đã có trong TMS (nhập dự án trước).',
    'Người phụ trách, Người tạo: ghi tên tài khoản (ví dụ nguyenvana) hoặc họ tên đúng như trong TMS.',
    'Mức ưu tiên: Thấp, Trung bình, Cao, Khẩn cấp. Trạng thái: Chưa làm, Đang làm, Tạm hoãn, Hoàn thành.',
    'Trang "Gợi ý đầu việc" (tùy chọn): các tên công việc này sẽ hiện làm gợi ý khi gõ Tên công việc.'].forEach((t) => g.addRow([t]));
  await saveWb(wb, 'Mau_nhap_cong_viec.xlsx');
}

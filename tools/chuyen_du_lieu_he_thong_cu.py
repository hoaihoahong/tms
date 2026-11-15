# Chuyển dữ liệu hệ thống cũ (Google Sheet "Quản lý công việc DVPM") sang file Excel đúng định dạng nhập của TMS.
# Chạy 1 lần. KHÔNG đọc cột mật khẩu của trang "Danh sách nhân viên". File xuất ra chứa dữ liệu thật: KHÔNG đưa vào kho GitHub.
import sys, collections as C, datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

import glob, os
# Cách dùng: python chuyen_du_lieu_he_thong_cu.py [file_nguon.xlsx] [file_ra.xlsx]
# Không truyền tham số: tự tìm file có "DVPM" trong tên ở thư mục Downloads, ghi ra Downloads/TMS_du_lieu_chuyen_doi.xlsx
DL = os.path.expanduser('~/Downloads')
SRC = sys.argv[1] if len(sys.argv) > 1 else (glob.glob(os.path.join(DL, '*DVPM*.xlsx')) or [''])[0]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(DL, 'TMS_du_lieu_chuyen_doi.xlsx')
if not SRC or not os.path.exists(SRC): sys.exit('Không tìm thấy file nguồn của hệ thống cũ.')
wb = openpyxl.load_workbook(SRC, data_only=True)
T, P, E = wb['Danh sách công việc'], wb['Milestones'], wb['Danh sách nhân viên']
LIB = wb['Thư viện đầu việc'] if 'Thư viện đầu việc' in wb.sheetnames else None
s = lambda v: ('' if v is None else str(v).strip())
def d(v):
    if isinstance(v, datetime.datetime): return v.date()
    if isinstance(v, datetime.date): return v
    return None

issues = []          # (nhóm, nội dung)

# ---------- Nhân viên (đọc cột A..E, KHÔNG đọc cột mật khẩu) ----------
users = []
for r in E.iter_rows(min_row=2, max_col=5, values_only=True):
    if not s(r[0]): continue
    quyen = 'Trưởng phòng' if s(r[4]).lower() == 'admin' else 'Nhân viên'
    users.append([s(r[0]), s(r[1]) or s(r[0]), s(r[3]), s(r[2]), quyen])
name_of = {u[0].lower(): u[1] for u in users}
def person(v):
    v = s(v)
    if not v: return ''
    return name_of.get(v.lower(), v)

# ---------- Dự án ----------
INTEREST = {'rất cao': 'Rất quan trọng', 'cao': 'Quan trọng', 'trung bình': 'Bình thường', '': 'Bình thường'}
PSTATUS = {'đã hoàn thành': 'Hoàn thành', 'dừng - hủy': 'Đã hủy', 'chưa bắt đầu': 'Chuẩn bị', 'đang thực hiện': 'Đang thực hiện'}
projects, code_by_name = [], {}
for r in P.iter_rows(min_row=4, max_col=15, values_only=True):
    if not s(r[2]): continue
    code = f'DA-{len(projects) + 1:03d}'
    st = PSTATUS.get(s(r[13]).lower())
    if st is None:
        issues.append(('Trạng thái dự án lạ', f'{code}: "{s(r[13])}" → để "Chuẩn bị"')); st = 'Chuẩn bị'
    it = INTEREST.get(s(r[6]).lower())
    if it is None:
        issues.append(('Mức quan tâm lạ', f'{code}: "{s(r[6])}" → "Bình thường"')); it = 'Bình thường'
    start, dl = d(r[11]), d(r[12])
    if not start and not dl: issues.append(('Dự án thiếu ngày giao việc và Deadline', f'{code} - {s(r[2])[:70]}'))
    if len(s(r[2])) > 300: issues.append(('Tên dự án rất dài (>300 ký tự)', f'{code}: {len(s(r[2]))} ký tự'))
    projects.append([code, s(r[2]), s(r[1]), s(r[3]), s(r[4]), s(r[5]), it, person(r[7]), person(r[8]), person(r[9]), start, dl, st])
    code_by_name[s(r[2])] = code
n_projects = len(projects)

# ---------- Công việc ----------
TSTATUS = {'đã hoàn thành': 'Hoàn thành', 'đang xử lý': 'Đang làm', 'chưa bắt đầu': 'Chưa làm'}
PRIO = {'cao': 'Cao', 'trung bình': 'Trung bình', 'thấp': 'Thấp', 'khẩn cấp': 'Khẩn cấp'}
extra = {}   # dự án tự tạo cho công việc không ghép được
tasks = []
for r in T.iter_rows(min_row=4, max_col=11, values_only=True):
    if not any(r[:11]): continue
    pname = s(r[10])
    if pname in code_by_name: pc = code_by_name[pname]
    else:
        key = pname or '(Công việc chung - chưa gán dự án)'
        if key not in extra:
            code = f'DA-{n_projects + len(extra) + 1:03d}'
            extra[key] = code
            nm = pname if pname else 'Công việc chung (chưa gán dự án)'
            projects.append([code, nm, '', '', '', '', 'Bình thường', '', '', '', None, None, 'Đang thực hiện'])
            issues.append(('Dự án tự tạo để chứa công việc không ghép được', f'{code} - {nm}'))
        pc = extra[key]
    st = TSTATUS.get(s(r[5]).lower())
    if st is None: issues.append(('Trạng thái công việc lạ', f'"{s(r[5])}" → "Chưa làm"')); st = 'Chưa làm'
    pr = PRIO.get(s(r[4]).lower(), 'Trung bình')
    start, due, done = d(r[1]), d(r[2]), d(r[9])
    if st == 'Hoàn thành' and not done:
        done = due or start
        issues.append(('Việc đã hoàn thành nhưng thiếu Ngày hoàn thành thực tế (lấy theo Hạn hoàn thành)', f'{s(r[0])[:70]}'))
    if not start or not due: issues.append(('Việc thiếu ngày bắt đầu hoặc hạn hoàn thành', f'{s(r[0])[:70]}'))
    tasks.append([pc, pname or '(trống)', s(r[0]), start, due, s(r[3]), pr, st, s(r[7]), s(r[6]), done])

# ---------- Thư viện đầu việc ----------
library = []
if LIB:
    seen = set()
    for r in LIB.iter_rows(min_row=2, max_col=2, values_only=True):
        n = s(r[1])
        if n and n.lower() not in seen: seen.add(n.lower()); library.append([n])

# ---------- Gợi ý chuẩn hóa ----------
def top(rows, i): return C.Counter(x[i] for x in rows if x[i]).most_common()
review_types = [('Loại dự án (đang nhập nguyên văn)', f'{k}  —  {v} dự án') for k, v in top(projects, 2)]
review_cust = [('Khách hàng (đang nhập nguyên văn)', f'{k}  —  {v} dự án') for k, v in top(projects, 4)]

# ---------- Ghi file Excel ----------
out = openpyxl.Workbook()
HFILL = PatternFill('solid', fgColor='0F4C81'); thin = Side(style='thin', color='B8C4D4')
def sheet(title, header, rows, widths, datecols=()):
    ws = out.create_sheet(title)
    ws.append(header)
    for c in ws[1]:
        c.font = Font(bold=True, color='FFFFFF'); c.fill = HFILL
        c.alignment = Alignment(vertical='center', wrap_text=True); c.border = Border(top=thin, bottom=thin, left=thin, right=thin)
    ws.row_dimensions[1].height = 28
    for r in rows: ws.append(r)
    for i, w in enumerate(widths, 1): ws.column_dimensions[get_column_letter(i)].width = w
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.alignment = Alignment(vertical='top', wrap_text=True)
            if c.column in datecols and c.value: c.number_format = 'DD/MM/YYYY'
    ws.freeze_panes = 'A2'
    return ws
out.remove(out.active)
sheet('Người dùng', ['Tên tài khoản', 'Họ tên', 'Email', 'Chức vụ', 'Quyền'], users, [18, 28, 32, 26, 16])
sheet('Dự án', ['Mã dự án', 'Tên dự án', 'Loại dự án', 'Tên gói thầu', 'Khách hàng', 'Bộ phận giao việc', 'Mức độ quan tâm', 'Phụ trách KT', 'Phụ trách PDKD', 'Quản lý tổng thể', 'Ngày bắt đầu', 'Ngày Deadline', 'Trạng thái'],
      projects, [12, 60, 18, 40, 20, 26, 18, 22, 22, 22, 14, 14, 16], datecols=(11, 12))
sheet('Công việc', ['Mã dự án', 'Tên dự án (để đối chiếu)', 'Tên công việc', 'Ngày bắt đầu', 'Hạn hoàn thành', 'Người phụ trách', 'Mức ưu tiên', 'Trạng thái', 'Ghi chú', 'Người tạo', 'Ngày hoàn thành thực tế'],
      tasks, [12, 34, 60, 14, 16, 18, 14, 14, 40, 14, 18], datecols=(4, 5, 11))
sheet('Gợi ý đầu việc', ['Tên công việc'], library, [90])
sheet('Cần xem', ['Nhóm', 'Nội dung'], issues + review_types + review_cust, [60, 90])
out.save(OUT)

# ---------- Thống kê (không in dữ liệu cá nhân) ----------
print('Người dùng:', len(users), '| quyền Trưởng phòng:', sum(1 for u in users if u[4] == 'Trưởng phòng'))
print('Dự án:', len(projects), '(gốc', n_projects, '+ tự tạo', len(extra), ')')
print('Công việc:', len(tasks), '| Gợi ý đầu việc:', len(library))
cnt = C.Counter(g for g, _ in issues)
for g, n in cnt.items(): print(' -', g, ':', n)
print('Đã lưu:', OUT)

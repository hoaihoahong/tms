// TMS - Quản lý công việc | Ứng dụng chính
import { db, DEMO } from './data.js';
import { $, $$, esc, ICON, toast, modal, confirmBox, fmtDate, todayStr, initials, countUp } from './ui.js';
import { createTable } from './table.js';
import { printReport, exportWord, exportExcel, reportHTML } from './export.js';
import { readUsersExcel, downloadUserTemplate } from './import.js';

/* ====================== Hằng số & trạng thái ====================== */
const PROJECT_STATUS = ['Chuẩn bị', 'Đang thực hiện', 'Tạm dừng', 'Hoàn thành', 'Đã hủy'];
const TASK_STATUS = ['Chưa làm', 'Đang làm', 'Tạm hoãn', 'Hoàn thành'];
const PRIORITY = ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'];
const INTEREST = ['Bình thường', 'Quan trọng', 'Rất quan trọng'];
const PROJECT_TYPES = ['Phần mềm', 'Hạ tầng CNTT', 'Chuyển đổi số', 'Tích hợp hệ thống', 'Bảo trì - Vận hành', 'Tư vấn'];
const PILL = {
  pstatus: { 'Chuẩn bị': 'info', 'Đang thực hiện': 'pri', 'Tạm dừng': 'warn', 'Hoàn thành': 'ok', 'Đã hủy': 'bad' },
  tstatus: { 'Chưa làm': '', 'Đang làm': 'pri', 'Tạm hoãn': 'warn', 'Hoàn thành': 'ok' },
  prio: { 'Thấp': '', 'Trung bình': 'info', 'Cao': 'warn', 'Khẩn cấp': 'bad' },
  interest: { 'Bình thường': '', 'Quan trọng': 'acc', 'Rất quan trọng': 'bad' },
};
const pill = (v, map) => (v ? `<span class="pill ${map[v] || ''}">${esc(v)}</span>` : '');

const S = { user: null, profiles: [], projects: [], tasks: [], settings: {}, view: null, unsub: null };
const root = $('#root');
const isHead = () => S.user?.role === 'truong_phong';
const nameOf = (id) => S.profiles.find((p) => p.id === id)?.full_name || '';
const projOf = (id) => S.projects.find((p) => p.id === id);
const headName = () => (S.profiles.find((p) => p.role === 'truong_phong' && p.active) || {}).full_name || '';
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const opts = (list, sel, blank) => (blank !== undefined ? `<option value="">${esc(blank)}</option>` : '') + list.map((v) => { const [val, lab] = Array.isArray(v) ? v : [v, v]; return `<option value="${esc(val)}" ${val === sel ? 'selected' : ''}>${esc(lab)}</option>`; }).join('');
const canEditTask = (t) => isHead() || t.created_by === S.user.id || t.assignee_id === S.user.id;
const canDeleteTask = (t) => isHead() || t.created_by === S.user.id;
const closed = (p) => ['Hoàn thành', 'Đã hủy'].includes(p.status);
const overdueProject = (p) => p.deadline && p.deadline < todayStr() && !closed(p);
const overdueTask = (t) => t.due_date && t.due_date < todayStr() && t.status !== 'Hoàn thành';
const progress = (p) => { const ts = S.tasks.filter((t) => t.project_id === p.id); if (!ts.length) return p.status === 'Hoàn thành' ? 100 : 0; return Math.round((ts.filter((t) => t.status === 'Hoàn thành').length / ts.length) * 100); };
const daysTo = (d) => Math.round((new Date(d + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 86400000);

/* ====================== Giao diện (theme) ====================== */
const PREF_DEFAULT = { theme: 'dienluc', font: 'be', size: 'l', radius: '1', shadow: 'soft', density: 'cozy', table: 'zebra' };
let prefs = { ...PREF_DEFAULT };
try { prefs = { ...PREF_DEFAULT, ...JSON.parse(localStorage.getItem('tms_prefs') || '{}') }; } catch {}
function applyPrefs() {
  Object.entries(prefs).forEach(([k, v]) => (document.documentElement.dataset[k] = v));
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--side-bg').trim();
  $('meta[name=theme-color]')?.setAttribute('content', bg || '#0A2540');
}
const setPref = (k, v) => { prefs[k] = v; try { localStorage.setItem('tms_prefs', JSON.stringify(prefs)); } catch {} applyPrefs(); S.view?.refresh?.(true); };

const THEMES = [
  ['dienluc', 'Xanh Điện lực', ['#0A2540', '#0F4C81', '#F2A900']],
  ['sang', 'Sáng thanh lịch', ['#FFFFFF', '#0E7C86', '#E8590C']],
  ['toi', 'Tối chuyên nghiệp', ['#0A101B', '#4DA3F0', '#FFC233']],
  ['xanhla', 'Xanh lá năng lượng', ['#0C3524', '#17794A', '#F2A900']],
];
function themePanel() {
  const seg = (k, items) => `<div class="seg" data-k="${k}">${items.map(([v, l]) => `<button data-v="${v}" class="${prefs[k] === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  return `<h4>Bảng màu</h4><div class="swatches">${THEMES.map(([v, l, c]) => `<button class="sw ${prefs.theme === v ? 'on' : ''}" data-k="theme" data-v="${v}"><i>${c.map((x) => `<b style="background:${x}"></b>`).join('')}</i>${l}</button>`).join('')}</div>
  <h4>Kiểu chữ</h4>${seg('font', [['be', 'Be Vietnam'], ['inter', 'Inter'], ['roboto', 'Roboto'], ['system', 'Segoe UI'], ['serif', 'Có chân']])}
  <h4>Cỡ chữ</h4>${seg('size', [['s', 'Nhỏ'], ['m', 'Vừa'], ['l', 'Lớn'], ['xl', 'Rất lớn']])}
  <h4>Bo góc đường viền</h4>${seg('radius', [['0', 'Vuông'], ['1', 'Vừa'], ['2', 'Tròn']])}
  <h4>Bóng đổ</h4>${seg('shadow', [['none', 'Không'], ['soft', 'Nhẹ'], ['deep', 'Sâu']])}
  <h4>Mật độ</h4>${seg('density', [['compact', 'Gọn'], ['cozy', 'Vừa'], ['roomy', 'Thoáng']])}
  <h4>Kiểu bảng</h4>${seg('table', [['zebra', 'Kẻ sọc'], ['grid', 'Lưới'], ['plain', 'Phẳng']])}
  <div style="margin-top:1rem"><button class="btn btn-sm" id="prefReset">Về mặc định</button></div>`;
}

/* ====================== Khởi động ====================== */
boot();
async function boot() {
  applyPrefs();
  try { await db.init(); S.user = await db.getSession(); }
  catch (e) { root.innerHTML = `<div class="login-form" style="min-height:100vh"><div class="card"><h2>Không kết nối được dữ liệu</h2><p class="banner err" style="margin-top:1rem">${esc(e.message)}</p><p class="muted small">Kiểm tra lại SUPABASE_URL và SUPABASE_ANON_KEY trong js/config.js, và đã chạy supabase/schema.sql chưa.</p></div></div>`; return; }
  S.user ? startApp() : showLogin();
}

async function showLogin() {
  S.unsub?.(); S.unsub = null;
  let first = false; try { first = !(await db.hasUsers()); } catch (e) { toast(e.message, 'err'); }
  root.innerHTML = `<div class="login" id="login">
    <div class="login-art"><div><div class="bolt">${ICON.bolt}</div><h1>Hệ thống quản lý công việc</h1><p>Theo dõi dự án, giao việc, nhắc hạn và báo cáo trong một nơi duy nhất cho toàn phòng.</p></div>
    <div class="small" style="opacity:.7">${esc(S.settings.dept_name || 'PHÒNG GIẢI PHÁP CÔNG NGHỆ THÔNG TIN')}</div></div>
    <div class="login-form"><div class="card"><h2>${first ? 'Tạo tài khoản Trưởng phòng' : 'Đăng nhập'}</h2>
    <p class="muted small" style="margin:.3rem 0 0">${first ? 'Chưa có tài khoản nào. Người tạo đầu tiên sẽ là Trưởng phòng.' : 'Nhập tên tài khoản và mật khẩu được cấp.'}</p>
    ${DEMO ? `<div class="banner" style="margin-top:1rem"><b>Chế độ DEMO</b> – dữ liệu chỉ lưu trong trình duyệt này.<br>Thử: <b>truongphong</b> / 123456 (Trưởng phòng) hoặc <b>nv1</b> / 123456 (Nhân viên). <button class="link" id="resetDemo" type="button">Xóa dữ liệu demo</button></div>` : ''}
    <form id="lf">${first ? '<label class="f">Họ và tên<input class="in" name="full_name" required autocomplete="name"></label>' : ''}
    <label class="f">Tên tài khoản<input class="in" name="username" required autocomplete="username" autocapitalize="none" pattern="[A-Za-z0-9._\\-]+" title="Chỉ gồm chữ không dấu, số, dấu chấm, gạch"></label>
    <label class="f">Mật khẩu<input class="in" name="password" type="password" required minlength="6" autocomplete="${first ? 'new-password' : 'current-password'}"></label>
    <div class="banner err" id="lerr" hidden></div>
    <button class="btn btn-primary" style="padding:.8em" id="lbtn">${first ? 'Tạo tài khoản & vào hệ thống' : 'Đăng nhập'}</button></form></div></div></div>`;
  $('#resetDemo')?.addEventListener('click', () => { db.resetDemo(); location.reload(); });
  $('#lf').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); const b = $('#lbtn'); b.disabled = true; $('#lerr').hidden = true;
    try { S.user = first ? await db.registerFirst(f.username, f.password, f.full_name) : await db.login(f.username, f.password); startApp(); }
    catch (err) { $('#lerr').textContent = err.message; $('#lerr').hidden = false; b.disabled = false; }
  });
}

async function startApp() {
  root.innerHTML = `<div class="app">
    <aside class="side"><div class="brand"><div class="brand-logo">${ICON.bolt}</div><div><b>TMS</b><span>Quản lý công việc</span></div></div><nav class="nav" id="nav"></nav><div class="side-foot" id="sideFoot"></div></aside>
    <div class="main"><header class="top"><button class="btn btn-ghost icon-btn menu-btn" id="menuBtn" aria-label="Menu">${ICON.menu}</button>
      <div class="title"><h1 id="pageTitle"></h1><span class="small muted" id="pageSub"></span></div>
      <div class="pop-anchor"><button class="btn icon-btn" id="themeBtn" title="Giao diện" aria-label="Giao diện">${ICON.palette}</button><div class="pop theme-pop" id="themePop" hidden></div></div>
      <div class="pop-anchor"><div class="user-chip" id="userChip" tabindex="0" role="button"><div class="avatar" id="avatar"></div><div class="who"><b id="whoName"></b><span id="whoRole"></span></div></div>
        <div class="pop" id="userPop" hidden style="min-width:240px;padding:.5rem"></div></div></header>
      <main class="content" id="content"></main></div></div>`;
  try { await loadAll(); } catch (e) { toast(e.message, 'err'); }
  if (!S.user) return showLogin();
  renderChrome();
  S.unsub = db.subscribe(async () => { try { await loadAll(); renderChrome(); S.view?.refresh?.(); } catch {} });
  window.addEventListener('hashchange', route);
  document.addEventListener('click', (e) => { ['themePop', 'userPop'].forEach((id) => { const p = $('#' + id); if (p && !p.hidden && !e.target.closest('.pop-anchor')) p.hidden = true; }); if (e.target.closest('.nav a')) document.body.classList.remove('nav-open'); });
  $('#menuBtn').onclick = () => document.body.classList.toggle('nav-open');
  document.addEventListener('click', (e) => { if (document.body.classList.contains('nav-open') && !e.target.closest('.side') && !e.target.closest('#menuBtn')) document.body.classList.remove('nav-open'); });
  route();
}

async function loadAll() {
  const [pr, pj, tk, st] = await Promise.all([db.listProfiles(), db.listProjects(), db.listTasks(), db.getSettings()]);
  S.profiles = pr; S.projects = pj; S.tasks = tk; S.settings = st;
  const me = pr.find((p) => p.id === S.user.id);
  if (!me || !me.active) { await db.logout(); S.user = null; return; }
  S.user = me;
}
const refreshAll = async () => { await loadAll(); renderChrome(); S.view?.refresh?.(); };

function renderChrome() {
  const items = [['dashboard', 'Tổng quan', ICON.dash], ['projects', 'Dự án', ICON.folder], ['tasks', 'Công việc', ICON.task], ['reports', 'Báo cáo', ICON.report]];
  if (isHead()) items.push(['admin', 'Quản trị', ICON.admin]);
  const cur = parseHash().name;
  $('#nav').innerHTML = `<div class="nav-label">Chức năng</div>` + items.map(([k, l, i]) => `<a href="#/${k}" class="${cur === k ? 'active' : ''}">${i}<span>${l}</span></a>`).join('');
  $('#sideFoot').innerHTML = esc(S.settings.dept_name || '') + (DEMO ? '<br><b style="color:var(--accent)">CHẾ ĐỘ DEMO</b>' : '');
  $('#avatar').textContent = initials(S.user.full_name); $('#whoName').textContent = S.user.full_name;
  $('#whoRole').textContent = isHead() ? 'Trưởng phòng' : (S.user.position || 'Nhân viên');
  $('#themeBtn').onclick = () => { const p = $('#themePop'); p.hidden = !p.hidden; $('#userPop').hidden = true; if (!p.hidden) bindTheme(); };
  $('#userChip').onclick = () => { const p = $('#userPop'); p.hidden = !p.hidden; $('#themePop').hidden = true;
    p.innerHTML = `<div style="padding:.6rem .8rem"><b>${esc(S.user.full_name)}</b><div class="small muted">@${esc(S.user.username)}</div></div>
    <button class="btn btn-ghost" style="width:100%;justify-content:flex-start" id="meBtn">${ICON.key} Hồ sơ & đổi mật khẩu</button>
    <button class="btn btn-ghost" style="width:100%;justify-content:flex-start" id="outBtn">${ICON.logout} Đăng xuất</button>`;
    $('#meBtn').onclick = () => { p.hidden = true; openProfileForm(); };
    $('#outBtn').onclick = async () => { await db.logout(); S.user = null; S.unsub?.(); location.hash = ''; location.reload(); }; };
}
function bindTheme() {
  const p = $('#themePop'); p.innerHTML = themePanel();
  p.onclick = (e) => { const b = e.target.closest('[data-v]'); if (b) { setPref((b.closest('[data-k]') || b).dataset.k, b.dataset.v); p.innerHTML = themePanel(); }
    if (e.target.id === 'prefReset') { prefs = { ...PREF_DEFAULT }; localStorage.removeItem('tms_prefs'); applyPrefs(); S.view?.refresh?.(true); p.innerHTML = themePanel(); } };
}

/* ====================== Điều hướng ====================== */
const parseHash = () => { const [name, arg] = location.hash.replace(/^#\/?/, '').split('/'); return { name: name || 'dashboard', arg }; };
const VIEWS = { dashboard: dashboardView, projects: projectsView, project: projectDetailView, tasks: tasksView, reports: reportsView, admin: adminView };
function route() {
  let { name, arg } = parseHash();
  if (!VIEWS[name] || (name === 'admin' && !isHead())) name = 'dashboard';
  S.view?.destroy?.();
  const c = $('#content'); c.innerHTML = ''; c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
  S.view = VIEWS[name](c, arg);
  $('#pageTitle').textContent = S.view.title || ''; $('#pageSub').textContent = S.view.sub || S.settings.dept_name || '';
  const nav = name === 'project' ? 'projects' : name;
  $$('#nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#/' + nav));
  window.scrollTo({ top: 0 });
}

/* ====================== Xuất báo cáo dùng chung ====================== */
const exportBtns = () => `<button class="btn" data-exp="xls">${ICON.xls} Excel</button><button class="btn" data-exp="doc">${ICON.word} Word</button><button class="btn btn-accent" data-exp="print">${ICON.print} IN</button>`;
function bindExport(container, getSpec, filename) {
  container.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-exp]'); if (!b) return;
    const spec = getSpec(); const ctx = { settings: S.settings, user: S.user, headName: headName() };
    const fn = `${filename}_${todayStr()}`;
    try { if (b.dataset.exp === 'xls') await exportExcel(spec, ctx, fn); else if (b.dataset.exp === 'doc') exportWord(spec, ctx, fn); else printReport(spec, ctx); }
    catch (err) { toast('Không xuất được: ' + err.message, 'err'); }
  });
}
const expCols = (table) => table.getColumns().map((c) => ({ label: c.label, text: c.text, width: c.width, align: c.align }));

/* ====================== Định nghĩa cột ====================== */
const dateCell = (get, over) => (r) => { const d = get(r); if (!d) return ''; return over?.(r) ? `<span class="pill bad">${fmtDate(d)}</span>` : fmtDate(d); };
const PCOLS = () => [
  { id: 'code', label: 'Mã dự án', width: 130, text: (p) => p.code, render: (p) => `<b>${esc(p.code)}</b>` },
  { id: 'name', label: 'Tên dự án', width: 300, text: (p) => p.name, render: (p) => `<button class="link" data-act="open">${esc(p.name)}</button>` },
  { id: 'type', label: 'Loại dự án', width: 150, text: (p) => p.type },
  { id: 'bid_package', label: 'Tên gói thầu', width: 240, text: (p) => p.bid_package },
  { id: 'customer', label: 'Khách hàng', width: 190, text: (p) => p.customer },
  { id: 'assigning_dept', label: 'Bộ phận giao việc', width: 180, text: (p) => p.assigning_dept },
  { id: 'interest_level', label: 'Mức độ quan tâm', width: 170, text: (p) => p.interest_level, render: (p) => pill(p.interest_level, PILL.interest) },
  { id: 'tech_lead', label: 'Phụ trách KT', width: 160, text: (p) => p.tech_lead },
  { id: 'biz_lead', label: 'Phụ trách PDKD', width: 160, text: (p) => p.biz_lead },
  { id: 'manager', label: 'Quản lý tổng thể', width: 170, text: (p) => p.manager },
  { id: 'start_date', label: 'Ngày bắt đầu', width: 130, align: 'c', text: (p) => fmtDate(p.start_date), sort: (p) => p.start_date || '' },
  { id: 'deadline', label: 'Ngày Deadline', width: 140, align: 'c', text: (p) => fmtDate(p.deadline), sort: (p) => p.deadline || '', render: dateCell((p) => p.deadline, overdueProject) },
  { id: 'status', label: 'Trạng thái', width: 160, text: (p) => p.status, render: (p) => pill(p.status, PILL.pstatus) },
  { id: 'progress', label: 'Tiến độ', width: 140, align: 'c', text: (p) => progress(p) + '%', sort: (p) => progress(p), render: (p) => `<div style="display:flex;align-items:center;gap:.5rem"><div class="bar" style="flex:1"><i style="width:${progress(p)}%"></i></div><b class="small">${progress(p)}%</b></div>` },
];
const TCOLS = (showProject) => [
  showProject && { id: 'project', label: 'Dự án', width: 250, text: (t) => { const p = projOf(t.project_id); return p ? `${p.code} - ${p.name}` : ''; },
    render: (t) => { const p = projOf(t.project_id); return p ? `<button class="link" data-act="open">${esc(p.code)}</button> <span class="muted small">${esc(p.name)}</span>` : ''; } },
  { id: 'name', label: 'Tên công việc', width: 300, text: (t) => t.name, render: (t) => `<b>${esc(t.name)}</b>` },
  { id: 'start_date', label: 'Ngày bắt đầu', width: 130, align: 'c', text: (t) => fmtDate(t.start_date), sort: (t) => t.start_date || '' },
  { id: 'due_date', label: 'Hạn hoàn thành', width: 150, align: 'c', text: (t) => fmtDate(t.due_date), sort: (t) => t.due_date || '', render: dateCell((t) => t.due_date, overdueTask) },
  { id: 'assignee', label: 'Người phụ trách', width: 170, text: (t) => nameOf(t.assignee_id) },
  { id: 'priority', label: 'Mức ưu tiên', width: 130, text: (t) => t.priority, sort: (t) => PRIORITY.indexOf(t.priority), render: (t) => pill(t.priority, PILL.prio) },
  { id: 'status', label: 'Trạng thái', width: 140, text: (t) => t.status, render: (t) => pill(t.status, PILL.tstatus) },
  { id: 'note', label: 'Ghi chú', width: 240, text: (t) => t.note },
  { id: 'creator', label: 'Người tạo', width: 160, text: (t) => nameOf(t.created_by) },
  { id: 'completed_date', label: 'Ngày hoàn thành thực tế', width: 190, align: 'c', text: (t) => fmtDate(t.completed_date), sort: (t) => t.completed_date || '' },
].filter(Boolean);

/* ====================== TỔNG QUAN (Dashboard) ====================== */
function dashboardView(c) {
  c.innerHTML = `<div class="kpis" id="kpis"></div>
  <div class="grid-2"><div class="card"><div class="card-h"><h3>Dự án theo trạng thái</h3></div><div class="card-b"><div class="chart-box"><canvas id="c1"></canvas></div></div></div>
  <div class="card"><div class="card-h"><h3>Công việc theo trạng thái</h3></div><div class="card-b"><div class="chart-box"><canvas id="c2"></canvas></div></div></div></div>
  <div class="grid-2"><div class="card"><div class="card-h"><h3>Khối lượng công việc theo người phụ trách</h3></div><div class="card-b"><div class="chart-box"><canvas id="c3"></canvas></div></div></div>
  <div class="card"><div class="card-h"><h3>Tiến độ các dự án đang thực hiện</h3></div><div class="card-b"><div class="chart-box"><canvas id="c4"></canvas></div></div></div></div>
  <div class="grid-2"><div class="card"><div class="card-h"><h3>Công việc cần chú ý</h3><span class="small muted">Quá hạn và đến hạn trong 7 ngày</span></div><div class="card-b" id="watch"></div></div>
  <div class="card"><div class="card-h"><h3>Dự án sắp đến hạn</h3><span class="small muted">Trong 30 ngày tới</span></div><div class="card-b" id="soon"></div></div></div>`;
  let charts = [];
  const css = () => { const cs = getComputedStyle(document.documentElement); return (n) => cs.getPropertyValue(n).trim(); };
  function build() {
    charts.forEach((x) => x.destroy()); charts = [];
    const v = css(); const text = v('--text-2'), grid = v('--grid'), surf = v('--surface');
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily; Chart.defaults.color = text; Chart.defaults.font.size = 13;
    const C = [1, 2, 3, 4, 5, 6].map((i) => v('--chart-' + i));
    const count = (arr, f, keys) => keys.map((k) => arr.filter((x) => f(x) === k).length);
    const open = S.tasks.filter((t) => t.status !== 'Hoàn thành');
    const anim = { duration: 1100, easing: 'easeOutQuart' };
    const scales = (stack) => ({ x: { stacked: stack, grid: { color: grid }, ticks: { precision: 0 } }, y: { stacked: stack, grid: { display: false } } });
    // 1. Dự án theo trạng thái
    charts.push(new Chart($('#c1'), { type: 'doughnut', data: { labels: PROJECT_STATUS, datasets: [{ data: count(S.projects, (p) => p.status, PROJECT_STATUS), backgroundColor: [C[5], C[0], C[1], C[2], C[3]], borderColor: surf, borderWidth: 3, hoverOffset: 10 }] },
      options: { maintainAspectRatio: false, cutout: '64%', animation: { ...anim, animateRotate: true, animateScale: true }, plugins: { legend: { position: 'right', labels: { usePointStyle: true, padding: 14 } } } } }));
    // 2. Công việc theo trạng thái
    charts.push(new Chart($('#c2'), { type: 'bar', data: { labels: TASK_STATUS, datasets: [{ data: count(S.tasks, (t) => t.status, TASK_STATUS), backgroundColor: [v('--text-3'), C[0], C[1], C[2]], borderRadius: 10, maxBarThickness: 74 }] },
      options: { maintainAspectRatio: false, animation: { ...anim, delay: (x) => x.dataIndex * 140 }, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: grid }, ticks: { precision: 0 } }, x: { grid: { display: false } } } } }));
    // 3. Khối lượng theo người
    const people = S.profiles.filter((p) => p.active);
    charts.push(new Chart($('#c3'), { type: 'bar', data: { labels: people.map((p) => p.full_name), datasets: TASK_STATUS.map((s, i) => ({ label: s, data: people.map((p) => S.tasks.filter((t) => t.assignee_id === p.id && t.status === s).length), backgroundColor: [v('--text-3'), C[0], C[1], C[2]][i], borderRadius: 4 })) },
      options: { indexAxis: 'y', maintainAspectRatio: false, animation: { ...anim, delay: (x) => x.dataIndex * 90 }, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } } }, scales: scales(true) } }));
    // 4. Tiến độ dự án
    const act = S.projects.filter((p) => p.status === 'Đang thực hiện').slice(0, 8);
    charts.push(new Chart($('#c4'), { type: 'bar', data: { labels: act.map((p) => p.code), datasets: [{ label: 'Hoàn thành (%)', data: act.map(progress), backgroundColor: act.map((p) => (overdueProject(p) ? C[3] : C[0])), borderRadius: 8, barThickness: 22 }] },
      options: { indexAxis: 'y', maintainAspectRatio: false, animation: { ...anim, delay: (x) => x.dataIndex * 120 }, plugins: { legend: { display: false }, tooltip: { callbacks: { title: (i) => act[i[0].dataIndex].name, label: (i) => ` ${i.raw}% hoàn thành` } } }, scales: { x: { min: 0, max: 100, grid: { color: grid }, ticks: { callback: (x) => x + '%' } }, y: { grid: { display: false } } } } }));
  }
  function fill() {
    const mine = S.tasks.filter((t) => t.assignee_id === S.user.id && t.status !== 'Hoàn thành');
    const K = [
      ['Tổng số dự án', S.projects.length, 'var(--primary)', 'Toàn phòng'],
      ['Đang thực hiện', S.projects.filter((p) => p.status === 'Đang thực hiện').length, 'var(--info)', 'Dự án đang chạy'],
      ['Dự án trễ hạn', S.projects.filter(overdueProject).length, 'var(--danger)', 'Quá Deadline chưa xong'],
      ['Công việc đang mở', S.tasks.filter((t) => t.status !== 'Hoàn thành').length, 'var(--warning)', 'Chưa hoàn thành'],
      ['Công việc quá hạn', S.tasks.filter(overdueTask).length, 'var(--danger)', 'Cần xử lý ngay'],
      ['Việc của tôi', mine.length, 'var(--success)', `${mine.filter(overdueTask).length} việc quá hạn`],
    ];
    $('#kpis').innerHTML = K.map(([l, n, col, s]) => `<div class="card kpi" style="--k:${col}"><div class="lab">${l}</div><div class="num" data-n="${n}">0</div><div class="sub">${s}</div></div>`).join('');
    $$('#kpis .num').forEach((e) => countUp(e, +e.dataset.n));
    const watch = S.tasks.filter((t) => t.status !== 'Hoàn thành' && t.due_date && daysTo(t.due_date) <= 7).sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 8);
    $('#watch').innerHTML = watch.length ? watch.map((t) => { const d = daysTo(t.due_date), p = projOf(t.project_id);
      return `<div class="list-row"><div class="grow"><b>${esc(t.name)}</b><span class="small muted">${esc(p?.code || '')} · ${esc(nameOf(t.assignee_id) || 'Chưa giao')}</span></div><span class="pill ${d < 0 ? 'bad' : d <= 2 ? 'warn' : 'info'}">${d < 0 ? `Quá ${-d} ngày` : d === 0 ? 'Hôm nay' : `Còn ${d} ngày`}</span></div>`; }).join('') : '<div class="empty">Không có việc nào cần chú ý 🎉</div>';
    const soon = S.projects.filter((p) => !closed(p) && p.deadline && daysTo(p.deadline) <= 30).sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 6);
    $('#soon').innerHTML = soon.length ? soon.map((p) => { const d = daysTo(p.deadline);
      return `<div class="list-row"><div class="grow"><a href="#/project/${p.id}"><b>${esc(p.name)}</b></a><span class="small muted">${esc(p.code)} · ${progress(p)}% hoàn thành</span></div><span class="pill ${d < 0 ? 'bad' : d <= 7 ? 'warn' : 'info'}">${d < 0 ? `Trễ ${-d} ngày` : `Còn ${d} ngày`}</span></div>`; }).join('') : '<div class="empty">Không có dự án nào sắp đến hạn</div>';
  }
  const refresh = () => { fill(); build(); };
  refresh();
  return { title: 'Tổng quan', sub: `Xin chào ${S.user.full_name} · ${fmtDate(todayStr())}`, refresh, destroy: () => charts.forEach((x) => x.destroy()) };
}

/* ====================== DỰ ÁN ====================== */
function projectsView(c) {
  c.innerHTML = `<div class="tools"><div class="search grow">${ICON.search}<input class="in" id="q" placeholder="Tìm theo mã, tên dự án, khách hàng, người phụ trách…"></div>
    <select class="in" id="fs"></select><select class="in" id="ft"></select><select class="in" id="fi"></select>
    ${isHead() ? `<button class="btn btn-primary" id="addP">${ICON.plus} Thêm dự án</button>` : ''}</div>
    <div class="tools" id="exp" style="margin-top:-.2rem"><span class="small muted">Xuất theo đúng bảng đang xem:</span>${exportBtns()}<span style="flex:1"></span><button class="btn btn-ghost btn-sm" id="rst" title="Khôi phục thứ tự và độ rộng cột">Đặt lại cột</button></div>
    <div id="tbl"></div><div class="tbl-foot"><span id="cnt"></span><span>Mẹo: kéo mép tiêu đề để chỉnh độ rộng · kéo tiêu đề để đổi vị trí cột</span></div>`;
  const table = createTable({ key: 'projects', columns: PCOLS(), empty: 'Chưa có dự án nào',
    onRowClick: (p) => (location.hash = '#/project/' + p.id),
    rowActions: isHead() ? () => `<button class="btn btn-ghost btn-sm icon-btn" data-act="edit" title="Sửa">${ICON.edit}</button><button class="btn btn-ghost btn-sm icon-btn" data-act="del" title="Xóa" style="color:var(--danger)">${ICON.trash}</button>` : null,
    onAction: async (a, p) => { if (a === 'open') location.hash = '#/project/' + p.id; if (a === 'edit') openProjectForm(p); if (a === 'del') delProject(p); } });
  $('#tbl').append(table.el);
  const fill = (sel, first, list) => { const s = $(sel), cur = s.value; s.innerHTML = opts(list, cur, first); s.value = list.includes(cur) ? cur : ''; };
  function apply() {
    const q = $('#q').value.trim().toLowerCase();
    const rows = S.projects.filter((p) => (!$('#fs').value || p.status === $('#fs').value) && (!$('#ft').value || p.type === $('#ft').value) && (!$('#fi').value || p.interest_level === $('#fi').value)
      && (!q || [p.code, p.name, p.customer, p.bid_package, p.tech_lead, p.biz_lead, p.manager, p.assigning_dept].join(' ').toLowerCase().includes(q)));
    table.setRows(rows); $('#cnt').textContent = `${rows.length} / ${S.projects.length} dự án`;
  }
  const refresh = () => { fill('#fs', 'Tất cả trạng thái', PROJECT_STATUS); fill('#ft', 'Tất cả loại dự án', [...new Set([...PROJECT_TYPES, ...S.projects.map((p) => p.type).filter(Boolean)])]); fill('#fi', 'Mọi mức quan tâm', INTEREST); apply(); };
  refresh();
  ['#q', '#fs', '#ft', '#fi'].forEach((s) => $(s).addEventListener('input', apply));
  $('#addP')?.addEventListener('click', () => openProjectForm());
  $('#rst').onclick = () => table.resetLayout();
  bindExport($('#exp'), () => ({ title: 'Danh sách dự án', subtitle: `Tính đến ngày ${fmtDate(todayStr())} · ${table.getRows().length} dự án`, landscape: true, blocks: [{ columns: expCols(table), rows: table.getRows() }] }), 'Danh_sach_du_an');
  return { title: 'Dự án', sub: 'Danh mục dự án của phòng', refresh };
}

async function delProject(p) {
  const n = S.tasks.filter((t) => t.project_id === p.id).length;
  if (!(await confirmBox(`Xóa dự án "${p.name}"${n ? ` và ${n} công việc thuộc dự án` : ''}? Thao tác này không thể hoàn tác.`, 'Xóa dự án'))) return;
  try { await db.deleteProject(p.id); toast('Đã xóa dự án', 'ok'); if (parseHash().name === 'project') location.hash = '#/projects'; await refreshAll(); } catch (e) { toast(e.message, 'err'); }
}

function openProjectForm(p) {
  const e = p || { code: '', name: '', type: '', bid_package: '', customer: '', assigning_dept: '', interest_level: 'Bình thường', tech_lead: '', biz_lead: '', manager: '', start_date: todayStr(), deadline: '', status: 'Chuẩn bị' };
  const uniq = (k) => [...new Set(S.projects.map((x) => x[k]).filter(Boolean))];
  const people = [...new Set([...S.profiles.map((x) => x.full_name), ...uniq('tech_lead'), ...uniq('biz_lead'), ...uniq('manager')])];
  const dl = (id, list) => `<datalist id="${id}">${list.map((v) => `<option value="${esc(v)}">`).join('')}</datalist>`;
  const inp = (n, l, o = {}) => `<label class="f ${o.full ? 'full' : ''}">${l}${o.req ? ' <span class="req">*</span>' : ''}<input class="in" name="${n}" value="${esc(e[n])}" ${o.req ? 'required' : ''} ${o.list ? `list="${o.list}"` : ''} type="${o.type || 'text'}" autocomplete="off"></label>`;
  const body = `<form id="pf" class="form-grid">${inp('code', 'Mã dự án', { req: 1 })}${inp('name', 'Tên dự án', { req: 1, full: 0 })}
    ${inp('type', 'Loại dự án', { list: 'dl-type' })}${inp('bid_package', 'Tên gói thầu')}${inp('customer', 'Khách hàng', { list: 'dl-cus' })}${inp('assigning_dept', 'Bộ phận giao việc', { list: 'dl-dept' })}
    <label class="f">Mức độ quan tâm<select class="in" name="interest_level">${opts(INTEREST, e.interest_level)}</select></label>
    ${inp('tech_lead', 'Phụ trách KT', { list: 'dl-ppl' })}${inp('biz_lead', 'Phụ trách PDKD', { list: 'dl-ppl' })}${inp('manager', 'Quản lý tổng thể', { list: 'dl-ppl' })}
    ${inp('start_date', 'Ngày bắt đầu', { type: 'date' })}${inp('deadline', 'Ngày Deadline', { type: 'date' })}
    <label class="f">Trạng thái<select class="in" name="status">${opts(PROJECT_STATUS, e.status)}</select></label>
    ${dl('dl-type', [...new Set([...PROJECT_TYPES, ...uniq('type')])])}${dl('dl-cus', uniq('customer'))}${dl('dl-dept', uniq('assigning_dept'))}${dl('dl-ppl', people)}</form>`;
  modal({ title: p ? 'Sửa dự án' : 'Thêm dự án', body, buttons: [{ label: 'Hủy', close: true }, { label: 'Lưu dự án', cls: 'btn-primary', onClick: async (ov) => {
    const f = $('#pf', ov); if (!f.reportValidity()) return false;
    const v = Object.fromEntries(new FormData(f)); if (v.start_date && v.deadline && v.deadline < v.start_date) throw new Error('Ngày Deadline phải sau ngày bắt đầu');
    await db.saveProject({ ...(p ? { id: p.id } : {}), ...v }); toast('Đã lưu dự án', 'ok'); await refreshAll(); } }] });
}

/* ---------- Danh sách công việc dùng chung (bảng + kanban kéo thả) ---------- */
function taskList({ key, showProject }) {
  let mode = localStorage.getItem('tms_taskmode') || 'table'; let rows = [];
  const box = el('<div></div>');
  const table = createTable({ key, columns: TCOLS(showProject), empty: 'Chưa có công việc nào',
    rowActions: (t) => (canEditTask(t) ? `<button class="btn btn-ghost btn-sm icon-btn" data-act="edit" title="Sửa">${ICON.edit}</button>` : '') + (canDeleteTask(t) ? `<button class="btn btn-ghost btn-sm icon-btn" data-act="del" title="Xóa" style="color:var(--danger)">${ICON.trash}</button>` : ''),
    onAction: (a, t) => { if (a === 'open') location.hash = '#/project/' + t.project_id; if (a === 'edit') openTaskForm(t); if (a === 'del') delTask(t); },
    onRowClick: (t) => canEditTask(t) && openTaskForm(t) });
  const kb = el('<div class="kanban"></div>');
  box.append(table.el, kb);
  function renderKanban() {
    kb.innerHTML = TASK_STATUS.map((s) => { const items = rows.filter((t) => t.status === s);
      return `<div class="col" data-s="${s}"><div class="col-h"><span>${pill(s, PILL.tstatus)}</span><span class="cnt">${items.length}</span></div>${items.map((t) => { const p = projOf(t.project_id);
        return `<div class="tcard" draggable="${canEditTask(t)}" data-id="${t.id}"><div class="t">${esc(t.name)}</div><div class="meta">${showProject && p ? `<span class="pill pri">${esc(p.code)}</span>` : ''}${pill(t.priority, PILL.prio)}${t.due_date ? `<span class="pill ${overdueTask(t) ? 'bad' : ''}">${fmtDate(t.due_date)}</span>` : ''}<span>${esc(nameOf(t.assignee_id) || 'Chưa giao')}</span></div></div>`; }).join('') || '<div class="empty small">Kéo thẻ vào đây</div>'}</div>`; }).join('');
    $$('.tcard', kb).forEach((cd) => {
      cd.addEventListener('dragstart', (e) => { cd.classList.add('dragging'); e.dataTransfer.setData('text/plain', cd.dataset.id); });
      cd.addEventListener('dragend', () => cd.classList.remove('dragging'));
      cd.addEventListener('click', () => { const t = S.tasks.find((x) => x.id === cd.dataset.id); if (t && canEditTask(t)) openTaskForm(t); });
    });
    $$('.col', kb).forEach((col) => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); });
      col.addEventListener('dragleave', () => col.classList.remove('over'));
      col.addEventListener('drop', async (e) => {
        e.preventDefault(); col.classList.remove('over'); const t = S.tasks.find((x) => x.id === e.dataTransfer.getData('text/plain'));
        if (!t || t.status === col.dataset.s) return;
        try { await db.saveTask({ ...t, status: col.dataset.s, completed_date: col.dataset.s === 'Hoàn thành' ? todayStr() : null }); toast(`Đã chuyển sang "${col.dataset.s}"`, 'ok'); await refreshAll(); } catch (er) { toast(er.message, 'err'); }
      });
    });
  }
  const show = () => { table.el.hidden = mode !== 'table'; kb.hidden = mode !== 'kanban'; };
  show();
  return { box, table,
    setRows(r) { rows = r; table.setRows(r); renderKanban(); show(); },
    getMode: () => mode, setMode(m) { mode = m; localStorage.setItem('tms_taskmode', m); show(); },
    getRows: () => (mode === 'table' ? table.getRows() : rows) };
}
const modeTabs = () => `<div class="tabs" id="modeTabs"><button data-m="table">Bảng</button><button data-m="kanban">Kanban (kéo thả)</button></div>`;
function bindModeTabs(list) {
  const set = () => $$('#modeTabs button').forEach((b) => b.classList.toggle('on', b.dataset.m === list.getMode()));
  $('#modeTabs').onclick = (e) => { const b = e.target.closest('[data-m]'); if (b) { list.setMode(b.dataset.m); set(); } }; set();
}
async function delTask(t) {
  if (!(await confirmBox(`Xóa công việc "${t.name}"?`, 'Xóa công việc'))) return;
  try { await db.deleteTask(t.id); toast('Đã xóa công việc', 'ok'); await refreshAll(); } catch (e) { toast(e.message, 'err'); }
}

function openTaskForm(task, fixedProject) {
  const t = task || { project_id: fixedProject || '', name: '', start_date: todayStr(), due_date: '', assignee_id: S.user.id, priority: 'Trung bình', status: 'Chưa làm', note: '', completed_date: '' };
  const people = S.profiles.filter((p) => p.active || p.id === t.assignee_id).map((p) => [p.id, p.full_name]);
  const body = `<form id="tf" class="form-grid">
    <label class="f full">Dự án <span class="req">*</span><select class="in" name="project_id" required ${task || fixedProject ? 'disabled' : ''}>${opts(S.projects.map((p) => [p.id, `${p.code} - ${p.name}`]), t.project_id, '— Chọn dự án —')}</select></label>
    <label class="f full">Tên công việc <span class="req">*</span><input class="in" name="name" value="${esc(t.name)}" required autocomplete="off"></label>
    <label class="f">Ngày bắt đầu<input class="in" type="date" name="start_date" value="${esc(t.start_date || '')}"></label>
    <label class="f">Hạn hoàn thành<input class="in" type="date" name="due_date" value="${esc(t.due_date || '')}"></label>
    <label class="f">Người phụ trách<select class="in" name="assignee_id">${opts(people, t.assignee_id, '— Chưa giao —')}</select></label>
    <label class="f">Mức ưu tiên<select class="in" name="priority">${opts(PRIORITY, t.priority)}</select></label>
    <label class="f">Trạng thái<select class="in" name="status">${opts(TASK_STATUS, t.status)}</select></label>
    <label class="f" id="cdw">Ngày hoàn thành thực tế<input class="in" type="date" name="completed_date" value="${esc(t.completed_date || '')}"></label>
    <label class="f full">Ghi chú<textarea class="in" name="note">${esc(t.note)}</textarea></label>
    ${task ? `<div class="full small muted">Người tạo: <b>${esc(nameOf(t.created_by) || '—')}</b></div>` : ''}</form>`;
  const m = modal({ title: task ? 'Sửa công việc' : 'Thêm công việc', body, buttons: [{ label: 'Hủy', close: true }, { label: 'Lưu công việc', cls: 'btn-primary', onClick: async (ov) => {
    const f = $('#tf', ov); if (!f.reportValidity()) return false;
    const v = Object.fromEntries(new FormData(f)); v.project_id = t.project_id || $('[name=project_id]', f).value;
    if (v.start_date && v.due_date && v.due_date < v.start_date) throw new Error('Hạn hoàn thành phải sau ngày bắt đầu');
    if (v.status !== 'Hoàn thành') v.completed_date = ''; else if (!v.completed_date) v.completed_date = todayStr();
    await db.saveTask({ ...(task ? { ...task } : {}), ...v }); toast('Đã lưu công việc', 'ok'); await refreshAll(); } }] });
  const sync = () => { $('#cdw', m.el).hidden = $('[name=status]', m.el).value !== 'Hoàn thành'; };
  $('[name=status]', m.el).addEventListener('change', sync); sync();
}

/* ====================== CHI TIẾT DỰ ÁN ====================== */
function projectDetailView(c, id) {
  const p0 = projOf(id);
  if (!p0) { c.innerHTML = `<div class="card"><div class="empty">Không tìm thấy dự án. <a href="#/projects">Quay lại danh sách</a></div></div>`; return { title: 'Dự án' }; }
  c.innerHTML = `<p style="margin:0 0 1rem"><a href="#/projects">← Danh sách dự án</a></p><div class="card" style="margin-bottom:var(--gap)" id="head"></div>
    <div class="card"><div class="card-h"><h3>Công việc của dự án</h3>${modeTabs()}<button class="btn btn-primary" id="addT">${ICON.plus} Thêm công việc</button></div><div class="card-b">
    <div class="tools" id="exp" style="margin-bottom:.9rem"><span class="small muted">Xuất báo cáo dự án:</span>${exportBtns()}</div><div id="tl"></div></div></div>`;
  const list = taskList({ key: 'ptasks', showProject: false }); $('#tl').append(list.box); bindModeTabs(list);
  const cur = () => projOf(id);
  const info = (p) => [['Mã dự án', p.code], ['Tên dự án', p.name], ['Loại dự án', p.type], ['Tên gói thầu', p.bid_package], ['Khách hàng', p.customer], ['Bộ phận giao việc', p.assigning_dept], ['Mức độ quan tâm', p.interest_level],
    ['Phụ trách KT', p.tech_lead], ['Phụ trách PDKD', p.biz_lead], ['Quản lý tổng thể', p.manager], ['Ngày bắt đầu', fmtDate(p.start_date)], ['Ngày Deadline', fmtDate(p.deadline)], ['Trạng thái', p.status], ['Tiến độ', progress(p) + '%']];
  function refresh() {
    const p = cur(); if (!p) { location.hash = '#/projects'; return; }
    $('#head').innerHTML = `<div class="card-h"><div style="flex:1;min-width:14rem"><div class="small muted">${esc(p.code)}</div><h2 style="font-size:1.4rem">${esc(p.name)}</h2></div>${pill(p.status, PILL.pstatus)}${overdueProject(p) ? '<span class="pill bad">Trễ hạn</span>' : ''}
      ${isHead() ? `<button class="btn" id="edP">${ICON.edit} Sửa</button><button class="btn" id="dlP" style="color:var(--danger)">${ICON.trash} Xóa</button>` : ''}</div>
      <div class="card-b"><dl class="detail-grid" style="margin:0">${[['Loại dự án', p.type], ['Gói thầu', p.bid_package], ['Khách hàng', p.customer], ['Bộ phận giao việc', p.assigning_dept], ['Mức độ quan tâm', p.interest_level], ['Phụ trách KT', p.tech_lead], ['Phụ trách PDKD', p.biz_lead], ['Quản lý tổng thể', p.manager], ['Ngày bắt đầu', fmtDate(p.start_date)], ['Ngày Deadline', fmtDate(p.deadline)]].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v) || '—'}</dd></div>`).join('')}</dl>
      <div style="margin-top:1.2rem;display:flex;align-items:center;gap:.8rem"><span class="small muted">Tiến độ</span><div class="bar" style="flex:1;height:.7rem"><i id="pbar" style="width:0"></i></div><b>${progress(p)}%</b></div></div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { const b = $('#pbar'); if (b) b.style.width = progress(p) + '%'; }));
    $('#edP')?.addEventListener('click', () => openProjectForm(p)); $('#dlP')?.addEventListener('click', () => delProject(p));
    list.setRows(S.tasks.filter((t) => t.project_id === id).sort((a, b) => (a.due_date || '9').localeCompare(b.due_date || '9')));
  }
  refresh();
  $('#addT').onclick = () => openTaskForm(null, id);
  bindExport($('#exp'), () => { const p = cur(); return { title: 'Báo cáo dự án', subtitle: `${p.code} - ${p.name}`, landscape: true, blocks: [
    { heading: 'I. Thông tin dự án', columns: [{ label: 'Chỉ tiêu', text: (r) => r[0], width: 200 }, { label: 'Nội dung', text: (r) => r[1], width: 600 }], rows: info(p) },
    { heading: 'II. Danh sách công việc', columns: expCols(list.table), rows: list.getRows() }] }; }, 'Bao_cao_du_an');
  const p = cur();
  return { title: p.name, sub: `${p.code} · ${p.customer || ''}`, refresh };
}

/* ====================== CÔNG VIỆC (toàn phòng) ====================== */
function tasksView(c) {
  c.innerHTML = `<div class="tools"><div class="search grow">${ICON.search}<input class="in" id="q" placeholder="Tìm theo tên công việc, ghi chú…"></div>
    <select class="in" id="fp"></select><select class="in" id="fa"></select><select class="in" id="fs"></select><select class="in" id="fr"></select>
    <label class="small" style="display:flex;gap:.4rem;align-items:center;font-weight:600"><input type="checkbox" id="mine"> Việc của tôi</label>
    <button class="btn btn-primary" id="addT">${ICON.plus} Thêm công việc</button></div>
    <div class="tools" id="exp" style="margin-top:-.2rem">${modeTabs()}<span style="flex:1"></span>${exportBtns()}<button class="btn btn-ghost btn-sm" id="rst">Đặt lại cột</button></div>
    <div id="tl"></div><div class="tbl-foot"><span id="cnt"></span><span>Kéo thẻ ở dạng Kanban để đổi trạng thái</span></div>`;
  const list = taskList({ key: 'tasks', showProject: true }); $('#tl').append(list.box); bindModeTabs(list);
  const fill = (sel, first, items) => { const s = $(sel), cur = s.value; s.innerHTML = opts(items, cur, first); if (!items.some((i) => (Array.isArray(i) ? i[0] : i) === cur)) s.value = ''; };
  function apply() {
    const q = $('#q').value.trim().toLowerCase();
    const rows = S.tasks.filter((t) => (!$('#fp').value || t.project_id === $('#fp').value) && (!$('#fa').value || t.assignee_id === $('#fa').value) && (!$('#fs').value || t.status === $('#fs').value)
      && (!$('#fr').value || t.priority === $('#fr').value) && (!$('#mine').checked || t.assignee_id === S.user.id) && (!q || (t.name + ' ' + t.note).toLowerCase().includes(q)))
      .sort((a, b) => (a.due_date || '9').localeCompare(b.due_date || '9'));
    list.setRows(rows); $('#cnt').textContent = `${rows.length} / ${S.tasks.length} công việc`;
  }
  const refresh = () => { fill('#fp', 'Tất cả dự án', S.projects.map((p) => [p.id, p.code])); fill('#fa', 'Mọi người phụ trách', S.profiles.map((p) => [p.id, p.full_name])); fill('#fs', 'Mọi trạng thái', TASK_STATUS); fill('#fr', 'Mọi mức ưu tiên', PRIORITY); apply(); };
  refresh();
  ['#q', '#fp', '#fa', '#fs', '#fr', '#mine'].forEach((s) => $(s).addEventListener('input', apply));
  $('#addT').onclick = () => (S.projects.length ? openTaskForm() : toast('Cần có ít nhất một dự án trước khi thêm công việc', 'err'));
  $('#rst').onclick = () => list.table.resetLayout();
  bindExport($('#exp'), () => ({ title: 'Danh sách công việc', subtitle: `Tính đến ngày ${fmtDate(todayStr())} · ${list.getRows().length} công việc`, landscape: true, blocks: [{ columns: expCols(list.table), rows: list.getRows() }] }), 'Danh_sach_cong_viec');
  return { title: 'Công việc', sub: 'Toàn bộ công việc của các dự án', refresh };
}

/* ====================== BÁO CÁO ====================== */
function reportsView(c) {
  c.innerHTML = `<div class="card" style="margin-bottom:var(--gap)"><div class="card-h"><h3>Lập báo cáo</h3></div><div class="card-b">
    <form class="form-grid" id="rf"><label class="f">Loại báo cáo<select class="in" name="type"><option value="detail">Chi tiết dự án kèm công việc</option><option value="projects">Danh sách dự án</option><option value="tasks">Danh sách công việc</option><option value="overdue">Công việc quá hạn</option></select></label>
    <label class="f">Dự án<select class="in" name="project"></select></label><label class="f">Trạng thái dự án<select class="in" name="pstatus"></select></label>
    <label class="f">Người phụ trách<select class="in" name="person"></select></label><label class="f">Hạn từ ngày<input class="in" type="date" name="from"></label><label class="f">Đến ngày<input class="in" type="date" name="to"></label></form>
    <div class="tools" id="exp" style="margin:1.1rem 0 0"><span class="small muted">Báo cáo có sẵn tên phòng, chữ ký Trưởng phòng và người lập biểu — chỉ việc bấm:</span><span style="flex:1"></span>${exportBtns()}</div></div></div>
    <div class="card"><div class="card-h"><h3>Xem trước</h3><span class="small muted" id="rinfo"></span></div><div class="card-b" style="background:var(--surface-3);overflow:auto"><div id="prev" style="background:#fff;padding:24px 30px;min-width:760px;max-width:1100px;margin:0 auto;box-shadow:var(--sh-md);color:#000"></div></div></div>`;
  const f = $('#rf'); const val = (n) => f.elements[n].value;
  const fill = (n, first, items) => { const s = f.elements[n], cur = s.value; s.innerHTML = opts(items, cur, first); if (!items.some((i) => (Array.isArray(i) ? i[0] : i) === cur)) s.value = ''; };
  function spec() {
    const type = val('type'), from = val('from'), to = val('to');
    const inRange = (d) => (!from || (d && d >= from)) && (!to || (d && d <= to));
    const tcols = TCOLS(type !== 'detail').filter((x) => !['creator'].includes(x.id)).map((x) => ({ label: x.label, text: x.text, width: x.width, align: x.align }));
    const pcols = PCOLS().filter((x) => x.id !== 'progress').concat(PCOLS().filter((x) => x.id === 'progress')).map((x) => ({ label: x.label, text: x.text, width: x.width, align: x.align }));
    const projs = S.projects.filter((p) => (!val('project') || p.id === val('project')) && (!val('pstatus') || p.status === val('pstatus')));
    const tasks = S.tasks.filter((t) => projs.some((p) => p.id === t.project_id) && (!val('person') || t.assignee_id === val('person')) && ((!from && !to) || inRange(t.due_date)));
    const range = from || to ? `Hạn từ ${from ? fmtDate(from) : '…'} đến ${to ? fmtDate(to) : '…'}` : `Tính đến ngày ${fmtDate(todayStr())}`;
    if (type === 'projects') return { title: 'Danh sách dự án', subtitle: range, landscape: true, blocks: [{ columns: pcols, rows: projs.filter((p) => (!from && !to) || inRange(p.deadline)) }] };
    if (type === 'tasks') return { title: 'Danh sách công việc', subtitle: range, landscape: true, blocks: [{ columns: tcols, rows: tasks }] };
    if (type === 'overdue') return { title: 'Danh sách công việc quá hạn', subtitle: `Tính đến ngày ${fmtDate(todayStr())}`, landscape: true, blocks: [{ columns: tcols, rows: tasks.filter(overdueTask).sort((a, b) => a.due_date.localeCompare(b.due_date)) }] };
    return { title: 'Báo cáo chi tiết dự án', subtitle: range, landscape: true, blocks: projs.map((p, i) => ({ heading: `${i + 1}. ${p.code} - ${p.name}`,
      note: `Khách hàng: ${p.customer || '—'} · Trạng thái: ${p.status} · Deadline: ${fmtDate(p.deadline) || '—'} · Tiến độ: ${progress(p)}% · Quản lý: ${p.manager || '—'}`,
      columns: tcols, rows: tasks.filter((t) => t.project_id === p.id) })) };
  }
  const ctx = () => ({ settings: S.settings, user: S.user, headName: headName() });
  function preview() { const s = spec(); $('#prev').innerHTML = reportHTML(s, ctx()); $('#rinfo').textContent = `${s.blocks.reduce((n, b) => n + b.rows.length, 0)} dòng dữ liệu`; }
  const refresh = () => { fill('project', 'Tất cả dự án', S.projects.map((p) => [p.id, p.code + ' - ' + p.name])); fill('pstatus', 'Mọi trạng thái', PROJECT_STATUS); fill('person', 'Tất cả', S.profiles.map((p) => [p.id, p.full_name])); preview(); };
  refresh(); f.addEventListener('input', preview);
  bindExport($('#exp'), spec, 'Bao_cao');
  return { title: 'Báo cáo', sub: 'Xuất Excel, Word hoặc in trực tiếp', refresh };
}

/* ====================== QUẢN TRỊ (Trưởng phòng) ====================== */
function adminView(c) {
  let tab = 'users';
  c.innerHTML = `<div class="tools"><div class="tabs" id="tabs"><button data-t="users">Người dùng</button><button data-t="dept">Thông tin phòng</button></div></div><div id="pane"></div>`;
  const usersPane = () => {
    const pane = $('#pane'); pane.innerHTML = `<div class="tools"><div style="flex:1;min-width:14rem" class="muted small">Trưởng phòng toàn quyền; nhân viên xem tất cả, tự tạo và cập nhật công việc của mình.</div>
      <button class="btn" id="tplU">${ICON.xls} Tải file mẫu</button><button class="btn" id="impU">${ICON.xls} Nhập từ Excel</button><button class="btn btn-primary" id="addU">${ICON.plus} Thêm người dùng</button>
      <input type="file" id="impFile" accept=".xlsx" hidden></div><div id="tbl"></div>`;
    const table = createTable({ key: 'users', empty: 'Chưa có người dùng', columns: [
      { id: 'username', label: 'Tên tài khoản', width: 170, text: (u) => u.username, render: (u) => `<b>${esc(u.username)}</b>` },
      { id: 'full_name', label: 'Họ và tên', width: 220, text: (u) => u.full_name },
      { id: 'email', label: 'Email', width: 250, text: (u) => u.email || '' },
      { id: 'position', label: 'Chức vụ', width: 170, text: (u) => u.position },
      { id: 'role', label: 'Quyền', width: 150, text: (u) => (u.role === 'truong_phong' ? 'Trưởng phòng' : 'Nhân viên'), render: (u) => `<span class="pill ${u.role === 'truong_phong' ? 'acc' : 'pri'}">${u.role === 'truong_phong' ? 'Trưởng phòng' : 'Nhân viên'}</span>` },
      { id: 'active', label: 'Tình trạng', width: 140, text: (u) => (u.active ? 'Hoạt động' : 'Đã khóa'), render: (u) => `<span class="pill ${u.active ? 'ok' : 'bad'}">${u.active ? 'Hoạt động' : 'Đã khóa'}</span>` },
    ], rowActions: (u) => `<button class="btn btn-ghost btn-sm icon-btn" data-act="edit" title="Sửa">${ICON.edit}</button><button class="btn btn-ghost btn-sm icon-btn" data-act="pw" title="Đặt lại mật khẩu">${ICON.key}</button>${u.id !== S.user.id ? `<button class="btn btn-ghost btn-sm icon-btn" data-act="del" title="Xóa" style="color:var(--danger)">${ICON.trash}</button>` : ''}`,
      onAction: async (a, u) => {
        if (a === 'edit') openUserForm(u);
        if (a === 'pw') openPwForm(u);
        if (a === 'del') { if (await confirmBox(`Xóa tài khoản "${u.username}"? Các công việc người này đang phụ trách sẽ chuyển thành "Chưa giao".`, 'Xóa tài khoản')) { try { await db.deleteUser(u.id); toast('Đã xóa tài khoản', 'ok'); await refreshAll(); } catch (e) { toast(e.message, 'err'); } } } } });
    $('#tbl').append(table.el); table.setRows(S.profiles); $('#addU').onclick = () => openUserForm();
    $('#tplU').onclick = () => downloadUserTemplate();
    $('#impU').onclick = () => $('#impFile').click();
    $('#impFile').onchange = async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try { openImportPreview(await readUsersExcel(f)); } catch (er) { toast(er.message, 'err'); }
    };
  };
  const deptPane = () => {
    const s = S.settings; const pane = $('#pane');
    pane.innerHTML = `<div class="card"><div class="card-h"><h3>Thông tin phòng (hiển thị trên mọi báo cáo)</h3></div><div class="card-b"><form id="df" class="form-grid">
      <label class="f full">Tên đơn vị / công ty<input class="in" name="org_name" value="${esc(s.org_name)}"></label>
      <label class="f full">Tên phòng ban<input class="in" name="dept_name" value="${esc(s.dept_name)}"></label>
      <label class="f">Địa danh ghi ngày ký<input class="in" name="place" value="${esc(s.place)}" placeholder="Ví dụ: Hà Nội"></label>
      <label class="f">Chức danh người duyệt<input class="in" name="head_title" value="${esc(s.head_title)}"></label>
      <label class="f full">Mật khẩu mặc định cho tài khoản mới (chỉ Trưởng phòng thấy)<input class="in" name="default_password" type="text" autocomplete="off" value="${esc(s.default_password || '')}" placeholder="Dùng khi nhập người dùng từ Excel"></label>
      <div class="full small muted">Họ tên Trưởng phòng ký báo cáo lấy theo tài khoản có quyền Trưởng phòng: <b>${esc(headName())}</b></div>
      <div class="full"><button class="btn btn-primary" type="submit">Lưu thông tin phòng</button></div></form></div></div>`;
    $('#df').onsubmit = async (e) => { e.preventDefault(); try { await db.saveSettings(Object.fromEntries(new FormData(e.target))); toast('Đã lưu', 'ok'); await refreshAll(); } catch (er) { toast(er.message, 'err'); } };
  };
  const show = () => { $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === tab)); tab === 'users' ? usersPane() : deptPane(); };
  $('#tabs').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) { tab = b.dataset.t; show(); } };
  show();
  return { title: 'Quản trị', sub: 'Người dùng và thông tin phòng', refresh: () => { if (!$('.overlay')) show(); } };
}
function openUserForm(u) {
  const me = u && u.id === S.user.id; const e = u || { username: '', full_name: '', position: '', role: 'nhan_vien', active: true };
  const body = `<form id="uf" class="form-grid">
    <label class="f">Tên tài khoản <span class="req">*</span><input class="in" name="username" value="${esc(e.username)}" ${u ? 'disabled' : 'required'} pattern="[A-Za-z0-9._\\-]+" title="Chữ không dấu, số, dấu chấm, gạch" autocapitalize="none" autocomplete="off"></label>
    <label class="f">Họ và tên <span class="req">*</span><input class="in" name="full_name" value="${esc(e.full_name)}" required></label>
    <label class="f">Email<input class="in" name="email" type="email" value="${esc(e.email || '')}" autocomplete="off"></label>
    <label class="f">Chức vụ<input class="in" name="position" value="${esc(e.position)}" placeholder="Chuyên viên, Kỹ sư…"></label>
    <label class="f">Quyền<select class="in" name="role" ${me ? 'disabled' : ''}>${opts([['nhan_vien', 'Nhân viên'], ['truong_phong', 'Trưởng phòng']], e.role)}</select></label>
    ${u ? `<label class="f">Tình trạng<select class="in" name="active" ${me ? 'disabled' : ''}>${opts([['true', 'Hoạt động'], ['false', 'Khóa tài khoản']], String(e.active))}</select></label>` : `<label class="f">Mật khẩu ban đầu <span class="req">*</span><input class="in" name="password" type="text" minlength="6" required autocomplete="off" placeholder="Tối thiểu 6 ký tự"></label>`}</form>`;
  modal({ title: u ? 'Sửa người dùng' : 'Thêm người dùng', body, buttons: [{ label: 'Hủy', close: true }, { label: 'Lưu', cls: 'btn-primary', onClick: async (ov) => {
    const f = $('#uf', ov); if (!f.reportValidity()) return false; const v = Object.fromEntries(new FormData(f));
    if (u) { const patch = { full_name: v.full_name, position: v.position, email: v.email }; if (!me) { patch.role = v.role; patch.active = v.active === 'true'; } await db.updateProfile(u.id, patch); }
    else await db.createUser(v);
    toast('Đã lưu người dùng', 'ok'); await refreshAll(); } }] });
}
/* ---------- Nhập người dùng hàng loạt từ Excel ---------- */
function validateImport(rows) {
  const exist = new Set(S.profiles.map((p) => p.username)); const seen = new Set();
  return rows.map((r) => {
    let err = '';
    if (!r.username) err = 'Thiếu tên tài khoản';
    else if (!/^[a-z0-9._-]{2,40}$/.test(r.username)) err = 'Tên TK chỉ gồm chữ không dấu, số, . _ - (2 đến 40 ký tự)';
    else if (exist.has(r.username)) err = 'Đã có trong hệ thống';
    else if (seen.has(r.username)) err = 'Trùng tên TK trong file';
    else if (!r.full_name.trim()) err = 'Thiếu họ tên';
    else if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) err = 'Email không hợp lệ';
    if (r.username) seen.add(r.username);
    return { ...r, err };
  });
}
function openImportPreview(rawRows) {
  const list = validateImport(rawRows); const good = list.filter((x) => !x.err);
  const body = `<div id="impBody"><p style="margin:0 0 .8rem">Đọc được <b>${list.length}</b> dòng: <b style="color:var(--success)">${good.length} hợp lệ</b>${list.length - good.length ? `, <b style="color:var(--danger)">${list.length - good.length} có lỗi</b> (sẽ bỏ qua)` : ''}.
    Mỗi tài khoản được tạo với quyền <b>Nhân viên</b> và mật khẩu mặc định ghi ở ô bên dưới.</p>
    <div style="overflow:auto;max-height:46vh;border:1px solid var(--border);border-radius:var(--r)"><table class="dt" style="width:100%;table-layout:auto"><thead><tr><th>Dòng</th><th>Tên đăng nhập</th><th>Họ tên</th><th>Email</th><th>Kết quả</th></tr></thead><tbody>
    ${list.map((x) => `<tr><td class="idx">${x.line}</td><td><b>${esc(x.username)}</b>${x.raw && x.raw !== x.username ? `<div class="small muted">từ "${esc(x.raw)}"</div>` : ''}</td><td>${esc(x.full_name)}</td><td>${esc(x.email)}</td><td>${x.err ? `<span class="pill bad">${esc(x.err)}</span>` : '<span class="pill ok">Hợp lệ</span>'}</td></tr>`).join('')}</tbody></table></div>
    <label class="f" style="margin-top:1rem">Mật khẩu mặc định cho các tài khoản mới <span class="req">*</span><input class="in" id="impPw" type="text" autocomplete="off" value="${esc(S.settings.default_password || '')}" placeholder="Tối thiểu 6 ký tự, ví dụ nhập mật khẩu cô chọn"></label>
    <p class="small muted" id="impProg" style="margin:.8rem 0 0">Mật khẩu này được lưu kín trong Supabase (chỉ Trưởng phòng xem được), lần sau tự điền sẵn. Mỗi 5 phút Supabase chỉ cho tạo khoảng 30 tài khoản. Nếu file nhiều hơn, app sẽ dừng và báo để cô nhập tiếp phần còn lại sau.</p></div>`;
  modal({ title: 'Nhập người dùng từ Excel', size: '', body, onClose: () => { refreshAll(); },
    buttons: [{ label: 'Đóng', close: true }, { label: `Nhập ${good.length} tài khoản`, cls: 'btn-primary', onClick: async (ov) => {
      if (!good.length) throw new Error('Không có dòng hợp lệ để nhập');
      const pw = $('#impPw', ov).value; if (pw.length < 6) throw new Error('Mật khẩu mặc định tối thiểu 6 ký tự');
      if (pw !== S.settings.default_password) { await db.saveSettings({ ...S.settings, default_password: pw }); S.settings.default_password = pw; }
      const prog = $('#impProg', ov); const fails = []; let done = 0; let stopped = false;
      for (const u of good) {
        prog.textContent = `Đang tạo ${done + fails.length + 1} / ${good.length}: ${u.username}…`;
        try { await db.createUser({ username: u.username, full_name: u.full_name, email: u.email, password: pw, role: 'nhan_vien', position: '' }); done++; }
        catch (e) { fails.push(`${u.username}: ${e.message}`); if (/giới hạn|Chưa chạy bản cập nhật/.test(e.message)) { stopped = true; break; } }
      }
      const left = good.length - done - fails.length;
      $('#impBody', ov).innerHTML = `<p style="margin:0"><b style="color:var(--success)">Đã tạo ${done} tài khoản.</b></p>
        ${fails.length ? `<p style="margin:.8rem 0 .3rem;color:var(--danger)"><b>${fails.length} tài khoản chưa tạo được:</b></p><ul class="small" style="margin:0;padding-left:1.2rem">${fails.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
        ${stopped && left > 0 ? `<p class="small" style="margin-top:.8rem">Còn ${left} dòng chưa xử lý. Cô chờ 5 phút rồi nhập lại cùng file này: các tài khoản đã tạo sẽ được bỏ qua.</p>` : ''}
        <p class="small muted" style="margin-top:.8rem">Mật khẩu mặc định: <b>${esc(pw)}</b>. Hãy nhắc mọi người đổi mật khẩu ở menu góc phải (Hồ sơ & đổi mật khẩu).</p>`;
      $('.modal-f .btn-primary', ov).style.display = 'none';
      if (done) toast(`Đã tạo ${done} tài khoản`, 'ok');
      return false; } }] });
}
function openPwForm(u) {
  modal({ title: `Đặt lại mật khẩu: ${u.username}`, size: 'sm', body: `<label class="f">Mật khẩu mới<input class="in" id="npw" type="text" minlength="6" autocomplete="off" placeholder="Tối thiểu 6 ký tự"></label><p class="small muted">Hãy báo mật khẩu mới cho người dùng và nhắc họ đổi lại sau khi đăng nhập.</p>`,
    buttons: [{ label: 'Hủy', close: true }, { label: 'Đặt mật khẩu', cls: 'btn-primary', onClick: async (ov) => { const v = $('#npw', ov).value; if (v.length < 6) throw new Error('Mật khẩu tối thiểu 6 ký tự'); await db.setPassword(u.id, v); toast('Đã đặt lại mật khẩu', 'ok'); } }] });
}
function openProfileForm() {
  const u = S.user;
  modal({ title: 'Hồ sơ của tôi', size: 'sm', body: `<form id="mf" style="display:grid;gap:1rem"><label class="f">Họ và tên<input class="in" name="full_name" value="${esc(u.full_name)}" required></label>
    <label class="f">Email<input class="in" name="email" type="email" value="${esc(u.email || '')}"></label>
    <label class="f">Chức vụ<input class="in" name="position" value="${esc(u.position)}"></label>
    <label class="f">Mật khẩu mới (bỏ trống nếu không đổi)<input class="in" name="password" type="password" minlength="6" autocomplete="new-password"></label></form>`,
    buttons: [{ label: 'Hủy', close: true }, { label: 'Lưu', cls: 'btn-primary', onClick: async (ov) => {
      const f = $('#mf', ov); if (!f.reportValidity()) return false; const v = Object.fromEntries(new FormData(f));
      await db.updateProfile(u.id, { full_name: v.full_name, position: v.position, email: v.email }); if (v.password) await db.changeOwnPassword(v.password);
      toast('Đã cập nhật hồ sơ', 'ok'); await refreshAll(); } }] });
}

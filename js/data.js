// Lớp dữ liệu: cùng một giao diện cho 2 chế độ
//  - Supabase (thật, lưu trên mạng)   - Demo (localStorage, để xem thử)
import { CONFIG } from './config.js';

// Thêm ?demo=1 vào cuối link để chạy thử chế độ DEMO (dữ liệu giả trong trình duyệt, không đụng dữ liệu thật)
export const DEMO = new URLSearchParams(location.search).has('demo') || !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY;
const uid = () => crypto.randomUUID();
const toEmail = (u) => `${String(u).trim().toLowerCase()}@${CONFIG.EMAIL_DOMAIN}`;
const today = () => new Date().toISOString().slice(0, 10);

export const DEFAULT_SETTINGS = {
  org_name: 'CÔNG TY ĐIỆN LỰC',
  dept_name: 'PHÒNG GIẢI PHÁP CÔNG NGHỆ THÔNG TIN',
  place: '',
  head_title: 'Trưởng phòng',
};

/* ===================== Chế độ DEMO ===================== */
function demoAdapter() {
  const KEY = 'tms_demo_db', SKEY = 'tms_demo_session';
  const listeners = new Set();
  const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

  function seed() {
    const tp = uid(), nv1 = uid(), nv2 = uid(), nv3 = uid();
    const P = (code, name, type, pkg, customer, dept, lvl, kt, kd, mgr, s, d, st, by) => ({
      id: uid(), code, name, type, bid_package: pkg, customer, assigning_dept: dept, interest_level: lvl,
      tech_lead: kt, biz_lead: kd, manager: mgr, start_date: addDays(s), deadline: addDays(d), status: st,
      created_by: by, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    const projects = [
      P('DA-2026-001', 'Hệ thống giám sát vận hành SCADA giai đoạn 2', 'Hạ tầng CNTT', 'Gói thầu số 03 - Thiết bị và phần mềm', 'Trung tâm Điều độ', 'Ban Kỹ thuật', 'Rất quan trọng', 'Lê Minh Tuấn', 'Phạm Thu Hà', 'Nguyễn Văn Hùng', -60, 45, 'Đang thực hiện', tp),
      P('DA-2026-002', 'Phần mềm quản lý tài sản thiết bị lưới điện', 'Phần mềm', 'Gói thầu số 01 - Phát triển phần mềm', 'Phòng Kỹ thuật', 'Ban Giám đốc', 'Quan trọng', 'Trần Quốc Bảo', 'Phạm Thu Hà', 'Nguyễn Văn Hùng', -30, 90, 'Đang thực hiện', tp),
      P('DA-2026-003', 'Chuyển đổi số quy trình kinh doanh điện năng', 'Chuyển đổi số', 'Gói thầu số 05 - Tư vấn triển khai', 'Phòng Kinh doanh', 'Ban Giám đốc', 'Rất quan trọng', 'Lê Minh Tuấn', 'Đỗ Thị Lan', 'Nguyễn Văn Hùng', -90, -5, 'Đang thực hiện', tp),
      P('DA-2026-004', 'Nâng cấp hạ tầng máy chủ và lưu trữ', 'Hạ tầng CNTT', 'Gói thầu số 02 - Máy chủ', 'Phòng CNTT', 'Ban Kỹ thuật', 'Bình thường', 'Trần Quốc Bảo', 'Đỗ Thị Lan', 'Nguyễn Văn Hùng', -10, 120, 'Chuẩn bị', tp),
      P('DA-2025-018', 'Cổng thông tin khách hàng trực tuyến', 'Phần mềm', 'Gói thầu số 04 - Phát triển cổng', 'Phòng CSKH', 'Phòng Kinh doanh', 'Quan trọng', 'Lê Minh Tuấn', 'Phạm Thu Hà', 'Nguyễn Văn Hùng', -200, -30, 'Hoàn thành', tp),
    ];
    const T = (pi, name, s, d, who, pr, st, note) => ({
      id: uid(), project_id: projects[pi].id, name, start_date: addDays(s), due_date: addDays(d), assignee_id: who,
      priority: pr, status: st, note, created_by: tp, completed_date: st === 'Hoàn thành' ? addDays(d - 1) : null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    const tasks = [
      T(0, 'Khảo sát hiện trạng trạm biến áp', -58, -40, nv1, 'Cao', 'Hoàn thành', 'Đã nghiệm thu biên bản khảo sát'),
      T(0, 'Thiết kế kiến trúc hệ thống', -40, -10, nv2, 'Cao', 'Hoàn thành', ''),
      T(0, 'Cài đặt và cấu hình máy chủ SCADA', -8, 12, nv1, 'Khẩn cấp', 'Đang làm', 'Chờ thiết bị về kho'),
      T(0, 'Kiểm thử tích hợp với RTU', 10, 30, nv3, 'Cao', 'Chưa làm', ''),
      T(1, 'Phân tích yêu cầu nghiệp vụ', -28, -14, nv2, 'Trung bình', 'Hoàn thành', ''),
      T(1, 'Thiết kế cơ sở dữ liệu', -13, 3, nv2, 'Cao', 'Đang làm', ''),
      T(1, 'Lập trình phân hệ quản lý thiết bị', 2, 40, nv3, 'Trung bình', 'Chưa làm', ''),
      T(2, 'Lập báo cáo đánh giá quy trình hiện tại', -88, -60, nv1, 'Trung bình', 'Hoàn thành', ''),
      T(2, 'Triển khai thí điểm tại 2 điện lực', -50, -8, nv3, 'Khẩn cấp', 'Đang làm', 'Chậm do chờ phê duyệt'),
      T(2, 'Đào tạo người dùng', -7, 10, nv2, 'Cao', 'Chưa làm', ''),
      T(3, 'Lập dự toán thiết bị', -8, 14, nv1, 'Trung bình', 'Đang làm', ''),
      T(4, 'Nghiệm thu và bàn giao', -60, -32, nv3, 'Cao', 'Hoàn thành', ''),
    ];
    const profiles = [
      { id: tp, username: 'truongphong', full_name: 'Nguyễn Văn Hùng', position: 'Trưởng phòng', role: 'truong_phong', active: true, created_at: new Date().toISOString(), _pw: '123456' },
      { id: nv1, username: 'nv1', full_name: 'Lê Minh Tuấn', position: 'Chuyên viên', role: 'nhan_vien', active: true, created_at: new Date().toISOString(), _pw: '123456' },
      { id: nv2, username: 'nv2', full_name: 'Trần Quốc Bảo', position: 'Chuyên viên', role: 'nhan_vien', active: true, created_at: new Date().toISOString(), _pw: '123456' },
      { id: nv3, username: 'nv3', full_name: 'Phạm Thu Hà', position: 'Kỹ sư', role: 'nhan_vien', active: true, created_at: new Date().toISOString(), _pw: '123456' },
    ];
    return { profiles, projects, tasks, settings: { ...DEFAULT_SETTINGS, head_title: 'Trưởng phòng' } };
  }

  const load = () => {
    try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch {}
    const db = seed(); save(db, false); return db;
  };
  const save = (db, notify = true) => {
    localStorage.setItem(KEY, JSON.stringify(db));
    if (notify) listeners.forEach((f) => f());
  };
  window.addEventListener('storage', (e) => { if (e.key === KEY) listeners.forEach((f) => f()); });
  const clean = (p) => { const { _pw, ...rest } = p; return rest; };
  const me = () => { const id = localStorage.getItem(SKEY); return id ? load().profiles.find((p) => p.id === id) : null; };
  const isHead = () => me()?.role === 'truong_phong';
  const deny = () => { throw new Error('Bạn không có quyền thực hiện thao tác này'); };

  return {
    mode: 'demo',
    async init() {},
    async getSession() { const p = me(); return p && p.active ? clean(p) : null; },
    async hasUsers() { return load().profiles.length > 0; },
    async login(username, password) {
      const p = load().profiles.find((x) => x.username === String(username).trim().toLowerCase());
      if (!p || p._pw !== password) throw new Error('Sai tên đăng nhập hoặc mật khẩu');
      if (!p.active) throw new Error('Tài khoản đã bị khóa');
      localStorage.setItem(SKEY, p.id); return clean(p);
    },
    async registerFirst(username, password, full_name) {
      const db = load(); if (db.profiles.length) deny();
      const p = { id: uid(), username: username.trim().toLowerCase(), full_name, position: 'Trưởng phòng', role: 'truong_phong', active: true, created_at: new Date().toISOString(), _pw: password };
      db.profiles.push(p); save(db); localStorage.setItem(SKEY, p.id); return clean(p);
    },
    async logout() { localStorage.removeItem(SKEY); },
    async listProfiles() { return load().profiles.map(clean); },
    async createUser(u) {
      if (!isHead()) deny(); const db = load();
      const un = u.username.trim().toLowerCase();
      if (db.profiles.some((p) => p.username === un)) throw new Error('Tên đăng nhập đã tồn tại');
      db.profiles.push({ id: uid(), username: un, full_name: u.full_name, email: u.email || '', position: u.position || '', role: u.role || 'nhan_vien', active: true, created_at: new Date().toISOString(), _pw: u.password });
      save(db);
    },
    async updateProfile(id, patch) {
      const db = load(); const p = db.profiles.find((x) => x.id === id); if (!p) return;
      if (!isHead() && id !== me()?.id) deny();
      const allowed = isHead() ? ['full_name', 'position', 'email', 'role', 'active'] : ['full_name', 'position', 'email'];
      allowed.forEach((k) => { if (k in patch) p[k] = patch[k]; }); save(db);
    },
    async setPassword(id, pw) { if (!isHead()) deny(); const db = load(); db.profiles.find((x) => x.id === id)._pw = pw; save(db); },
    async changeOwnPassword(pw) { const db = load(); db.profiles.find((x) => x.id === me().id)._pw = pw; save(db); },
    async deleteUser(id) {
      if (!isHead()) deny(); const db = load(); if (id === me().id) throw new Error('Không thể tự xóa tài khoản của mình');
      db.profiles = db.profiles.filter((p) => p.id !== id);
      db.tasks.forEach((t) => { if (t.assignee_id === id) t.assignee_id = null; if (t.created_by === id) t.created_by = null; });
      save(db);
    },
    async listProjects() { return load().projects; },
    async saveProject(p) {
      if (!isHead()) deny(); const db = load();
      if (db.projects.some((x) => x.code === p.code && x.id !== p.id)) throw new Error('Mã dự án đã tồn tại');
      if (p.id) { const i = db.projects.findIndex((x) => x.id === p.id); db.projects[i] = { ...db.projects[i], ...p, updated_at: new Date().toISOString() }; }
      else db.projects.push({ ...p, id: uid(), created_by: me().id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      save(db);
    },
    async deleteProject(id) {
      if (!isHead()) deny(); const db = load();
      db.projects = db.projects.filter((p) => p.id !== id); db.tasks = db.tasks.filter((t) => t.project_id !== id); save(db);
    },
    async listTasks() { return load().tasks; },
    async saveTask(t) {
      const db = load(); const m = me();
      const row = { ...t };
      if (row.status === 'Hoàn thành') row.completed_date = row.completed_date || today(); else row.completed_date = null;
      if (row.id) {
        const i = db.tasks.findIndex((x) => x.id === row.id); const old = db.tasks[i];
        if (!(isHead() || old.created_by === m.id || old.assignee_id === m.id)) deny();
        db.tasks[i] = { ...old, ...row, updated_at: new Date().toISOString() };
      } else db.tasks.push({ ...row, id: uid(), created_by: m.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      save(db);
    },
    async deleteTask(id) {
      const db = load(); const t = db.tasks.find((x) => x.id === id);
      if (!t || !(isHead() || t.created_by === me().id)) deny();
      db.tasks = db.tasks.filter((x) => x.id !== id); save(db);
    },
    async bulkProjects(rows) {
      if (!isHead()) deny(); const db = load(); const m = me(); const now = new Date().toISOString();
      rows.forEach((r) => db.projects.push({ ...r, id: uid(), created_by: m.id, created_at: now, updated_at: now }));
      save(db);
    },
    async bulkTasks(rows) {
      const db = load(); const m = me(); const now = new Date().toISOString();
      rows.forEach((r) => db.tasks.push({ ...r, id: uid(), created_by: r.created_by || m.id, created_at: now, updated_at: now }));
      save(db);
    },
    async getSettings() { return { ...DEFAULT_SETTINGS, ...load().settings }; },
    async saveSettings(s) { if (!isHead()) deny(); const db = load(); db.settings = { ...db.settings, ...s }; save(db); },
    subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    resetDemo() { localStorage.removeItem(KEY); localStorage.removeItem(SKEY); },
  };
}

/* ===================== Chế độ SUPABASE ===================== */
function supabaseAdapter() {
  const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  const ok = ({ data, error }) => { if (error) throw new Error(vnError(error.message)); return data; };
  const vnError = (m) => {
    if (/Invalid login/i.test(m)) return 'Sai tên đăng nhập hoặc mật khẩu';
    if (/duplicate key.*code/i.test(m)) return 'Mã dự án đã tồn tại';
    if (/duplicate key.*username|already registered/i.test(m)) return 'Tên đăng nhập đã tồn tại';
    if (/row-level security/i.test(m)) return 'Bạn không có quyền thực hiện thao tác này';
    if (/Password should be/i.test(m)) return 'Mật khẩu tối thiểu 6 ký tự';
    if (/rate limit|too many/i.test(m)) return 'Supabase giới hạn số lần tạo tài khoản liên tiếp. Hãy đợi 5 phút rồi nhập tiếp phần còn lại';
    if (/column .*email|email.*column/i.test(m)) return 'Chưa chạy bản cập nhật SQL 002 (thêm cột Email) trên Supabase';
    return m;
  };
  async function myProfile() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;
    const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    return data;
  }
  return {
    mode: 'supabase',
    async init() {},
    async getSession() { const p = await myProfile(); if (p && !p.active) { await sb.auth.signOut(); return null; } return p; },
    async hasUsers() { const { data, error } = await sb.rpc('has_users'); if (error) throw new Error(vnError(error.message)); return data; },
    async login(username, password) {
      ok(await sb.auth.signInWithPassword({ email: toEmail(username), password }));
      const p = await myProfile();
      if (!p || !p.active) { await sb.auth.signOut(); throw new Error('Tài khoản đã bị khóa'); }
      return p;
    },
    async registerFirst(username, password, full_name) {
      const { data, error } = await sb.auth.signUp({ email: toEmail(username), password, options: { data: { username: username.trim().toLowerCase(), full_name } } });
      if (error) throw new Error(vnError(error.message));
      if (!data.session) await sb.auth.signInWithPassword({ email: toEmail(username), password });
      await sb.from('profiles').update({ position: 'Trưởng phòng' }).eq('id', data.user.id);
      return myProfile();
    },
    async logout() { await sb.auth.signOut(); },
    async listProfiles() { return ok(await sb.from('profiles').select('*').order('created_at')); },
    async createUser(u) {
      // Dùng một "client phụ" để tạo tài khoản mà không làm Trưởng phòng bị đăng xuất
      const tmp = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'tms-tmp' } });
      const { data, error } = await tmp.auth.signUp({ email: toEmail(u.username), password: u.password, options: { data: { username: u.username.trim().toLowerCase(), full_name: u.full_name } } });
      if (error) throw new Error(vnError(error.message));
      if (!data.user || (data.user.identities && !data.user.identities.length)) throw new Error('Tên đăng nhập đã tồn tại');
      await new Promise((r) => setTimeout(r, 400));
      ok(await sb.from('profiles').update({ position: u.position || '', role: u.role || 'nhan_vien', email: u.email || '' }).eq('id', data.user.id));
    },
    async updateProfile(id, patch) { ok(await sb.from('profiles').update(patch).eq('id', id)); },
    async setPassword(id, pw) { ok(await sb.rpc('admin_set_password', { target: id, new_password: pw })); },
    async changeOwnPassword(pw) { ok(await sb.auth.updateUser({ password: pw })); },
    async deleteUser(id) { ok(await sb.rpc('admin_delete_user', { target: id })); },
    async listProjects() { return ok(await sb.from('projects').select('*').order('created_at', { ascending: false })); },
    async saveProject(p) {
      const row = { ...p }; delete row.created_at; delete row.updated_at;
      ['start_date', 'deadline'].forEach((k) => { if (!row[k]) row[k] = null; });
      if (row.id) ok(await sb.from('projects').update(row).eq('id', row.id));
      else { delete row.id; ok(await sb.from('projects').insert({ ...row, created_by: (await myProfile()).id })); }
    },
    async deleteProject(id) { ok(await sb.from('projects').delete().eq('id', id)); },
    async listTasks() { return ok(await sb.from('tasks').select('*').order('created_at', { ascending: false })); },
    async saveTask(t) {
      const row = { ...t }; delete row.created_at; delete row.updated_at;
      ['start_date', 'due_date', 'completed_date', 'assignee_id'].forEach((k) => { if (!row[k]) row[k] = null; });
      if (row.id) ok(await sb.from('tasks').update(row).eq('id', row.id));
      else { delete row.id; ok(await sb.from('tasks').insert({ ...row, created_by: (await myProfile()).id })); }
    },
    async deleteTask(id) { ok(await sb.from('tasks').delete().eq('id', id)); },
    async bulkProjects(rows) {
      const me = (await myProfile()).id;
      const clean = rows.map((r) => ({ code: r.code, name: r.name, type: r.type || '', bid_package: r.bid_package || '', customer: r.customer || '', assigning_dept: r.assigning_dept || '',
        interest_level: r.interest_level || 'Bình thường', tech_lead: r.tech_lead || '', biz_lead: r.biz_lead || '', manager: r.manager || '',
        start_date: r.start_date || null, deadline: r.deadline || null, status: r.status || 'Chuẩn bị', created_by: me }));
      for (let i = 0; i < clean.length; i += 50) ok(await sb.from('projects').insert(clean.slice(i, i + 50)));
    },
    async bulkTasks(rows) {
      const me = (await myProfile()).id;
      const clean = rows.map((r) => ({ project_id: r.project_id, name: r.name, start_date: r.start_date || null, due_date: r.due_date || null, assignee_id: r.assignee_id || null,
        priority: r.priority || 'Trung bình', status: r.status || 'Chưa làm', note: r.note || '', created_by: r.created_by || me, completed_date: r.completed_date || null }));
      for (let i = 0; i < clean.length; i += 50) ok(await sb.from('tasks').insert(clean.slice(i, i + 50)));
    },
    async getSettings() {
      const { data } = await sb.from('settings').select('key,value');
      const get = (k) => data?.find((r) => r.key === k)?.value || {};
      return { ...DEFAULT_SETTINGS, ...get('org'), ...get('secret'), task_library: get('library').items || [] };   // 'secret' chỉ Trưởng phòng đọc được
    },
    async saveSettings(s) {
      const { default_password, task_library, ...org } = s;
      ok(await sb.from('settings').upsert({ key: 'org', value: org }));
      if (default_password !== undefined) ok(await sb.from('settings').upsert({ key: 'secret', value: { default_password } }));
      if (task_library !== undefined) ok(await sb.from('settings').upsert({ key: 'library', value: { items: task_library } }));
    },
    subscribe(cb) {
      let t; const fire = () => { clearTimeout(t); t = setTimeout(cb, 250); };
      const ch = sb.channel('tms-live').on('postgres_changes', { event: '*', schema: 'public' }, fire).subscribe();
      return () => sb.removeChannel(ch);
    },
  };
}

export const db = DEMO ? demoAdapter() : supabaseAdapter();

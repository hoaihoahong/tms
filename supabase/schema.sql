-- ============================================================
-- TMS - Quản lý công việc | Cơ sở dữ liệu Supabase (PostgreSQL)
-- Cách dùng: Supabase > SQL Editor > New query > dán toàn bộ file này > Run
-- Chạy lại nhiều lần vẫn an toàn (không mất dữ liệu).
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Bảng người dùng (hồ sơ gắn với tài khoản đăng nhập) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  full_name   text not null,
  position    text not null default '',
  role        text not null default 'nhan_vien' check (role in ('truong_phong','nhan_vien')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- Cài đặt chung của phòng ----------
create table if not exists public.settings (
  key   text primary key,
  value jsonb not null
);

-- ---------- Dự án ----------
create table if not exists public.projects (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null,          -- Mã dự án
  name             text not null,                 -- Tên dự án
  type             text not null default '',      -- Loại dự án
  bid_package      text not null default '',      -- Tên gói thầu
  customer         text not null default '',      -- Khách hàng
  assigning_dept   text not null default '',      -- Bộ phận giao việc
  interest_level   text not null default 'Bình thường', -- Mức độ quan tâm
  tech_lead        text not null default '',      -- Phụ trách KT
  biz_lead         text not null default '',      -- Phụ trách PDKD
  manager          text not null default '',      -- Quản lý tổng thể
  start_date       date,                          -- Ngày bắt đầu
  deadline         date,                          -- Ngày Deadline
  status           text not null default 'Chuẩn bị', -- Trạng thái
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------- Công việc (task) thuộc dự án ----------
create table if not exists public.tasks (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  name            text not null,                  -- Tên công việc
  start_date      date,                           -- Ngày bắt đầu
  due_date        date,                           -- Hạn hoàn thành
  assignee_id     uuid references public.profiles(id) on delete set null, -- Người phụ trách
  priority        text not null default 'Trung bình',  -- Mức ưu tiên
  status          text not null default 'Chưa làm',    -- Trạng thái
  note            text not null default '',       -- Ghi chú
  created_by      uuid references public.profiles(id) on delete set null default auth.uid(), -- Người tạo
  completed_date  date,                           -- Ngày hoàn thành thực tế
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists tasks_project_idx  on public.tasks(project_id);
create index if not exists tasks_assignee_idx on public.tasks(assignee_id);

-- ---------- Hàm phụ ----------
create or replace function public.is_head() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'truong_phong' and active);
$$;

-- Cho màn hình đăng nhập biết đã có tài khoản nào chưa (để tạo Trưởng phòng đầu tiên)
create or replace function public.has_users() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles);
$$;
grant execute on function public.has_users() to anon, authenticated;

-- ---------- Tự tạo hồ sơ khi có tài khoản mới (tài khoản đầu tiên = Trưởng phòng) ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case when exists (select 1 from public.profiles) then 'nhan_vien' else 'truong_phong' end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nhân viên không được tự đổi quyền / khóa tài khoản / tên đăng nhập
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_head() then
    new.role := old.role;
    new.active := old.active;
    new.username := old.username;
  end if;
  return new;
end $$;
drop trigger if exists guard_profile_trg on public.profiles;
create trigger guard_profile_trg before update on public.profiles
  for each row execute function public.guard_profile();

-- Cập nhật mốc thời gian + tự điền "Ngày hoàn thành thực tế"
create or replace function public.touch_task() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'Hoàn thành' then
    if new.completed_date is null then new.completed_date := current_date; end if;
  else
    new.completed_date := null;
  end if;
  return new;
end $$;
drop trigger if exists touch_task_trg on public.tasks;
create trigger touch_task_trg before insert or update on public.tasks
  for each row execute function public.touch_task();

create or replace function public.touch_project() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists touch_project_trg on public.projects;
create trigger touch_project_trg before update on public.projects
  for each row execute function public.touch_project();

-- ---------- Hàm dành cho Trưởng phòng: đặt lại mật khẩu / xóa tài khoản ----------
create or replace function public.admin_set_password(target uuid, new_password text) returns void
language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if not public.is_head() then raise exception 'Chỉ Trưởng phòng được thực hiện'; end if;
  if length(new_password) < 6 then raise exception 'Mật khẩu tối thiểu 6 ký tự'; end if;
  update auth.users
     set encrypted_password = crypt(new_password, gen_salt('bf')), updated_at = now()
   where id = target;
end $$;

create or replace function public.admin_delete_user(target uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_head() then raise exception 'Chỉ Trưởng phòng được thực hiện'; end if;
  if target = auth.uid() then raise exception 'Không thể tự xóa tài khoản của mình'; end if;
  delete from auth.users where id = target;
end $$;

grant execute on function public.admin_set_password(uuid, text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ---------- Phân quyền theo dòng dữ liệu (RLS) ----------
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.projects enable row level security;
alter table public.tasks    enable row level security;

drop policy if exists profiles_read   on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_read   on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (public.is_head() or id = auth.uid()) with check (public.is_head() or id = auth.uid());

drop policy if exists settings_read  on public.settings;
drop policy if exists settings_write on public.settings;
create policy settings_read  on public.settings for select to authenticated using (true);
create policy settings_write on public.settings for all    to authenticated
  using (public.is_head()) with check (public.is_head());

-- Dự án: mọi người xem; chỉ Trưởng phòng thêm/sửa/xóa
drop policy if exists projects_read  on public.projects;
drop policy if exists projects_write on public.projects;
create policy projects_read  on public.projects for select to authenticated using (true);
create policy projects_write on public.projects for all    to authenticated
  using (public.is_head()) with check (public.is_head());

-- Công việc: mọi người xem và tạo; sửa/xóa khi là Trưởng phòng, người tạo hoặc người phụ trách
drop policy if exists tasks_read   on public.tasks;
drop policy if exists tasks_insert on public.tasks;
drop policy if exists tasks_update on public.tasks;
drop policy if exists tasks_delete on public.tasks;
create policy tasks_read   on public.tasks for select to authenticated using (true);
create policy tasks_insert on public.tasks for insert to authenticated
  with check (public.is_head() or created_by = auth.uid());
create policy tasks_update on public.tasks for update to authenticated
  using (public.is_head() or created_by = auth.uid() or assignee_id = auth.uid())
  with check (public.is_head() or created_by = auth.uid() or assignee_id = auth.uid());
create policy tasks_delete on public.tasks for delete to authenticated
  using (public.is_head() or created_by = auth.uid());

-- ---------- Cập nhật tức thời (realtime) ----------
do $$ begin
  begin alter publication supabase_realtime add table public.projects; exception when others then null; end;
  begin alter publication supabase_realtime add table public.tasks;    exception when others then null; end;
  begin alter publication supabase_realtime add table public.profiles; exception when others then null; end;
end $$;

-- ---------- Cài đặt mặc định ----------
insert into public.settings (key, value) values
 ('org', '{"org_name":"CÔNG TY ĐIỆN LỰC","dept_name":"PHÒNG GIẢI PHÁP CÔNG NGHỆ THÔNG TIN","place":"","head_title":"Trưởng phòng"}'::jsonb)
on conflict (key) do nothing;

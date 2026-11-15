-- Bản cập nhật 002: Email liên hệ + bảo vệ mật khẩu mặc định (phục vụ nhập danh sách người dùng từ Excel)
-- Dán vào Supabase > SQL Editor > Run. Chạy lại nhiều lần vẫn an toàn.
alter table public.profiles add column if not exists email text not null default '';

drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select to authenticated
  using (key <> 'secret' or public.is_head());

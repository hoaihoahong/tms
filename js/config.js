// ============================================================
// Cấu hình kết nối. Để TRỐNG = chạy chế độ DEMO (dữ liệu lưu tạm trong trình duyệt).
// Muốn dùng thật: điền 2 giá trị lấy từ Supabase > Project Settings > API
// (khóa "anon public" là khóa công khai, được phép để trong code; KHÔNG dán khóa "service_role").
// ============================================================
export const CONFIG = {
  SUPABASE_URL: 'https://moamjtorodcqbmntfufb.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_q7-xe6lhsa96HWtqOwKB7A_1r3pgdGx',   // khóa Publishable (công khai, an toàn)
  EMAIL_DOMAIN: 'tms.vn',  // tên đăng nhập "an" được lưu nội bộ thành an@tms.vn (không gửi email thật)
};

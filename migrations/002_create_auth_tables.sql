-- migrations/002_create_auth_tables.sql
-- Bảng auth_users lưu thông tin tài khoản đăng nhập vào hệ thống
CREATE TABLE IF NOT EXISTS auth_users (
  id SERIAL PRIMARY KEY, -- Khóa chính tự tăng
  username VARCHAR(150) NOT NULL UNIQUE, -- Username duy nhất
  password_hash VARCHAR(255) NOT NULL, -- Mật khẩu đã băm
  is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Cờ kích hoạt tài khoản
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() -- Thời điểm tạo, dùng timestamp có timezone
);

-- Bảng auth_tokens lưu từng JWT đã phát hành để kiểm soát thu hồi
CREATE TABLE IF NOT EXISTS auth_tokens (
  id SERIAL PRIMARY KEY, -- Khóa chính tự tăng
  token_jti CHAR(36) NOT NULL UNIQUE, -- Mã định danh token dạng UUID
  user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE, -- Foreign key tới bảng user
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Thời điểm phát hành
  expires_at TIMESTAMPTZ NOT NULL, -- Thời điểm hết hạn
  revoked_at TIMESTAMPTZ -- Thời điểm thu hồi nếu có
);

-- Index hỗ trợ truy vấn nhanh theo user_id
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens (user_id);
-- Index hỗ trợ tra cứu nhanh bằng jti
CREATE INDEX IF NOT EXISTS idx_auth_tokens_jti ON auth_tokens (token_jti);

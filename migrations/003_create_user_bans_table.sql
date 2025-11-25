-- User bans table for tracking banned/warned users
CREATE TABLE IF NOT EXISTS user_bans (
    id SERIAL PRIMARY KEY,
    user_seq VARCHAR(50) NOT NULL,
    ban_level VARCHAR(20) NOT NULL CHECK (ban_level IN ('banned', 'high_risk', 'warning')),
    reason TEXT,
    banned_by VARCHAR(100),
    banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unbanned_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_seq, is_active)
);

CREATE INDEX idx_user_bans_user_seq ON user_bans(user_seq);
CREATE INDEX idx_user_bans_is_active ON user_bans(is_active);
CREATE INDEX idx_user_bans_ban_level ON user_bans(ban_level);

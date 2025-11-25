-- Migration: Add status and ban_reason columns to transaction_users table
-- Date: 2025

-- Add status column with default 'normal'
ALTER TABLE transaction_users 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'normal';

-- Add ban_reason column (nullable)
ALTER TABLE transaction_users 
ADD COLUMN IF NOT EXISTS ban_reason VARCHAR(500);

-- Update existing users to have 'normal' status
UPDATE transaction_users 
SET status = 'normal' 
WHERE status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN transaction_users.status IS 'User status: normal, warning, or banned';
COMMENT ON COLUMN transaction_users.ban_reason IS 'Reason for warning or ban, if applicable';

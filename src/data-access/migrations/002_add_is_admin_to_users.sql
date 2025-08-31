-- Migration: Add isAdmin column to users table
-- Following architecture rule: camelCase column names to match entity fields

-- Add isAdmin column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Create index for admin queries (optional optimization)
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users("isAdmin") WHERE "isAdmin" = true;

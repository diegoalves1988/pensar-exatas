-- Add passwordHash column to users for local email/password authentication
ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordHash" text;
-- Optional: you may want a unique index on email in future, but keep minimal changes for now.

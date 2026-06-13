ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetToken" varchar(64);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetTokenExpiresAt" timestamp;

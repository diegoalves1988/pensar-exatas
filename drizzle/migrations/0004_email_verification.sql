ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" boolean NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verificationToken" varchar(64);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verificationTokenExpiresAt" timestamp;

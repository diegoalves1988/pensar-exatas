ALTER TABLE "questions" ADD COLUMN "choices" jsonb;
ALTER TABLE "questions" ADD COLUMN "correctChoice" integer;
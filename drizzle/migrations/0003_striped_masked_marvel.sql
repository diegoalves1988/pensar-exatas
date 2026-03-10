ALTER TABLE "questions" ADD COLUMN "choices" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "correctChoice" integer;
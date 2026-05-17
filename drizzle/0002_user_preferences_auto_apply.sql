ALTER TABLE "user_preferences"
  ADD COLUMN IF NOT EXISTS "auto_apply" boolean NOT NULL DEFAULT false;

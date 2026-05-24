CREATE TABLE IF NOT EXISTS "rate_limits" (
  "user_id"       uuid        NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "bucket"        text        NOT NULL,
  "window_start"  timestamptz NOT NULL,
  "hits"          integer     NOT NULL DEFAULT 0,
  "updated_at"    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "rate_limits_pk" UNIQUE ("user_id", "bucket", "window_start")
);

CREATE INDEX IF NOT EXISTS "rate_limits_window_idx"
  ON "rate_limits" ("window_start");

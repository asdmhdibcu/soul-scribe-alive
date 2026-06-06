ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS intents jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_tone text;
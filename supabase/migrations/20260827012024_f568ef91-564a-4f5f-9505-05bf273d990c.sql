-- 1. Drop legacy tables
DROP TABLE IF EXISTS public.marketplace CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.coins_history CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.photos CASCADE;
DROP TABLE IF EXISTS public.diary_entries CASCADE;

-- 2. moments
CREATE TABLE public.moments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  captured_at  timestamptz NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('voice','text','photo')),
  body_enc     text,
  audio_path   text,
  photo_path   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX moments_user_captured_idx ON public.moments (user_id, captured_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moments TO authenticated;
GRANT ALL ON public.moments TO service_role;
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;
CREATE POLICY moments_select ON public.moments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY moments_insert ON public.moments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY moments_update ON public.moments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY moments_delete ON public.moments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 3. days
CREATE TABLE public.days (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date          date NOT NULL,
  rendered_enc  text,
  mood_enc      text,
  energy_enc    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.days TO authenticated;
GRANT ALL ON public.days TO service_role;
ALTER TABLE public.days ENABLE ROW LEVEL SECURITY;
CREATE POLICY days_select ON public.days FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY days_insert ON public.days FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY days_update ON public.days FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY days_delete ON public.days FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 4. threads
CREATE TABLE public.threads (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_enc      text NOT NULL,
  kind_enc       text,
  state          text NOT NULL DEFAULT 'warm' CHECK (state IN ('warm','quiet')),
  first_seen     timestamptz NOT NULL,
  last_seen      timestamptz NOT NULL,
  mention_count  int NOT NULL DEFAULT 1
);
CREATE INDEX threads_user_last_seen_idx ON public.threads (user_id, last_seen DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.threads TO authenticated;
GRANT ALL ON public.threads TO service_role;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY threads_select ON public.threads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY threads_insert ON public.threads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY threads_update ON public.threads FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY threads_delete ON public.threads FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 5. thread_mentions
CREATE TABLE public.thread_mentions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  moment_id    uuid NOT NULL REFERENCES public.moments(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  captured_at  timestamptz NOT NULL,
  quote_enc    text NOT NULL
);
CREATE INDEX thread_mentions_thread_idx ON public.thread_mentions (thread_id, captured_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thread_mentions TO authenticated;
GRANT ALL ON public.thread_mentions TO service_role;
ALTER TABLE public.thread_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY thread_mentions_select ON public.thread_mentions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY thread_mentions_insert ON public.thread_mentions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY thread_mentions_update ON public.thread_mentions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY thread_mentions_delete ON public.thread_mentions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 6. briefs
CREATE TABLE public.briefs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  for_date    date NOT NULL,
  items_enc   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  opened_at   timestamptz,
  UNIQUE (user_id, for_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefs TO authenticated;
GRANT ALL ON public.briefs TO service_role;
ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY briefs_select ON public.briefs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY briefs_insert ON public.briefs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY briefs_update ON public.briefs FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY briefs_delete ON public.briefs FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 7. user_keys
CREATE TABLE public.user_keys (
  user_id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wrapped_by_password text NOT NULL,
  wrapped_by_recovery text NOT NULL,
  kdf_salt            text NOT NULL,
  kdf_iterations      int NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_keys TO authenticated;
GRANT ALL ON public.user_keys TO service_role;
ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_keys_select ON public.user_keys FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_keys_insert ON public.user_keys FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY user_keys_update ON public.user_keys FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY user_keys_delete ON public.user_keys FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 8. user_prefs
CREATE TABLE public.user_prefs (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  brief_hour    int NOT NULL DEFAULT 7,
  timezone      text NOT NULL DEFAULT 'Europe/London',
  brief_email   boolean NOT NULL DEFAULT true,
  mood_enabled  boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_prefs TO authenticated;
GRANT ALL ON public.user_prefs TO service_role;
ALTER TABLE public.user_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_prefs_select ON public.user_prefs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_prefs_insert ON public.user_prefs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY user_prefs_update ON public.user_prefs FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY user_prefs_delete ON public.user_prefs FOR DELETE TO authenticated USING (user_id = auth.uid());
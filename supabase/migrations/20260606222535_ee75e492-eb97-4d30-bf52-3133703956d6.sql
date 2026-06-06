CREATE TABLE public.draft_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_step TEXT NOT NULL DEFAULT 'mood',
  mood_data JSONB,
  spark_cards JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  voice_transcript TEXT,
  one_sentence TEXT,
  one_question_answer JSONB,
  personal_notes TEXT,
  user_voice_story TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.draft_sessions TO authenticated;
GRANT ALL ON public.draft_sessions TO service_role;

ALTER TABLE public.draft_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY draft_sessions_owner_all ON public.draft_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_draft_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_draft_sessions_updated_at
  BEFORE UPDATE ON public.draft_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_draft_sessions_updated_at();
-- Ticket 13: which brief items the person marked "this was useful" (item
-- positions only; the brief itself stays encrypted in items_enc).
ALTER TABLE public.briefs ADD COLUMN IF NOT EXISTS useful int[] NOT NULL DEFAULT '{}';

-- Ticket 17: at most one Coach line in the morning brief, switchable.
ALTER TABLE public.user_prefs ADD COLUMN IF NOT EXISTS coach_in_brief boolean NOT NULL DEFAULT true;

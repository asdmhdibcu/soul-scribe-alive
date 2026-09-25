-- Ticket 14: the reminder email is sent at most once per local day.
ALTER TABLE public.user_prefs ADD COLUMN IF NOT EXISTS last_brief_email_on date;

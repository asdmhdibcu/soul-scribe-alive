-- Ticket 18: the sign-up profile, encrypted on the device.
ALTER TABLE public.user_prefs ADD COLUMN IF NOT EXISTS profile_enc text;

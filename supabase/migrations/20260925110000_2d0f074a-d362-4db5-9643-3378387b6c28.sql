-- Ticket 08: bring-your-own AI key. The key is encrypted on the device with
-- the diary's master key; the server only ever stores ciphertext.
ALTER TABLE public.user_prefs ADD COLUMN IF NOT EXISTS ai_provider text;
ALTER TABLE public.user_prefs ADD COLUMN IF NOT EXISTS ai_model text;
ALTER TABLE public.user_prefs ADD COLUMN IF NOT EXISTS ai_key_enc text;

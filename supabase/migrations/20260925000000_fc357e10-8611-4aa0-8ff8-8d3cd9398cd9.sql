-- Recovery without a session: the server stores a hash of a verifier derived
-- from the recovery code (never the code or any key), so a person who has
-- forgotten their password can prove they hold the code and reset it.
ALTER TABLE public.user_keys ADD COLUMN IF NOT EXISTS recovery_verifier_hash text;

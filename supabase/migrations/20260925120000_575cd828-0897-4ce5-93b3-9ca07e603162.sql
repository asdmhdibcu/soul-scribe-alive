-- Ticket 09: silent filing. sorted_at marks moments already filed into
-- threads; area_enc is the encrypted work/life tag.
ALTER TABLE public.moments ADD COLUMN IF NOT EXISTS sorted_at timestamptz;
ALTER TABLE public.moments ADD COLUMN IF NOT EXISTS area_enc text;
CREATE INDEX IF NOT EXISTS moments_unsorted_idx ON public.moments (user_id, captured_at) WHERE sorted_at IS NULL;
-- Ticket 10: a person can hide an intention (hidden is not "failed").
ALTER TABLE public.threads ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
-- Ticket 11: text read from an attached file on the device, encrypted.
ALTER TABLE public.moment_files ADD COLUMN IF NOT EXISTS text_enc text;

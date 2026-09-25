-- Ticket 16: the evening record of a day (the person's own words in time
-- order), kept apart from the reflection session's page in rendered_enc.
ALTER TABLE public.days ADD COLUMN IF NOT EXISTS review_enc text;

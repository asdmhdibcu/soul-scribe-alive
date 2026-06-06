DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.marketplace CASCADE;
ALTER TABLE public.diary_entries DROP COLUMN IF EXISTS price;
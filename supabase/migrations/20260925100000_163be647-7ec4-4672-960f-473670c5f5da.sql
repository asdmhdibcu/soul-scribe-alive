-- Ticket 05: photos and files attached to moments.
-- Content and original file names are encrypted on the device; the server
-- stores ciphertext, an opaque storage path and the encrypted size.
ALTER TABLE public.moments DROP CONSTRAINT IF EXISTS moments_kind_check;
ALTER TABLE public.moments
  ADD CONSTRAINT moments_kind_check CHECK (kind IN ('voice','text','photo','file'));

CREATE TABLE IF NOT EXISTS public.moment_files (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id   uuid NOT NULL REFERENCES public.moments(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path        text NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('photo','file','audio')),
  name_enc    text,
  mime_enc    text,
  size_bytes  bigint NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moment_files_moment_idx ON public.moment_files (moment_id);
CREATE INDEX IF NOT EXISTS moment_files_user_idx ON public.moment_files (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moment_files TO authenticated;
GRANT ALL ON public.moment_files TO service_role;
ALTER TABLE public.moment_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS moment_files_select ON public.moment_files;
DROP POLICY IF EXISTS moment_files_insert ON public.moment_files;
DROP POLICY IF EXISTS moment_files_update ON public.moment_files;
DROP POLICY IF EXISTS moment_files_delete ON public.moment_files;
CREATE POLICY moment_files_select ON public.moment_files FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY moment_files_insert ON public.moment_files FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY moment_files_update ON public.moment_files FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY moment_files_delete ON public.moment_files FOR DELETE TO authenticated USING (user_id = auth.uid());


-- 1. ACHIEVEMENTS: remove broad ALL policy, allow only SELECT for owner
DROP POLICY IF EXISTS achievements_owner_all ON public.achievements;
CREATE POLICY achievements_owner_select ON public.achievements
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- INSERT/UPDATE/DELETE intentionally omitted: only service_role (server) can write.

-- 2. COINS_HISTORY: same pattern
DROP POLICY IF EXISTS coins_history_owner_all ON public.coins_history;
CREATE POLICY coins_history_owner_select ON public.coins_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3. TRANSACTIONS: explicitly deny UPDATE and DELETE for clarity
CREATE POLICY transactions_no_update ON public.transactions
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY transactions_no_delete ON public.transactions
  FOR DELETE TO authenticated USING (false);

-- 4. STORAGE: drop duplicate policies on alive-media bucket
DROP POLICY IF EXISTS alive_media_owner_select ON storage.objects;
DROP POLICY IF EXISTS alive_media_owner_insert ON storage.objects;
DROP POLICY IF EXISTS alive_media_owner_update ON storage.objects;
DROP POLICY IF EXISTS alive_media_owner_delete ON storage.objects;

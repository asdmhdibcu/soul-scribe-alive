
-- Revoke EXECUTE on handle_new_user: it's only used by the auth trigger
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Storage policies for alive-media (private bucket, user-scoped folders by user_id)
CREATE POLICY "alive_media_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'alive-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "alive_media_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'alive-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "alive_media_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'alive-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "alive_media_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'alive-media' AND auth.uid()::text = (storage.foldername(name))[1]);

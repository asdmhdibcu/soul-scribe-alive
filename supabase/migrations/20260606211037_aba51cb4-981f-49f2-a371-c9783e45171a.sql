-- Users can manage their own files in alive-media bucket (path begins with their user id)
CREATE POLICY "alive_media_owner_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'alive-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "alive_media_owner_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'alive-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "alive_media_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'alive-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "alive_media_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'alive-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
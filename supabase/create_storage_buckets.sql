-- NexusPay Storage buckets
-- Run once in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/psqjqxsxjeiduuyhkcgt/sql/new
--
-- Safe to re-run (idempotent).

-- ---------------------------------------------------------------------------
-- 1) brand-assets — logo, favicon, marketing images (public read)
--    Upload path example: logo/logo.png
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read brand assets" ON storage.objects;

CREATE POLICY "Public read brand assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'brand-assets');

-- ---------------------------------------------------------------------------
-- 2) product-images — marketplace seller photos (public read, seller upload)
--    Upload path example: {user_id}/{product_id}/photo.jpg
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers update product images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers delete product images" ON storage.objects;

CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- First folder must match the signed-in user's id
CREATE POLICY "Sellers upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Sellers update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Sellers delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Verify
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id IN ('brand-assets', 'product-images')
ORDER BY id;

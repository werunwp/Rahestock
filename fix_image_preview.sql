-- Fix image preview issue by creating proper storage policies
-- Run this in Supabase SQL Editor: https://supabase.rahedeen.com/project/default/sql/new

-- 1. Create policy for public read access to product-images bucket
CREATE POLICY "Public read access for product-images" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

-- 2. Create policy for authenticated users to upload to product-images bucket
CREATE POLICY "Authenticated users can upload to product-images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- 3. Create policy for authenticated users to update files in product-images bucket
CREATE POLICY "Authenticated users can update product-images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- 4. Create policy for authenticated users to delete files in product-images bucket
CREATE POLICY "Authenticated users can delete product-images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- 5. Test the policies by checking if we can access the bucket
SELECT 'Storage policies created successfully' as status;
SELECT name, id FROM storage.buckets WHERE id = 'product-images';

-- 6. Check existing files in the bucket
SELECT name, id, bucket_id, created_at FROM storage.objects WHERE bucket_id = 'product-images';

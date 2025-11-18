-- Create bucket for Odu images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'odu-images',
  'odu-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for odu-images bucket

-- Admins and Colaboradores can upload images
CREATE POLICY "Admins and Colaboradores can upload odu images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'odu-images' 
  AND has_colaborador_role(auth.uid())
);

-- Admins and Colaboradores can update images
CREATE POLICY "Admins and Colaboradores can update odu images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'odu-images' 
  AND has_colaborador_role(auth.uid())
);

-- Admins and Colaboradores can delete images
CREATE POLICY "Admins and Colaboradores can delete odu images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'odu-images' 
  AND has_colaborador_role(auth.uid())
);

-- Anyone can view images (bucket is public)
CREATE POLICY "Anyone can view odu images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'odu-images');
-- Storage Setup for atCollege
-- Run this in Supabase SQL Editor to set up storage buckets

-- Note: You may need to create the buckets via the Supabase Dashboard instead
-- as storage bucket creation via SQL has limitations.

-- If you need to create buckets programmatically, use Supabase client:
-- supabase.storage.createBucket('uploads', { public: true })
-- supabase.storage.createBucket('avatars', { public: true })
-- supabase.storage.createBucket('private', { public: false })

-- Storage policies for 'uploads' bucket (public)
CREATE POLICY "Anyone can view uploads" ON storage.objects
    FOR SELECT USING (bucket_id = 'uploads');

CREATE POLICY "Authenticated users can upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'uploads' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update own uploads" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'uploads' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own uploads" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'uploads' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for 'avatars' bucket (public)
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for 'private' bucket
CREATE POLICY "Users can view own private files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'private' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can upload private files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'private' AND
        auth.role() = 'authenticated' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own private files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'private' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own private files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'private' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );


-- 0004_storage_note_images.sql
-- The note-images bucket and its per-user folder isolation.
--
-- The app uploads to `<user_id>/<filename>` from two places (the attachment
-- picker in NoteForm and inline images in the BlockNote editor), then calls
-- getPublicUrl to render them.
--
-- Safe to re-run.

insert into storage.buckets (id, name, public)
values ('note-images', 'note-images', true)
on conflict (id) do nothing;

-- NOTE ON `public = true`:
-- Reads are deliberately unauthenticated, because getPublicUrl produces a plain
-- URL that <img> and next/image fetch without a session. The practical effect
-- is that anyone holding an image URL can view it. Paths are not guessable, but
-- they are not secret either — this is URL-level privacy, not access control.
-- Writes remain locked down by the policies below.
-- To make images genuinely private instead, set public = false and switch the
-- app to createSignedUrl.

-- Write policies key off the first path segment being the caller's user id,
-- which is what confines each account to its own folder.

drop policy if exists "Users can upload to their own folder" on storage.objects;
create policy "Users can upload to their own folder"
    on storage.objects for insert
    to authenticated
    with check (
        bucket_id = 'note-images'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

drop policy if exists "Users can update their own images" on storage.objects;
create policy "Users can update their own images"
    on storage.objects for update
    to authenticated
    using (
        bucket_id = 'note-images'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

drop policy if exists "Users can delete their own images" on storage.objects;
create policy "Users can delete their own images"
    on storage.objects for delete
    to authenticated
    using (
        bucket_id = 'note-images'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

-- Explicit public read, matching public = true above.
drop policy if exists "Note images are publicly readable" on storage.objects;
create policy "Note images are publicly readable"
    on storage.objects for select
    to public
    using (bucket_id = 'note-images');

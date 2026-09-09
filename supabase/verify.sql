-- verify.sql
-- Read-only checks. Run after the migrations; every row should report PASS.
-- Nothing here modifies the database.

with checks as (
    select 'notes table exists' as check_name,
           exists (select 1 from information_schema.tables
                   where table_schema = 'public' and table_name = 'notes') as ok
    union all
    select 'all 12 columns present',
           (select count(*) from information_schema.columns
            where table_schema = 'public' and table_name = 'notes'
              and column_name in ('id','user_id','title','content','image_url',
                                  'is_favorite','tags','created_at','updated_at',
                                  'deleted_at','is_public','public_slug')) = 12
    union all
    select 'RLS enabled on notes',
           (select relrowsecurity from pg_class where oid = 'public.notes'::regclass)
    union all
    select 'four RLS policies on notes',
           (select count(*) from pg_policies
            where schemaname = 'public' and tablename = 'notes') >= 4
    union all
    select 'notes in realtime publication',
           exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime'
                     and schemaname = 'public' and tablename = 'notes')
    union all
    select 'replica identity FULL (needed for DELETE events)',
           (select relreplident from pg_class where oid = 'public.notes'::regclass) = 'f'
    union all
    select 'note-images bucket exists',
           exists (select 1 from storage.buckets where id = 'note-images')
    union all
    -- Asserts the security property, not a headcount.
    --
    -- This used to require FOUR policies mentioning the bucket, which failed on
    -- a real project that was entirely correct: a bucket created through the
    -- Supabase dashboard has TWO (an INSERT and a SELECT, both folder-scoped),
    -- and that covers everything the app does — every upload path is unique, so
    -- nothing ever needs UPDATE, and nothing in the codebase calls .remove().
    --
    -- Counting policies was never the point. The property that matters is that
    -- a write cannot escape the caller's own folder, so that is what this tests:
    -- one folder-scoped write policy must exist, and no write policy may reach
    -- the bucket without pinning the folder.
    --
    -- Deliberately scoped to policies that NAME note-images. Sweeping every
    -- policy on storage.objects would flag unrelated buckets in the same
    -- project — which is the same over-reach being fixed here.
    --
    -- SELECT is intentionally not checked: the bucket is public = true and the
    -- app reads through getPublicUrl, which bypasses RLS entirely (see the
    -- note on public buckets in README.md).
    select 'note-images writes are folder-scoped (0004)',
           exists (
               select 1 from pg_policies
               where schemaname = 'storage' and tablename = 'objects'
                 and cmd in ('INSERT', 'ALL')
                 and coalesce(with_check, '') like '%note-images%'
                 and coalesce(with_check, '') like '%foldername%'
           )
           and not exists (
               -- The one way a write policy on this bucket can be too loose:
               -- it names the bucket but never pins the folder.
               select 1 from pg_policies
               where schemaname = 'storage' and tablename = 'objects'
                 and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
                 and coalesce(qual, '') || coalesce(with_check, '') like '%note-images%'
                 and coalesce(qual, '') || coalesce(with_check, '') not like '%foldername%'
           )
    union all
    select 'updated_at trigger installed',
           exists (select 1 from pg_trigger
                   where tgrelid = 'public.notes'::regclass
                     and tgname = 'notes_set_updated_at')
    union all
    select 'tags GIN index',
           exists (select 1 from pg_indexes
                   where schemaname = 'public' and indexname = 'notes_tags_idx')

    -- 0006 soft delete
    union all
    select 'soft-delete partial indexes (0006)',
           (select count(*) from pg_indexes
            where schemaname = 'public'
              and indexname in ('notes_live_idx','notes_trashed_idx')) = 2

    -- 0007 public sharing. These are the security-critical rows: if the slug
    -- index is missing two notes can share a URL, and if anon ever gains a
    -- direct grant on notes then PostgREST will serve the whole table.
    union all
    select 'public_slug is unique (0007)',
           exists (select 1 from pg_indexes
                   where schemaname = 'public' and indexname = 'notes_public_slug_key')
    union all
    select 'slug trigger installed (0007)',
           exists (select 1 from pg_trigger
                   where tgrelid = 'public.notes'::regclass
                     and tgname = 'notes_manage_public_slug')
    union all
    select 'get_public_note is SECURITY DEFINER (0007)',
           (select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'get_public_note')
    union all
    select 'get_public_note pins search_path (0007)',
           (select proconfig::text like '%search_path%'
            from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'get_public_note')
    union all
    select 'anon can call get_public_note (0007)',
           has_function_privilege('anon', 'public.get_public_note(text)', 'EXECUTE')
    union all
    -- This used to assert `not has_table_privilege('anon','public.notes','SELECT')`
    -- and failed on every real Supabase project, for a benign reason: Supabase
    -- grants SELECT on public tables to anon BY DESIGN and relies on RLS to
    -- decide which rows come back. The table grant is how PostgREST reaches the
    -- table at all; the policies are the security boundary. So the meaningful
    -- assertion is that no policy on `notes` is open to an unauthenticated
    -- caller — which is what this checks. A behavioural test is at the bottom
    -- of this file.
    select 'no notes policy is open to anon or public (0007)',
           not exists (select 1 from pg_policies
                       where schemaname = 'public' and tablename = 'notes'
                         and (roles && array['anon','public']::name[]))
    union all
    select 'no anon RLS policy on notes (0007)',
           not exists (select 1 from pg_policies
                       where schemaname = 'public' and tablename = 'notes'
                         and 'anon' = any(roles))

    -- 0008 full-text search and paging
    union all
    select 'search_vector is a generated column (0008)',
           (select is_generated = 'ALWAYS' from information_schema.columns
            where table_schema = 'public' and table_name = 'notes'
              and column_name = 'search_vector')
    union all
    select 'search GIN index (0008)',
           exists (select 1 from pg_indexes
                   where schemaname = 'public' and indexname = 'notes_search_idx')
    union all
    select 'one paging index per sort order (0008)',
           (select count(*) from pg_indexes
            where schemaname = 'public'
              and indexname in ('notes_live_page_idx','notes_live_updated_idx',
                                'notes_live_title_idx','notes_favorites_idx')) = 4
    union all
    select 'search_notes, count_notes and note_tags exist (0008)',
           (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public'
              and p.proname in ('search_notes','count_notes','note_tags','matching_notes')) = 4
    union all
    -- The important one. A definer function here would hand every caller the
    -- whole table; RLS only applies because these run as the invoker.
    select 'the search functions are SECURITY INVOKER, so RLS applies (0008)',
           (select bool_and(not prosecdef) from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public'
              and p.proname in ('search_notes','count_notes','note_tags','matching_notes'))
    union all
    select 'anon cannot execute search_notes (0008)',
           not has_function_privilege('anon',
               'public.search_notes(text,text,boolean,text,integer,integer)', 'EXECUTE')
    union all
    select 'note_search_text is IMMUTABLE, as the generated column requires (0008)',
           (select provolatile = 'i' from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'note_search_text')

    -- 0009 constraints
    union all
    select 'title and tag constraints exist (0009)',
           (select count(*) from pg_constraint
            where conrelid = 'public.notes'::regclass
              and conname in ('notes_title_length','notes_tags_count','notes_tag_shape')) = 3
    union all
    select 'those constraints are VALIDATED, not just NOT VALID (0009)',
           (select bool_and(convalidated) from pg_constraint
            where conrelid = 'public.notes'::regclass
              and conname in ('notes_title_length','notes_tags_count','notes_tag_shape'))
)
select case when ok then 'PASS' else 'FAIL' end as result, check_name
from checks
order by ok, check_name;


-- ---------------------------------------------------------------------------
-- Behavioural checks — run these separately, they change the session role.
--
-- 1. Prove anon really cannot read notes, rather than inferring it from grants
--    and policy text:
--
--       set local role anon;
--       select count(*) from public.notes;   -- must be 0
--       reset role;
--
-- 2. If "note-images writes are folder-scoped" fails, look at what your
--    project actually has before changing anything — a bucket created through
--    the dashboard has policies with different names and wording, and they may
--    be perfectly correct:
--
--       select policyname, cmd, roles, qual, with_check
--       from pg_policies
--       where schemaname = 'storage' and tablename = 'objects';
--
--    What matters is that writes to the note-images bucket are confined to the
--    caller's own folder — the shape 0004 writes as
--    `(storage.foldername(name))[1] = auth.uid()::text`. If yours does that
--    under any name, you are fine and 0004 has nothing to add.
--
--    Do NOT reach for 0004 to fix a policy that is too loose. Permissive
--    policies are combined with OR, so adding a strict one alongside a broad
--    one changes nothing — the broad one still lets the write through. Drop the
--    offending policy first.
-- ---------------------------------------------------------------------------

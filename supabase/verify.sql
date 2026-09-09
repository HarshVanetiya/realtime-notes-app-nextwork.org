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
    select 'storage policies for note-images',
           (select count(*) from pg_policies
            where schemaname = 'storage' and tablename = 'objects'
              and coalesce(qual, '') || coalesce(with_check, '') like '%note-images%') >= 4
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
    select 'anon CANNOT read the notes table directly (0007)',
           not has_table_privilege('anon', 'public.notes', 'SELECT')
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

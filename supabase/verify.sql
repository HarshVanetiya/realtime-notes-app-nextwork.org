-- verify.sql
-- Read-only checks. Run after the migrations; every row should report PASS.
-- Nothing here modifies the database.

with checks as (
    select 'notes table exists' as check_name,
           exists (select 1 from information_schema.tables
                   where table_schema = 'public' and table_name = 'notes') as ok
    union all
    select 'all 9 columns present',
           (select count(*) from information_schema.columns
            where table_schema = 'public' and table_name = 'notes'
              and column_name in ('id','user_id','title','content','image_url',
                                  'is_favorite','tags','created_at','updated_at')) = 9
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
)
select case when ok then 'PASS' else 'FAIL' end as result, check_name
from checks
order by ok, check_name;

-- 0003_notes_realtime.sql
-- Realtime delivery for public.notes.
--
-- The dashboard subscribes to postgres_changes with event '*' filtered on
-- user_id. Two things have to be true for that to work.
--
-- Safe to re-run.

-- 1. The table must be in the realtime publication.
do $$
begin
    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'notes'
    ) then
        alter publication supabase_realtime add table public.notes;
    end if;
end $$;

-- 2. REPLICA IDENTITY FULL.
--
-- This one is easy to miss. With the default replica identity, a DELETE only
-- carries the primary key in its WAL record. Realtime cannot then evaluate the
-- RLS policy (which tests user_id) against the deleted row, so it will not
-- deliver the DELETE event at all — notes would vanish on one tab and linger on
-- another until reload. FULL ships the whole old row so the policy can be
-- checked. It costs more WAL per write, which is the right trade here.
alter table public.notes replica identity full;

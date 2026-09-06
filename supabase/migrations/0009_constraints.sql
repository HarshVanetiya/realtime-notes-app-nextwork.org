-- 0009_constraints.sql
-- Move the limits the client enforces into the database.
--
-- Until now the 200-character title cap and the 8-tag cap lived only in
-- components/NoteForm.tsx and lib/note-tags.ts. Supabase exposes PostgREST
-- directly, so anyone holding the anon key could POST a megabyte title or a
-- thousand tags to /rest/v1/notes and RLS would happily allow it — it checks
-- *who* is writing, never *what*. A client-side limit is a user-interface
-- affordance, not a constraint.
--
-- The limits below mirror the client exactly:
--     title      1..200 characters   (NoteForm TITLE_MAX_LENGTH)
--     tags       at most 8           (note-tags MAX_TAGS)
--     each tag   1..24 characters    (note-tags MAX_TAG_LENGTH)
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- Why NOT VALID first
--
-- A plain ADD CONSTRAINT scans the whole table and fails outright if a single
-- existing row violates it — on a database that has been in use, that is a
-- migration that simply will not apply, with an error naming the constraint
-- rather than the data. NOT VALID applies the rule to every future write
-- immediately while leaving existing rows alone, so the schema change always
-- succeeds. VALIDATE then checks the backlog separately, and if it fails you
-- still have a working database and a clear question to answer.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Per-element tag length needs a helper, because a CHECK constraint cannot
-- contain a subquery — Postgres rejects `check (not exists (select ... from
-- unnest(tags)))` outright with "cannot use subquery in check constraint".
-- Wrapping the same logic in an IMMUTABLE function is the supported way to
-- express it, and it is genuinely immutable: a pure function of its argument.
--
-- The trade-off worth knowing: because the constraint calls a function,
-- changing the function later does not re-check existing rows. If these limits
-- ever move, re-validate explicitly.
-- ---------------------------------------------------------------------------

create or replace function public.tags_within_limits(p_tags text[])
returns boolean
language sql
immutable
set search_path = pg_catalog, pg_temp
as $fn$
    -- Null passes. 0005 declared tags NOT NULL DEFAULT '{}', so in practice
    -- there are none — but a CHECK that returns null is treated as satisfied
    -- anyway, and spelling it out means the function's own contract does not
    -- depend on that piece of three-valued-logic trivia.
    select p_tags is null
        or coalesce(
            (select bool_and(char_length(t) between 1 and 24) from unnest(p_tags) as t),
            true   -- an empty array has no elements to violate anything
        )
$fn$;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.notes'::regclass and conname = 'notes_title_length'
    ) then
        alter table public.notes
            add constraint notes_title_length
            check (char_length(title) between 1 and 200) not valid;
    end if;

    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.notes'::regclass and conname = 'notes_tags_count'
    ) then
        alter table public.notes
            add constraint notes_tags_count
            check (coalesce(array_length(tags, 1), 0) <= 8) not valid;
    end if;

    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.notes'::regclass and conname = 'notes_tag_shape'
    ) then
        alter table public.notes
            add constraint notes_tag_shape
            check (public.tags_within_limits(tags)) not valid;
    end if;
end $$;

-- ---------------------------------------------------------------------------
-- Validate the existing rows.
--
-- If one of these fails, the constraint stays in place as NOT VALID — new
-- writes are still checked — and the offending rows are yours to fix. To find
-- them:
--
--   select id, char_length(title) from public.notes where char_length(title) not between 1 and 200;
--   select id, array_length(tags, 1) from public.notes where array_length(tags, 1) > 8;
--
-- Then re-run this file; the DO block above will skip re-adding and the
-- VALIDATE statements will succeed.
-- ---------------------------------------------------------------------------

alter table public.notes validate constraint notes_title_length;
alter table public.notes validate constraint notes_tags_count;
alter table public.notes validate constraint notes_tag_shape;

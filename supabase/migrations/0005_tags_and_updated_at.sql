-- 0005_tags_and_updated_at.sql
-- Tags, sorting support, and a maintained updated_at.
--
-- This is the migration the "Add tags and sort so notes can actually be found"
-- change depends on. Until it runs, reads degrade safely (the client reads
-- `note.tags ?? []`) but SAVING A NOTE FAILS, because the insert and update
-- payloads both include `tags`.
--
-- Safe to re-run.

alter table public.notes
    add column if not exists tags       text[] not null default '{}',
    add column if not exists updated_at timestamptz not null default now();

-- Tag filtering uses array containment; GIN is the index type for that.
create index if not exists notes_tags_idx
    on public.notes using gin (tags);

-- Supports the "Recently edited" sort without a full scan.
create index if not exists notes_user_id_updated_at_idx
    on public.notes (user_id, updated_at desc);

-- updated_at is maintained in the database rather than by the client, so it
-- stays honest no matter which path performed the write.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end $$;

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
    before update on public.notes
    for each row execute function public.set_updated_at();

-- Rows that predate this migration keep created_at as their updated_at, which
-- is what the client's `updated_at ?? created_at` fallback already assumes.
update public.notes
set updated_at = created_at
where updated_at is null;

-- NO NEW RLS POLICIES ARE NEEDED.
-- The policies in 0002 are row-level, not column-level, so they already cover
-- every column added here. Realtime likewise needs no change: postgres_changes
-- ships the whole row, so the new fields flow into the existing subscription.

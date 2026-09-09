-- 0001_notes_table.sql
-- The notes table, as the app originally shipped.
--
-- Columns here are exactly what the application reads and writes; tags and
-- updated_at arrive later in 0005 so this sequence replays the real history.
--
-- Safe to re-run.

create extension if not exists "pgcrypto";  -- gen_random_uuid()

create table if not exists public.notes (
    id          uuid primary key default gen_random_uuid(),

    -- Every row belongs to exactly one auth user. ON DELETE CASCADE means
    -- deleting the account takes its notes with it rather than orphaning them.
    user_id     uuid not null references auth.users (id) on delete cascade,

    title       text not null,
    content     text,          -- BlockNote JSON document (legacy rows hold HTML)
    image_url   text,          -- public URL into the note-images bucket
    is_favorite boolean not null default false,
    created_at  timestamptz not null default now()
);

-- The dashboard lists a user's notes newest-first; this serves that directly.
create index if not exists notes_user_id_created_at_idx
    on public.notes (user_id, created_at desc);

comment on table public.notes is
    'User notes. Row-level security in 0002 restricts every operation to the owner.';

-- 0011_bookmarks.sql
-- The bookmark drawer: folders and the bookmarks inside them.
--
-- Two tables rather than a `folder text` column on bookmarks. A folder is a
-- thing the user names, renames and orders, and an empty one must be able to
-- exist. A text column gives none of that: a rename rewrites every row in the
-- folder, an empty folder has no row to live in, and ordering has nowhere to go.
--
-- Written by two clients — the app and the browser extension — both directly
-- against PostgREST under RLS. There is no API in between, so everything the
-- database can check, it checks: URL scheme, lengths, folder ownership, and
-- one row per URL.
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- Folders
-- ---------------------------------------------------------------------------

create table if not exists public.bookmark_folders (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references auth.users(id) on delete cascade,
    name       text not null,
    position   integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists bookmark_folders_user_position_idx
    on public.bookmark_folders (user_id, position, created_at);

alter table public.bookmark_folders enable row level security;

drop policy if exists "Users can read their own bookmark folders" on public.bookmark_folders;
create policy "Users can read their own bookmark folders"
    on public.bookmark_folders for select
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists "Users can create their own bookmark folders" on public.bookmark_folders;
create policy "Users can create their own bookmark folders"
    on public.bookmark_folders for insert
    to authenticated
    with check (auth.uid() = user_id);

drop policy if exists "Users can update their own bookmark folders" on public.bookmark_folders;
create policy "Users can update their own bookmark folders"
    on public.bookmark_folders for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own bookmark folders" on public.bookmark_folders;
create policy "Users can delete their own bookmark folders"
    on public.bookmark_folders for delete
    to authenticated
    using (auth.uid() = user_id);

drop trigger if exists bookmark_folders_set_updated_at on public.bookmark_folders;
create trigger bookmark_folders_set_updated_at
    before update on public.bookmark_folders
    for each row execute function public.set_updated_at();

-- Owner lookup used by the cross-table check on bookmarks below. RLS on each
-- table separately cannot say "this folder belongs to the same user as this
-- bookmark"; without it a user could file a bookmark under someone else's
-- folder id if they guessed it. `security definer` so the check sees the
-- folder row regardless of the caller's RLS view; `search_path` pinned for
-- the same reason 0007 pins it.
create or replace function public.bookmark_folder_owner(fid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
    select user_id from public.bookmark_folders where id = fid
$$;

revoke all on function public.bookmark_folder_owner(uuid) from public;
grant execute on function public.bookmark_folder_owner(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Bookmarks
-- ---------------------------------------------------------------------------

create table if not exists public.bookmarks (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    -- `set null`, not cascade: deleting a folder tips its bookmarks back to the
    -- top level. Losing a folder should never lose what was in it.
    folder_id   uuid references public.bookmark_folders(id) on delete set null,
    title       text not null,
    url         text not null,
    favicon_url text,
    position    integer not null default 0,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index if not exists bookmarks_user_folder_position_idx
    on public.bookmarks (user_id, folder_id, position, created_at);

-- Saving the same page twice is a no-op, not a second tile. The extension
-- relies on this: its one-click save is `on conflict (user_id, url) do
-- nothing` and reports "already saved" from the row count.
create unique index if not exists bookmarks_user_url_key
    on public.bookmarks (user_id, url);

alter table public.bookmarks enable row level security;

drop policy if exists "Users can read their own bookmarks" on public.bookmarks;
create policy "Users can read their own bookmarks"
    on public.bookmarks for select
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists "Users can create their own bookmarks" on public.bookmarks;
create policy "Users can create their own bookmarks"
    on public.bookmarks for insert
    to authenticated
    with check (auth.uid() = user_id);

drop policy if exists "Users can update their own bookmarks" on public.bookmarks;
create policy "Users can update their own bookmarks"
    on public.bookmarks for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own bookmarks" on public.bookmarks;
create policy "Users can delete their own bookmarks"
    on public.bookmarks for delete
    to authenticated
    using (auth.uid() = user_id);

drop trigger if exists bookmarks_set_updated_at on public.bookmarks;
create trigger bookmarks_set_updated_at
    before update on public.bookmarks
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Constraints. Same shape as 0009: added NOT VALID then validated, so a re-run
-- against a populated table neither fails nor skips the check.
-- ---------------------------------------------------------------------------

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'bookmark_folders_name_length') then
        alter table public.bookmark_folders
            add constraint bookmark_folders_name_length
            check (char_length(btrim(name)) between 1 and 60) not valid;
    end if;

    if not exists (select 1 from pg_constraint where conname = 'bookmarks_title_length') then
        alter table public.bookmarks
            add constraint bookmarks_title_length
            check (char_length(btrim(title)) between 1 and 200) not valid;
    end if;

    -- http(s) only. chrome://, file://, about:, javascript: and data: are all
    -- things the extension can see in a tab, and none of them belong in a
    -- bookmark the app will later render as a link.
    if not exists (select 1 from pg_constraint where conname = 'bookmarks_url_shape') then
        alter table public.bookmarks
            add constraint bookmarks_url_shape
            check (char_length(url) <= 2048 and url ~* '^https?://[^[:space:]]+$') not valid;
    end if;

    if not exists (select 1 from pg_constraint where conname = 'bookmarks_favicon_shape') then
        alter table public.bookmarks
            add constraint bookmarks_favicon_shape
            check (favicon_url is null
                   or (char_length(favicon_url) <= 2048
                       and favicon_url ~* '^https?://[^[:space:]]+$')) not valid;
    end if;

    if not exists (select 1 from pg_constraint where conname = 'bookmarks_folder_same_owner') then
        alter table public.bookmarks
            add constraint bookmarks_folder_same_owner
            check (folder_id is null or public.bookmark_folder_owner(folder_id) = user_id) not valid;
    end if;
end $$;

alter table public.bookmark_folders validate constraint bookmark_folders_name_length;
alter table public.bookmarks validate constraint bookmarks_title_length;
alter table public.bookmarks validate constraint bookmarks_url_shape;
alter table public.bookmarks validate constraint bookmarks_favicon_shape;
alter table public.bookmarks validate constraint bookmarks_folder_same_owner;

-- ---------------------------------------------------------------------------
-- Realtime, exactly as 0003 does it for notes. FULL replica identity is what
-- lets a DELETE carry user_id so RLS can pass the event on to the drawer.
-- ---------------------------------------------------------------------------

do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public' and tablename = 'bookmark_folders'
    ) then
        alter publication supabase_realtime add table public.bookmark_folders;
    end if;

    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public' and tablename = 'bookmarks'
    ) then
        alter publication supabase_realtime add table public.bookmarks;
    end if;
end $$;

alter table public.bookmark_folders replica identity full;
alter table public.bookmarks replica identity full;

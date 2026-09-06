-- 0006_public_sharing.sql
-- Publishing a single note at an unguessable URL.
--
-- READ THIS BEFORE RUNNING IT. Everything else in this project fails safe; a
-- mistake here exposes other people's notes.
--
-- THE APPROACH THIS DELIBERATELY REJECTS:
--   an anon SELECT policy on public.notes where is_public = true.
-- Even with that predicate exactly right, PostgREST would happily serve
--   /rest/v1/notes?select=user_id&is_public=eq.true
-- which leaks the owner's UUID for every shared note, and
--   /rest/v1/notes?select=*&is_public=eq.true
-- which enumerates every public note on the platform. The predicate is correct
-- and the outcome is still a data leak, because the policy grants access to the
-- TABLE and the caller chooses the columns and the filter.
--
-- WHAT THIS DOES INSTEAD:
--   no anon policy at all. public.notes stays sealed to anon. A single
--   security definer function returns a fixed column list for one exact slug.
--   Column choice moves from the caller to the function, so leaking user_id
--   becomes impossible rather than merely unlikely, and without a slug there is
--   nothing to enumerate.
--
-- Safe to re-run.

alter table public.notes
    add column if not exists is_public   boolean not null default false,
    add column if not exists public_slug text;

-- Partial, because only shared notes carry a slug and NULLs should not collide.
create unique index if not exists notes_public_slug_key
    on public.notes (public_slug)
    where public_slug is not null;

-- SLUGS ARE MINTED HERE, NEVER BY THE CLIENT.
-- 12 random bytes is 96 bits, URL-safe base64, ~16 characters. Note ids are not
-- used: they appear in the owner's own URLs and would make every private note's
-- address guessable from a shared one.
--
-- Turning sharing off NULLs the slug, so revocation is real: re-sharing later
-- mints a different URL rather than reviving the old one, and any link already
-- pasted somewhere stops working.
create or replace function public.manage_public_slug()
returns trigger
language plpgsql
as $$
begin
    if new.is_public then
        if new.public_slug is null then
            new.public_slug := replace(replace(replace(
                encode(gen_random_bytes(12), 'base64'),
                '+', '-'), '/', '_'), '=', '');
        end if;
    else
        new.public_slug := null;
    end if;
    return new;
end $$;

drop trigger if exists notes_manage_public_slug on public.notes;
create trigger notes_manage_public_slug
    before insert or update on public.notes
    for each row execute function public.manage_public_slug();

-- THE ONLY PUBLIC READ PATH.
-- security definer: runs as the owner, so it sees past RLS. That is the whole
-- point, and also why the column list is fixed and the filter is not the
-- caller's to choose.
-- set search_path: without this, a definer function can be hijacked by a caller
-- who puts their own `notes` earlier on the path. Not optional.
create or replace function public.get_public_note(p_slug text)
returns table (
    id         uuid,
    title      text,
    content    text,
    image_url  text,
    tags       text[],
    created_at timestamptz,
    updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select n.id, n.title, n.content, n.image_url, n.tags, n.created_at, n.updated_at
    from public.notes n
    where n.public_slug = p_slug
      and n.is_public = true
      and n.deleted_at is null   -- a trashed note must stop being published
$$;

-- Grant execute narrowly and explicitly.
revoke all on function public.get_public_note(text) from public;
grant execute on function public.get_public_note(text) to anon, authenticated;

comment on function public.get_public_note(text) is
    'Public read path for shared notes. Fixed column list by design: never add user_id.';

-- NOT ADDED, ON PURPOSE:
--   create policy ... on public.notes for select to anon using (is_public);
-- See the header. If you ever add it, the function below stops being the only
-- way in and the guarantees above no longer hold.

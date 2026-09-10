-- 0010_user_preferences.sql
-- Per-account appearance and layout settings: accent, theme, grid density,
-- tag colours and tag labels.
--
-- One row per user, one jsonb blob. Deliberately not a column per setting, and
-- deliberately not a second table for tag metadata:
--
--   * this is read once per session and written rarely, so there is nothing to
--     gain from normalising it;
--   * it is never queried BY its contents — no filter, no join, no index on any
--     field inside it — so a jsonb column costs nothing in practice;
--   * the shape will keep changing as settings are added, and every one of
--     those changes would otherwise be a migration.
--
-- The trade is that the database cannot validate the shape. That is handled in
-- lib/preferences.ts, which treats the blob as untrusted input: a missing key,
-- a stale shape or a hostile string degrades to the default rather than
-- throwing. A settings blob must never be able to produce a blank page.
--
-- Safe to re-run.

create table if not exists public.user_preferences (
    user_id    uuid primary key references auth.users(id) on delete cascade,
    prefs      jsonb       not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS, exactly as 0002 does it for notes: own row only, one policy per
-- operation, all keyed on auth.uid(). No anon policy — there is nothing here
-- an unauthenticated caller should see.
-- ---------------------------------------------------------------------------

alter table public.user_preferences enable row level security;

drop policy if exists "Users can read their own preferences" on public.user_preferences;
create policy "Users can read their own preferences"
    on public.user_preferences for select
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists "Users can create their own preferences" on public.user_preferences;
create policy "Users can create their own preferences"
    on public.user_preferences for insert
    to authenticated
    with check (auth.uid() = user_id);

drop policy if exists "Users can update their own preferences" on public.user_preferences;
create policy "Users can update their own preferences"
    on public.user_preferences for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own preferences" on public.user_preferences;
create policy "Users can delete their own preferences"
    on public.user_preferences for delete
    to authenticated
    using (auth.uid() = user_id);

-- Reuses the trigger function 0005 already installed for notes.
drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
    before update on public.user_preferences
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- A size ceiling.
--
-- The client writes this blob directly, so without a bound a bug — or a bored
-- person with the anon key and an account — could push megabytes into a row
-- that is fetched on every page load. 16 KB is far more than the settings need
-- (a hundred tags with colours and labels is well under 8 KB) and small enough
-- that it can never become a performance problem.
-- ---------------------------------------------------------------------------
do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.user_preferences'::regclass
          and conname = 'user_preferences_size'
    ) then
        alter table public.user_preferences
            add constraint user_preferences_size
            check (pg_column_size(prefs) <= 16384) not valid;
    end if;
end $$;

alter table public.user_preferences validate constraint user_preferences_size;

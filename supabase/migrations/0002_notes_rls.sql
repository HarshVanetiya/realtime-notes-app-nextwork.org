-- 0002_notes_rls.sql
-- Row-level security for public.notes.
--
-- Without this, enabling RLS alone would deny everything, and NOT enabling it
-- would let any authenticated user read every note in the table. Both policies
-- and the enable are required.
--
-- Safe to re-run.

alter table public.notes enable row level security;

-- Separate policies per command rather than one FOR ALL, so the intent of each
-- is explicit and they can be tightened independently later.

drop policy if exists "Users can read their own notes" on public.notes;
create policy "Users can read their own notes"
    on public.notes for select
    to authenticated
    using (auth.uid() = user_id);

-- WITH CHECK on insert stops a user writing a row owned by someone else.
drop policy if exists "Users can create their own notes" on public.notes;
create policy "Users can create their own notes"
    on public.notes for insert
    to authenticated
    with check (auth.uid() = user_id);

-- USING gates which rows may be updated; WITH CHECK stops an update from
-- reassigning user_id and handing the row to another account.
drop policy if exists "Users can update their own notes" on public.notes;
create policy "Users can update their own notes"
    on public.notes for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own notes" on public.notes;
create policy "Users can delete their own notes"
    on public.notes for delete
    to authenticated
    using (auth.uid() = user_id);

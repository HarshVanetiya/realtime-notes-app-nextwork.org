-- 0006_soft_delete.sql
-- Soft delete, so that undo cannot lose data and a Trash view is possible.
--
-- Deleting used to be permanent behind a confirm dialog. Undo-by-reinsert was
-- the alternative, but it has a real failure mode: the row is genuinely gone, so
-- if the re-insert fails the note is lost at exactly the moment the user asked
-- to keep it. Marking instead of removing makes undo a one-column update.
--
-- Safe to re-run.

alter table public.notes
    add column if not exists deleted_at timestamptz;

-- Partial indexes: almost every query wants live notes only, and the trash view
-- wants the opposite. Neither pays for the other's rows.
create index if not exists notes_live_idx
    on public.notes (user_id, created_at desc)
    where deleted_at is null;

create index if not exists notes_trashed_idx
    on public.notes (user_id, deleted_at desc)
    where deleted_at is not null;

-- RLS is unchanged: soft delete is an UPDATE, already covered by the update
-- policy in 0002, and permanent deletion from the trash is a DELETE, covered by
-- the delete policy. No new policies.
--
-- REALTIME BEHAVIOUR CHANGES, and the client has to know:
-- a soft delete now arrives as an UPDATE carrying deleted_at, not as a DELETE.
-- NotesList treats "updated, and now has deleted_at" as a removal, and
-- "updated, deleted_at cleared, not currently in the list" as a restore.

comment on column public.notes.deleted_at is
    'Non-null means trashed. Every live-notes query must filter deleted_at is null.';

# Database

Everything needed to recreate this app's backend from an empty Supabase project.

Until now the schema lived only in the Supabase dashboard and in one commit
message, which meant it could not be reviewed, replayed, or recovered. These
files are the source of truth.

## Running them

**Dashboard** — open the SQL Editor and run each file in `migrations/` in
numeric order, oldest first. Then run `verify.sql`; every row should say `PASS`.

**CLI** — `supabase db push` (filenames use the `<version>_<name>.sql` form the
CLI expects).

Every file is idempotent: `if not exists`, `on conflict do nothing`, and
`drop policy if exists` before each `create policy`. Re-running the whole set
against a populated database is safe and changes nothing.

## What each file does

| File | Purpose |
|---|---|
| `0001_notes_table.sql` | The `notes` table as originally shipped, plus the index behind the newest-first dashboard query |
| `0002_notes_rls.sql` | Enables RLS and adds one policy per operation, all keyed on `auth.uid() = user_id` |
| `0003_notes_realtime.sql` | Adds `notes` to the realtime publication and sets `replica identity full` |
| `0004_storage_note_images.sql` | The `note-images` bucket and per-user folder isolation |
| `0005_tags_and_updated_at.sql` | `tags` + `updated_at`, their indexes, and the trigger that maintains `updated_at` |

`verify.sql` is read-only and checks all ten of the above landed.

## Two things worth knowing

**`replica identity full` in 0003 is not optional.** With the default replica
identity a `DELETE` only writes the primary key to the WAL. Realtime then cannot
evaluate the RLS policy — which tests `user_id` — against the deleted row, so it
drops the event. Deleting a note would leave it on screen in every other open
tab until reload. `full` ships the whole old row so the policy can be checked.

**The `note-images` bucket is public-read, deliberately.** The app calls
`getPublicUrl`, and `<img>` / `next/image` fetch those URLs without a session.
So anyone holding an image URL can view it: paths are unguessable but not
secret. This is URL-level privacy, not access control. Writes are still confined
to each user's own folder by the policies in 0004. To make images genuinely
private, set `public = false` and move the app to `createSignedUrl`.

## Provenance

Derived from the application code — the columns, the storage paths, the realtime
filter and the RLS predicate are all read back from what the app actually
queries, so these files and the code cannot disagree. The original NextWork
project page could not be reached from this environment to cross-check against
(its domain is blocked here), so if that page lists anything extra — a seed row,
an additional policy — it is worth a look.

## Schema

```
public.notes
  id           uuid         primary key, default gen_random_uuid()
  user_id      uuid         not null → auth.users(id) on delete cascade
  title        text         not null
  content      text         BlockNote JSON (legacy rows hold HTML)
  image_url    text         public URL into note-images
  is_favorite  boolean      not null, default false
  tags         text[]       not null, default '{}'
  created_at   timestamptz  not null, default now()
  updated_at   timestamptz  not null, default now(), maintained by trigger

storage bucket `note-images`, public read, objects at `<user_id>/<filename>`
```

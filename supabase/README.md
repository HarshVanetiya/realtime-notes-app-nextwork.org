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
| `0006_soft_delete.sql` | `deleted_at` and its partial indexes — what makes delete undoable and Trash possible |
| `0007_public_sharing.sql` | `is_public`, `public_slug`, the slug trigger, and the `get_public_note()` function behind `/n/[slug]` |
| `0008_full_text_search.sql` | `search_vector` + GIN, the sort/paging indexes, and `search_notes()` / `count_notes()` / `note_tags()` |
| `0009_constraints.sql` | Title length and tag limits, enforced by the database rather than only by the form |

`verify.sql` is read-only and checks all of the above landed — 27 checks.

### If you already ran an earlier copy of these files

`0006` and `0007` were originally numbered the other way round: sharing was
`0006` and soft delete was `0007`. That was wrong — `get_public_note()` filters
on `deleted_at`, so running them in numeric order failed with *column
n.deleted_at does not exist*. They have been swapped so numeric order is
dependency order. If you already applied the old pair successfully (in the
other order), nothing changes: the files are idempotent and re-running them in
the new order is a no-op.

`0008` is what lets the dashboard stop downloading every row: search runs
against a generated `tsvector` in Postgres, so the client can fetch one page at
a time and still search everything.

## Verified, not assumed

These files are applied to a real PostgreSQL 16 instance in numeric order from
an empty database, then applied a second time to prove idempotency, then
exercised: the constraints reject a 201-character title and a ninth tag,
sharing mints a 96-bit URL-safe slug, revoking clears it, re-sharing mints a
*different* one, a trashed note stops being served, and `anon` can call
`get_public_note()` while holding no grant at all on `notes`. The numbering bug
above was found that way rather than by reading them.

Search and paging are measured the same way, on 50,000 notes, **as the
`authenticated` role with RLS applied** — measuring as superuser measures a
different query, because without the `user_id` predicate RLS injects, none of
the indexes apply. Page 1 is 0.5 ms, page 200 is 1.5 ms, every sort order is
under a millisecond, and a rare search term is 16 ms. Two designs were rejected
on those numbers rather than on taste: folding the total into each page with a
window function (60x slower) and expressing the sort order as a CASE over a
parameter (1000x slower, because a CASE is not an indexable expression). Both
are documented in `0008` with the numbers.

## Three things worth knowing

**`replica identity full` in 0003 is not optional.** With the default replica
identity a `DELETE` only writes the primary key to the WAL. Realtime then cannot
evaluate the RLS policy — which tests `user_id` — against the deleted row, so it
drops the event. Deleting a note would leave it on screen in every other open
tab until reload. `full` ships the whole old row so the policy can be checked.

**`notes` has no `anon` policy, deliberately.** Public sharing does not go
through RLS at all. An `anon` SELECT policy would let anyone query
`/rest/v1/notes?select=user_id&is_public=eq.true` through PostgREST — leaking
owner ids and enumerating every public note on the platform. Instead the table
stays sealed and a single `security definer` function chooses the columns, so
column leakage is structurally impossible and reading a note requires knowing
its 96-bit slug. Its `search_path` is pinned, without which a definer function
is hijackable.

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
  deleted_at   timestamptz  non-null = in Trash; every live query filters this
  is_public    boolean      not null, default false
  public_slug  text         unique, minted and cleared by trigger — never by the client
  search_vector tsvector    generated, stored; title + tags + extracted body text

storage bucket `note-images`, public read, objects at `<user_id>/<filename>`
```

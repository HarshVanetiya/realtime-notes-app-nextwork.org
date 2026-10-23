# Prism — real-time notes

A full-stack notes app built on Next.js and Supabase. Notes sync live across tabs and devices, keep working offline, and can be searched, tagged, shared by link, and exported. It comes with a companion Chrome extension that saves bookmarks into the same account.

**[Try it live →](https://realtime-notes-app-nextwork-org.vercel.app)**

<!-- Add screenshots here: the notes dashboard, a note open in the editor, and the mobile view.
![Notes dashboard](docs/screenshots/dashboard.png) -->

## Features

**Writing and organising**
- Rich-text editor (BlockNote) with image attachments
- Tags with custom colours and labels, favourites, and a Trash with undo (soft delete)
- Full-text search across every note, run in Postgres so the dashboard loads one page at a time instead of every note
- Export any note as Markdown
- Share a note publicly with a link, and stop sharing at any time

**Sync and reliability**
- Real-time sync across tabs and devices with Supabase Realtime
- Works offline: edits made without a connection go into an IndexedDB queue and sync when you're back online, with at most one queued change per note so replays never conflict
- A sync banner shows when you're offline or changes are waiting to upload

**Experience**
- Command palette (`Ctrl/⌘ + K`), quick new note (`Ctrl/⌘ + N`), and a shortcuts sheet (`?`)
- Per-account preferences (accent colour, theme, layout density) saved to your account and applied before the first paint, so there's no flash of the wrong theme
- Installable as an app (PWA), with touch gestures and a bottom bar on phones
- Bookmark drawer, fed by the **Prism Bookmarks** Chrome extension: save the current tab or any link with one click

## Security and data

- **Row Level Security on every table.** Each query is checked against `auth.uid()`, so users can only ever read or write their own notes, files and bookmarks
- **Per-user file storage.** Uploaded images live in a folder named after the user's ID, protected by storage policies
- **Rules enforced by the database,** not just the form: title length, tag limits and URL checks are constraints in Postgres
- **Server-verified auth.** Pages use `getClaims()`, which verifies the token's signature, rather than trusting the session stored in the browser

## Database as code

The whole backend can be rebuilt from an empty Supabase project with the files in [`supabase/`](supabase/):

- **11 migrations,** each idempotent, so re-running them is always safe: notes, RLS, realtime, storage, tags, soft delete, sharing, full-text search, constraints, preferences and bookmarks
- **`verify.sql`,** 39 read-only checks that confirm everything landed correctly

See [`supabase/README.md`](supabase/README.md) for what each migration does.

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | Next.js (App Router), React 19, TypeScript, Tailwind CSS, Radix UI, BlockNote, cmdk |
| Backend | Supabase: Postgres, Auth, Realtime, Storage, SQL functions for search and sharing |
| Offline | IndexedDB write queue |
| Extension | Chrome Manifest V3, esbuild, supabase-js |
| Hosting | Vercel |

## Run it locally

You need Node.js 20+ and a free [Supabase](https://supabase.com) project.

1. **Set up the database.** In the Supabase SQL Editor, run each file in `supabase/migrations/` in order, then run `supabase/verify.sql`. Every row should say `PASS`.
2. **Install and configure:**
   ```bash
   git clone https://github.com/HarshVanetiya/realtime-notes-app-nextwork.org.git prism
   cd prism
   npm install
   cp .env.example .env.local   # add your Supabase URL and publishable key
   ```
3. **Start it:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

To build the Chrome extension, see [`extension/README.md`](extension/README.md).

## Project structure

```
app/              pages: landing, auth, notes dashboard, note editor, trash, public share (/n/[slug]), export
components/       editor, notes grid, command palette, preferences, bookmark drawer, landing page
lib/              Supabase clients, notes and bookmarks API, offline queue, search queries, preferences
supabase/         migrations and verify.sql
extension/        Prism Bookmarks Chrome extension
scripts/          lint checks for SQL function signatures and accent-colour contrast
```

## How this was built

This started as the [NextWork](https://learn.nextwork.org) "Build a Real-Time Notes App" project, which covered auth, Row Level Security, realtime sync and image uploads. My write-up of that tutorial is in [`docs/nextwork-tutorial.md`](docs/nextwork-tutorial.md).

I then kept building well past the tutorial: the editor, offline sync, search, sharing, preferences, the bookmark drawer and the Chrome extension. Some of these features were built with [Claude Code](https://claude.com/claude-code), Anthropic's AI coding agent, as a pair programmer; the commit history shows which.

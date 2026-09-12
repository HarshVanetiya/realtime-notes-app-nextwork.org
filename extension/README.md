# Prism Bookmarks — Chrome extension

Saves the current page, or any link on a page, into the bookmark drawer of the
Prism notes app. Writes go straight to Supabase under the same account and RLS
the app uses, so a save here appears in an open drawer immediately.

See [SETUP.md](SETUP.md) for the full walkthrough — the database step, loading in Chrome, and how to distribute it.

## Build

```sh
cd extension
npm install
npm run build          # → extension/dist
```

The build needs the Supabase URL and anon/publishable key. It reads, in order
of precedence: `extension/.env` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`), then the
app's `../.env.local` / `../.env` (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). If you already run the app locally,
there is nothing extra to set.

`npm run watch` rebuilds on change; reload the extension in
`chrome://extensions` afterwards.

## Load

1. Open `chrome://extensions`, turn on **Developer mode**.
2. **Load unpacked** → choose `extension/dist`.
3. Pin the icon, click it, sign in with your Prism account.

## Use

- **Toolbar button** — signed in, it saves the current tab with no popup and
  flashes a badge: `✓` saved, `=` already saved, `!` not possible (see below).
  Signed out, the same click opens the sign-in popup.
- **Right-click a link** → *Bookmark this link in Prism*.
- **Right-click the toolbar icon** → *Sign out of Prism bookmarks*.

Only `http://` and `https://` pages can be saved; `chrome://`, `file://` and
the like get a `!` badge and nothing is written. Saving a URL that is already
in your bookmarks is a no-op (`=`), never a duplicate tile.

## Layout

| File | Purpose |
|---|---|
| `manifest.json` | MV3 manifest; `host_permissions` is filled in by the build from the Supabase URL |
| `src/supabase.ts` | supabase-js client backed by `chrome.storage.local`, plus the save routine |
| `src/background.ts` | Service worker: toolbar click, context menus, badge, popup on/off |
| `src/popup.html` / `src/popup.ts` | Sign-in / signed-in popup |
| `build.mjs` | esbuild bundle + manifest stamping |

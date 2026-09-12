# Prism Bookmarks — setup, load, and distribute

Step-by-step from a fresh clone to an installed extension, and the options for
handing it to other people. `README.md` next to this file is the shorter
reference; this one is the walkthrough.

---

## 1. Apply the database change first

The extension writes to `bookmarks` and `bookmark_folders`, which don't exist
until `0011` has been applied. Without it every save fails with a red `!`
badge.

In Supabase → **SQL Editor**:

1. Paste and run `supabase/migrations/0011_bookmarks.sql`.
   Expect *Success. No rows returned.* Running it twice is safe.
2. Run `supabase/verify.sql`. Every row should be `PASS` — 39 rows, 9 of them
   tagged `(0011)`.

## 2. Build the extension

```powershell
cd extension
npm install
npm run build
```

The build needs the Supabase URL and the anon / publishable key. It reads, in
order of precedence:

1. `extension/.env` — `SUPABASE_URL`, `SUPABASE_ANON_KEY`
2. `../.env.local` then `../.env` — `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

If you already run the app locally, nothing extra is needed. Otherwise create
`extension/.env`:

```
SUPABASE_URL=https://<your-ref>.supabase.co
SUPABASE_ANON_KEY=<your publishable/anon key>
```

Output lands in `extension/dist/`:

```
dist/
  manifest.json      host_permissions stamped with your Supabase origin
  background.js      service worker
  popup.html
  popup.js
  icons/
```

`npm run watch` rebuilds on every change while you iterate; press ↻ on the
extension's card in `chrome://extensions` afterwards.

## 3. Load it in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. **Load unpacked** → choose `extension\dist`.
4. Click the puzzle icon in the toolbar → pin **Prism Bookmarks**.
5. Click the icon → sign in with the same email and password you use in the
   notes app.

After sign-in the popup goes away for good:

| Action | Result |
|---|---|
| Click the icon on an `http(s)://` page | Saves it; badge flashes `✓` (or `=` if already saved) |
| Right-click a link → *Bookmark this link in Prism* | Saves the link |
| Right-click the toolbar icon → *Sign out of Prism bookmarks* | Signs out; the next click opens the sign-in popup |
| Click the icon on `chrome://`, `file://`, new-tab | `!` badge, nothing saved |

Saves show up in the app's bookmark drawer (`⌘B` / rail → Bookmarks) live,
without a refresh.

### If something misbehaves

- `chrome://extensions` → the extension's card → **Errors** shows anything thrown.
- The **service worker** link on the same card opens its console; save
  attempts and Supabase errors are visible there.
- Red `!` on every save → the migration hasn't been applied (step 1), or the
  session is stale (right-click icon → Sign out, sign in again).
- After changing `.env` or any source file: `npm run build`, then ↻ the card.

## 4. Distributing it

Chrome does not let ordinary users install a `.crx` from outside the Web Store
— it is blocked on Windows and macOS except through enterprise policy. So the
realistic options are:

### A. Share the zip, they load unpacked

Good for friends, testers, and portfolio demos.

```powershell
cd <repo root>
Compress-Archive -Path extension\dist\* -DestinationPath prism-bookmarks.zip -Force
```

They unzip it and follow section 3. Downside: Chrome shows a *"Disable
developer mode extensions"* bar on every launch, and there are no updates —
you send a new zip.

### B. Chrome Web Store — unlisted (recommended)

The proper way, and still private.

1. Register at the Chrome Web Store developer dashboard
   (`https://chrome.google.com/webstore/devconsole`). One-time **$5** fee.
2. Upload the same zip from option A.
3. **Visibility → Unlisted**: only people with the link can install. No
   developer-mode bar, and Chrome auto-updates them when you bump `version`
   in `manifest.json` and re-upload.
4. Review usually takes 1–3 days.

### C. Chrome Web Store — public

Same as B with **Visibility → Public**. The **Edge Add-ons** store is free and
accepts the identical zip if you want Edge users too.

### What the store review asks for (B and C)

| Field | What to put |
|---|---|
| Single purpose | Saves the current page or a link to the user's Prism bookmark drawer. |
| `activeTab` / `tabs` | Read the current tab's URL, title and favicon when the user clicks the icon. |
| `contextMenus` | The right-click *Bookmark this link* item. |
| `storage` | Keeps the sign-in session between browser restarts. |
| Host permission `https://<ref>.supabase.co/*` | The API the bookmarks are saved to. |
| Privacy policy URL | Required — it handles login credentials and sends URLs to a server. A `/privacy` page on the app or a section in the GitHub README both work. |
| Assets | Screenshots at 1280×800; the 128px icon is already in `icons/`. |

Bump `"version"` in `manifest.json` for every upload; the store rejects a
re-upload of the same version.

## 5. Two things to know, whichever option you pick

- **The anon key is baked into the bundle.** That's expected — it's public by
  design and RLS does the protecting, exactly as in the web app. But if you
  ever rotate the key, rebuild and re-upload, or every installed copy stops
  working.
- **Users need an account already.** The extension signs in; it does not sign
  up. Point people at the app's sign-up page first.

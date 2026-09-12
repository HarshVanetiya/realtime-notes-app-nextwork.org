# Bookmark drawer + extension — test sheet

Tick each case as you go. Every row has an ID so a failure can be reported as
"B-07 failed: …". Rows marked **▲** are the ones most likely to catch a real bug.

Legend for the result column: ✅ pass · ❌ fail · ⏭ skipped

---

## 0. Setup (do once)

| # | Step | Done |
|---|---|---|
| S-01 | Supabase → SQL Editor → run `supabase/migrations/0011_bookmarks.sql`. Expect "Success. No rows returned." | ☐ |
| S-02 | Run `0011_bookmarks.sql` **a second time**. Must succeed again with no errors (idempotency). | ☐ |
| S-03 | Run `supabase/verify.sql`. Every row must be `PASS` — 39 rows, 9 of them tagged `(0011)`. | ☐ |
| S-04 | App: `npm install && npm run dev`. Sign in. | ☐ |
| S-05 | Extension: `cd extension && npm install && npm run build`. If `.env.local` isn't present in the app root, create `extension/.env` with `SUPABASE_URL` and `SUPABASE_ANON_KEY` first. | ☐ |
| S-06 | `chrome://extensions` → Developer mode → Load unpacked → `extension/dist`. Pin the icon. | ☐ |
| S-07 | Have a **second account** ready (sign up in the app with another email) for the isolation checks in section D. | ☐ |

---

## A. Database (paste into the SQL Editor, signed-in role not needed)

These run as the SQL editor's superuser, so they test the constraints, not RLS.
Replace `<uid>` with your user's id from `select id, email from auth.users;`.

| # | SQL | Expected | Result |
|---|---|---|---|
| A-01 | `insert into bookmarks (user_id,title,url) values ('<uid>','ok','https://example.com');` | 1 row inserted | ☐ |
| A-02 **▲** | Run A-01 again, same URL | **Error**: duplicate key value violates unique constraint `bookmarks_user_url_key` | ☐ |
| A-03 | `insert into bookmarks (user_id,title,url) values ('<uid>','bad','ftp://example.com');` | **Error**: violates check `bookmarks_url_shape` | ☐ |
| A-04 | `insert into bookmarks (user_id,title,url) values ('<uid>','bad','chrome://extensions');` | **Error**: `bookmarks_url_shape` | ☐ |
| A-05 | `insert into bookmarks (user_id,title,url) values ('<uid>', repeat('x',201), 'https://a.com/1');` | **Error**: `bookmarks_title_length` | ☐ |
| A-06 | `insert into bookmarks (user_id,title,url) values ('<uid>','   ','https://a.com/2');` | **Error**: `bookmarks_title_length` (blank after trim) | ☐ |
| A-07 | `insert into bookmark_folders (user_id,name) values ('<uid>', repeat('y',61));` | **Error**: `bookmark_folders_name_length` | ☐ |
| A-08 | `insert into bookmark_folders (user_id,name) values ('<uid>','Work') returning id;` — note the id as `<fid>` | 1 row, id returned | ☐ |
| A-09 | `update bookmarks set folder_id='<fid>' where url='https://example.com';` | 1 row updated | ☐ |
| A-10 **▲** | `delete from bookmark_folders where id='<fid>';` then `select folder_id from bookmarks where url='https://example.com';` | Bookmark still exists, `folder_id` is **null** | ☐ |
| A-11 **▲** | Create a folder as the **second** user (`<uid2>`): `insert into bookmark_folders (user_id,name) values ('<uid2>','Theirs') returning id;` → `<fid2>`. Then `update bookmarks set folder_id='<fid2>' where url='https://example.com';` | **Error**: `bookmarks_folder_same_owner` | ☐ |
| A-12 | `update bookmarks set title='renamed' where url='https://example.com'; select updated_at > created_at from bookmarks where url='https://example.com';` | `true` (trigger maintains `updated_at`) | ☐ |
| A-13 | Cleanup: `delete from bookmarks where user_id in ('<uid>','<uid2>'); delete from bookmark_folders where user_id in ('<uid>','<uid2>');` | rows removed | ☐ |

---

## B. Drawer — opening, layout, navigation (desktop, `lg` width ≥ 1024px)

| # | Steps | Expected | Result |
|---|---|---|---|
| B-01 | Hover the rail → click **Bookmarks** | Side sheet slides in from the rail's right edge, ~380px wide, note content behind stays visible. Search box has focus. | ☐ |
| B-02 | Press `Esc` | Sheet closes; focus returns to where it was. | ☐ |
| B-03 | Press `⌘B` / `Ctrl+B` (not inside the editor) | Sheet toggles open; press again → closes. | ☐ |
| B-04 | Open the sheet, click anywhere on the page outside it | Sheet closes. | ☐ |
| B-05 | Press `?` → Keyboard shortcuts dialog | Lists "Open the bookmark drawer ⌘ B". | ☐ |
| B-06 | Fresh account (no bookmarks) → open sheet | Empty state: "No bookmarks yet" with the hint about + and the extension. | ☐ |
| B-07 **▲** | Open sheet on `/notes`, then click into a note and open again | Works on both pages (mounted at layout level). | ☐ |
| B-08 | Open sheet, then open Preferences from the profile menu | Preferences dialog appears **above** the sheet; closing it leaves the sheet open. | ☐ |

## C. Drawer — CRUD (do these in order, they build on each other)

| # | Steps | Expected | Result |
|---|---|---|---|
| C-01 | Click **+** (Add bookmark) → URL `https://github.com`, title blank → Save | Tile appears with GitHub favicon, title **"github.com"** (hostname fallback). Toast not shown for adds (dialog just closes). | ☐ |
| C-02 | **+** → URL `https://news.ycombinator.com`, title `HN` → Save | Tile "HN" with the Y favicon. | ☐ |
| C-03 **▲** | **+** → URL `https://github.com` again → Save | Dialog shows **"Already saved."** and stays open; no second tile. | ☐ |
| C-04 | **+** → URL `notaurl` → Save | Dialog shows "Enter a full http:// or https:// address." | ☐ |
| C-05 | **+** → URL `chrome://extensions` → Save | Same validation message as C-04. | ☐ |
| C-06 | Click the **github.com** tile (left click) | Opens `https://github.com` in a **new tab**; sheet stays open. | ☐ |
| C-07 **▲** | Right-click the **HN** tile | Menu appears: Open, Rename, Move to ›, Delete. Page's native context menu does **not** appear. | ☐ |
| C-08 | Right-click **HN** → Rename → `Hacker News` → Save | Tile label updates immediately. | ☐ |
| C-09 | Right-click **HN** → Rename → clear the field → Save | "A title is required." | ☐ |
| C-10 | Hover **HN** tile → a small ⋯ appears top-right → click it | Same menu as C-07. Link did **not** open. | ☐ |
| C-11 | Click **New folder** (folder+ icon) → `Dev` → Save | Folder tile "Dev" appears **before** the bookmark tiles, showing an empty folder icon. | ☐ |
| C-12 | Right-click **Hacker News** → Move to › → **Dev** | Tile disappears from top level; Dev folder tile now shows the HN favicon as a mini preview. | ☐ |
| C-13 | Click the **Dev** folder tile | Grid shows only Hacker News; header reads "Dev" with a ← back button; the New-folder button is hidden inside a folder. | ☐ |
| C-14 | Inside Dev → **+** → `https://vercel.com` → Save | New tile appears **inside Dev** (added to the folder you're in). | ☐ |
| C-15 | Right-click **Hacker News** (inside Dev) → Move to › → **Top level** | Leaves the folder; back at top level it's there again. | ☐ |
| C-16 | Press ← | Back to top level. Dev folder preview now shows only the Vercel favicon. | ☐ |
| C-17 | Right-click **Dev** folder → Rename → `Tools` → Save | Folder label updates. | ☐ |
| C-18 **▲** | Right-click **Tools** → Delete folder | Toast: "Deleted "Tools" — its bookmarks moved to the top level". **vercel.com** tile now sits at top level. Nothing lost. | ☐ |
| C-19 | Right-click **vercel.com** → Delete | Tile gone; toast "Bookmark deleted". | ☐ |
| C-20 | Search box: type `hack` | Only Hacker News shows; header reads `Results for "hack"`. Folders are hidden while searching. | ☐ |
| C-21 | Search: type `github.com` (matches URL, not title) | github.com tile shows (URL match). | ☐ |
| C-22 | Search: `zzzz` | "Nothing matches" empty state. Click ← clears the search. | ☐ |
| C-23 | Create folder `Empty`, don't put anything in it, open it | "This folder is empty" state; + still works inside it. | ☐ |

## D. Realtime + isolation

| # | Steps | Expected | Result |
|---|---|---|---|
| D-01 **▲** | Two browser tabs, both signed in as **you**, both with the sheet open. In tab 1 add a bookmark. | Tab 2 shows the new tile within ~1s, no refresh. | ☐ |
| D-02 | Tab 1: rename it | Tab 2 updates the label live. | ☐ |
| D-03 | Tab 1: create a folder and move the bookmark into it | Tab 2: folder appears, tile moves into it. | ☐ |
| D-04 **▲** | Tab 2: open that folder. Tab 1: delete the folder. | Tab 2 pops back to top level automatically and the bookmark is still there at top level. | ☐ |
| D-05 | Tab 1: delete the bookmark | Tab 2 removes the tile live (this is the `replica identity full` check). | ☐ |
| D-06 **▲** | Sign in as the **second account** in an incognito window, open the sheet | Sees **none** of the first account's bookmarks or folders. | ☐ |
| D-07 | Second account: add a bookmark. Back in the first account's tab: | Nothing new appears (the realtime filter is per-user). | ☐ |

## E. Mobile / touch (phone, or DevTools device mode with touch on, width < 1024px)

| # | Steps | Expected | Result |
|---|---|---|---|
| E-01 | Hamburger → **Bookmarks** | Sheet opens **full-screen** with a dim backdrop; mobile nav drawer closes. | ☐ |
| E-02 | Tap a bookmark tile | Opens the link in a new tab; the menu does **not** open. | ☐ |
| E-03 **▲** | **Long-press** (hold ~0.5s) a tile, then lift | Context menu opens; the link does **not** open. | ☐ |
| E-04 | Long-press but slide your finger before 0.5s | No menu (movement cancels the press). | ☐ |
| E-05 | Tap the dim backdrop / the ✕ | Sheet closes. | ☐ |
| E-06 | Rotate / resize between < 1024 and ≥ 1024 with the sheet open | Switches between full-screen and side-sheet without breaking. | ☐ |
| E-07 | Grid at 360px width | 4 tiles per row, labels wrap to 2 lines max, no horizontal scroll. | ☐ |

## F. Extension — sign-in

| # | Steps | Expected | Result |
|---|---|---|---|
| F-01 | Click the toolbar icon (never signed in) | Popup opens with Email / Password. | ☐ |
| F-02 | Wrong password → Sign in | Red error under the button; still on the form. | ☐ |
| F-03 | Correct credentials → Sign in | Popup switches to "Signed in as <email>" with Save / Sign out. | ☐ |
| F-04 **▲** | Close the popup. Click the toolbar icon again on a normal `https://` page. | **No popup.** Badge flashes `✓` for ~2s. | ☐ |
| F-05 | Right-click the toolbar icon | Chrome's menu now includes **"Sign out of Prism bookmarks"**. | ☐ |
| F-06 | Restart Chrome entirely, click the icon on an https page | Still signed in: `✓` badge, no popup (session persisted in `chrome.storage`). | ☐ |
| F-07 | Right-click icon → Sign out. Click the icon. | Popup with the sign-in form is back; "Sign out" item gone from the icon's menu. | ☐ |

## G. Extension — saving

| # | Steps | Expected | Result |
|---|---|---|---|
| G-01 **▲** | Signed in, sheet open in the app in another window. On `https://developer.mozilla.org` click the icon. | `✓` badge. Tile **appears in the open sheet live**, with MDN's favicon (captured from the tab, not the Google fallback) and the page title. | ☐ |
| G-02 **▲** | Click the icon again on the same page | `=` badge (already saved). Still exactly one MDN tile in the sheet. | ☐ |
| G-03 | Open a page with a very long `<title>` (a long news article), click the icon | Saved; title is cut at 200 characters. | ☐ |
| G-04 | Click the icon on `chrome://extensions` | `!` badge (amber). Nothing appears in the sheet. | ☐ |
| G-05 | Click the icon on a `file://` page or a new-tab page | `!` badge. Nothing saved. | ☐ |
| G-06 **▲** | On any page, right-click a **link** → "Bookmark this link in Prism" | `✓` badge. Tile appears with title `host/path` of the link (e.g. `github.com/vercel/next.js`) and a Google-service favicon. | ☐ |
| G-07 | **Select** some text that is itself a link, right-click it → Bookmark this link | Title is the selected text rather than host/path. | ☐ |
| G-08 | Right-click a `javascript:` or `mailto:` link → Bookmark this link | `!` badge, nothing saved. | ☐ |
| G-09 **▲** | In Supabase → Authentication → Users, **delete the session** (or change the password) while the extension is signed in. Click the icon. | Red `!` badge, then the sign-in popup opens. After signing in again, the click saves normally. | ☐ |
| G-10 | Turn Wi-Fi off, click the icon | Red `!`; nothing saved; turning Wi-Fi back on and clicking again saves. | ☐ |
| G-11 | Sign out, then sign in again and — with the popup still open right after signing in — click **Save this page**. | Same result as a toolbar click: badge + tile; popup shows "Done — check the badge on the icon." | ☐ |
| G-12 | Second account signed in to the **extension**, first account signed in to the **app** | Saves from the extension do **not** appear in the app's sheet. Switching the app to the second account shows them. | ☐ |

## H. Regression — nothing else broke

| # | Check | Result |
|---|---|---|
| H-01 | `⌘K` command palette still opens and searches. | ☐ |
| H-02 | `⌘N` still creates a note. | ☐ |
| H-03 | Sidebar: hover-expand, pin, mobile hamburger drawer, Search, Create Note, Favorites, Trash, Kanban link all still work. | ☐ |
| H-04 | Notes dashboard realtime (create/edit/delete a note across two tabs) still syncs — the new channel must not interfere with `notes-realtime`. | ☐ |
| H-05 | Preferences dialog opens and saves. | ☐ |
| H-06 | `npm run lint` passes (eslint + `check:rpc` + `check:accent`). | ☐ |
| H-07 | `npm run build` passes. | ☐ |

---

## Reporting a failure

Give the ID, what you saw instead of the "Expected" column, and — for anything
in sections D, F or G — the badge colour/letter and any red line in
`chrome://extensions` → the extension's **Errors** / **service worker** console.

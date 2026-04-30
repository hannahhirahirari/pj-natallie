# natallie basic test plan

This is a small pre-ship checklist for catching the most likely breakages in natallie.

## Why this exists

The risky history around April 25-26, 2026 was mostly GitHub web edits and uploads:

- Whole files were deleted and re-uploaded several times (`index.html`, `privacy.html`, app files).
- The PWA files were moved into `app/`.
- Icons were later moved into `app/`.
- Several commits only bumped the service-worker cache version.
- Landing-page links and manual/format links were edited after those moves.

The most likely failure mode from that pattern is not subtle app logic. It is broken paths:

- `/manifest.json` vs `/app/manifest.json`
- `/sw.js` vs `/app/sw.js`
- `/icon-192.png` vs `/app/icon-192.png`
- `/apple-touch-icon.png` vs `/app/apple-touch-icon.png`

If these paths are wrong, the page may still appear to work, but installability, icons, offline behavior, and cached updates can break.

## Before Every Deploy

Run the automated pre-deploy checks from the repository root:

```
node scripts/predeploy-check.mjs
```

These checks cover the most common accidental breakages: missing pages/assets, root-vs-`/app/` PWA paths, manifest icon files, service-worker precache entries, unexpected analytics/script additions, and `nat-*` localStorage reset/documentation coverage.

Open these pages:

- `/`
- `/app/`
- `/manual.html`
- `/format.html`
- `/privacy.html`

Confirm:

- The page loads without a blank screen.
- The browser console has no red JavaScript errors.
- Main navigation links work.
- Icons/favicons are not 404s in the Network tab.
- The PWA manifest loads.
- The service worker registers for the app.

## URL Health Checks

These URLs should return `200`, not `404`:

- `/`
- `/app/`
- `/manual.html`
- `/format.html`
- `/privacy.html`
- `/app/manifest.json`
- `/app/sw.js`
- `/app/icon-192.png`
- `/app/icon-512.png`
- `/app/apple-touch-icon.png`

If the HTML intentionally points to root-level assets, then the matching root URLs must also return `200`:

- `/manifest.json`
- `/sw.js`
- `/icon-192.png`
- `/icon-512.png`
- `/apple-touch-icon.png`
- `/favicon.ico`

Do not assume icons are fine just because the app screen renders.

## PWA Smoke Test

Start with a fresh browser profile or clear site data for the local test URL.

1. Open `/app/`.
2. Confirm the PIN setup screen appears.
3. Skip PIN.
4. Confirm the empty home screen appears.
5. Open browser devtools and confirm no red errors.
6. Confirm the manifest is detected by the browser.
7. Confirm the service worker is registered.
8. Reload while online.
9. If practical, simulate offline mode and reload `/app/`.

Expected result: the app still loads and shows the same local data.

## Core App Smoke Test

1. Open `/app/`.
2. Go to Setup.
3. Create one button named `test` with any color.
4. Return home.
5. Tap the button three times.
6. Confirm the count pill shows `test · 3`.
7. Tap the count pill.
8. Confirm the stats screen opens and shows the three events.
9. Delete one event.
10. Confirm the count updates.

Expected result: no data is sent anywhere, and the UI stays responsive.

## Boards And Navigation

1. Go to Setup.
2. Create one board.
3. Open the board.
4. Create one button inside it.
5. Return home.
6. Open the board from the home grid.
7. Tap the nested button.
8. Open its stats.

Expected result: breadcrumbs, board preview, tap logging, and nested stats all work.

## Notes And Trash

1. Open Notes.
2. Add a note.
3. Confirm the note is hidden until tapped.
4. Edit the note.
5. Delete the note.
6. Open Settings > Trash.
7. Restore the note.

Expected result: the note returns with its text intact.

## PIN Locks

1. Set an app PIN.
2. Reload `/app/`.
3. Confirm the app asks for the PIN.
4. Enter a wrong PIN and confirm it is rejected.
5. Enter the correct PIN and confirm it unlocks.
6. Create a board PIN and confirm that board requires it.

Expected result: PINs gate UI access only. They are not encryption.

## Export, Backup, Import

1. Make at least one button tap and one note.
2. Set a PIN if exports require one.
3. Export logs and notes as CSV.
4. Export board layout as CSV.
5. Export a full `.natallie` backup.
6. Reset everything.
7. Import the `.natallie` backup.
8. Confirm buttons, logs, notes, language, and board locks are restored.

Expected result: backup/restore works without any server.

## Encrypted Export

1. Turn on `Encrypt exports`.
2. Export CSV.
3. Export a full backup.
4. Use Settings > Decrypt a file on each encrypted file.
5. Confirm the decrypted CSV opens as CSV.
6. Confirm the decrypted backup can be imported.
7. Try a wrong password once.

Expected result: wrong passwords fail, correct passwords decrypt, and there is no recovery path for forgotten passwords.

## Timezone And Time-Box Checks

1. Turn on `Record timezone with each tap`.
2. Tap a button.
3. Export CSV.
4. Confirm the CSV includes an `iana_timezone` column.
5. Create a time-boxed board.
6. If testing expiry manually, set a short/expired time-box in local data and reload.
7. Confirm the expiry banner offers export/delete, extend, and remove time-box.

Expected result: timezone recording is opt-in, and time-boxed board actions do not silently delete data.

## Safe Change Rules

- If moving files, changing PWA paths, renaming `nat-*` localStorage keys, or refactoring reset/export/service-worker logic, update `scripts/predeploy-check.mjs`, this file, and README in the same PR.
- If `app/index.html`, `app/sw.js`, `app/manifest.json`, or cached app assets change, bump `const CACHE = 'natallie-vNN'` in `app/sw.js`.
- If adding a new `nat-*` localStorage key, update reset-all and README.
- If changing exports/imports/backups/encryption, check `FORMAT.md` and run the export/import tests.
- Do not add analytics, telemetry, accounts, sync, ads, or third-party SDKs that send user data.

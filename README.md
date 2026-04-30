# natallie

A free, tap-based self-report event logger built as a Progressive Web App. The user builds their own buttons, taps them when something happens, and the resulting log lives in the browser's local storage on their device. No servers, no accounts, no analytics, no third-party SDKs.

**Live:** https://natallie.app

The `.natallie` file format and its encrypted variant are specified in [FORMAT.md](FORMAT.md).

---

## Tech stack

- Vanilla HTML, CSS, and JavaScript. No build step, no bundler, no framework files in the repo.
- React 18 loaded from unpkg as two CDN script tags. No JSX (would require transpilation), no React DOM build artifacts.
- PWA: installable, offline-capable via service worker.
- All user data persisted to `localStorage`. Nothing transmitted off-device.
- Web Crypto API (`crypto.subtle`) for optional opt-in export encryption (PBKDF2-SHA-256 / AES-GCM-256).
- Hosted on Vercel. Auto-deploys on push to `main`.
- Domain: natallie.app, registered at Porkbun, DNS via Vercel.

There is no `package.json`, no `node_modules`, no lockfile. The repo as committed is exactly what gets deployed.

---

## Repository layout

```
pj-natallie/
├── index.html              Marketing landing page (~2,340 lines, mostly CSS)
├── manual.html             User manual with interactive React demos
├── format.html             Public spec for the .natallie file format
├── privacy.html            Privacy policy
├── FORMAT.md               Markdown source of format.html
├── README.md               This file
├── vercel.json             Runs pre-deploy checks before Vercel publishes
├── LICENSE                 PolyForm Noncommercial 1.0.0
└── app/
    ├── index.html          The PWA itself (~741 lines, single file)
    ├── sw.js               Service worker (cache version bumped on every user-facing deploy)
    ├── manifest.json       PWA manifest, scoped to /app/
    ├── favicon.ico
    ├── icon-32.png
    ├── icon-192.png
    ├── icon-512.png
    ├── icon-maskable-192.png
    ├── icon-maskable-512.png
    └── apple-touch-icon.png
```

Note that the PWA lives at `natallie.app/app/`, not at the root. The marketing landing page is the root `index.html`. The manifest is scoped to `/app/` to match the PWA's URL.

---

## Running locally

There is no build step. The static files in this repo are served as-is.

To run the PWA locally:

```
cd app
python3 -m http.server 8000
```

Then open `http://localhost:8000/` in a browser. The service worker requires HTTP or HTTPS to register; opening `app/index.html` from `file://` will load the UI but skip service worker registration.

To preview the marketing landing page or the manual, serve from the repo root instead:

```
python3 -m http.server 8000
```

## Pre-deploy checks

Run the zero-dependency smoke suite from the repo root before deploying:

```
node scripts/predeploy-check.mjs
```

It starts a temporary local static server and checks the high-risk paths from `TEST_PLAN.md`: key pages, app-scoped manifest/icon/service-worker URLs, service-worker precache entries, external script allowlisting, and `nat-*` localStorage key reset/documentation coverage.

Vercel also runs this command automatically before publishing, through `vercel.json`. If any check fails, the Vercel build fails and the deploy is blocked.

---

## Deployment

Vercel is connected to the `main` branch of this repository. Every push to `main` triggers an auto-deploy in roughly 30 seconds. Vercel runs `node scripts/predeploy-check.mjs` as the build command before publishing the static files. There is no separate CI or preview environment in active use.

When deploying a change to `app/index.html`, `app/sw.js`, or any file in the service worker's cache list, the cache version in `app/sw.js` must be bumped. Otherwise returning users will continue to receive the cached previous version of the app until their browsers invalidate the cache on their own.

```js
const CACHE = 'natallie-v24';  // increment to v25, v26, ... on every relevant deploy
```

Files outside the cache list (the marketing landing page, the manual, the format doc, the privacy policy) do not require a cache bump; users see those changes on their next visit.

### Refactor checklist

If you move files, change PWA paths, rename `nat-*` localStorage keys, or refactor reset/export/service-worker logic, update the deployment guardrails in the same PR:

- `scripts/predeploy-check.mjs`
- `TEST_PLAN.md`
- this README
- `app/sw.js` cache version, if cached app files changed

The Vercel build runs `node scripts/predeploy-check.mjs` before deploy. If that script still reflects old assumptions after an intentional refactor, deploys may fail even when the app itself works.

---

## Coding conventions

The codebase uses a deliberate compact style. It is not the result of a missing formatter.

- Single-letter aliases for the most-used functions: `e` for `React.createElement`, `t` for the translation lookup.
- Multiple statements packed onto one line where they form a logical group.
- Inline event handlers and inline style objects.
- Short variable names in tight scope (`nm` for name, `cl` for color, `ts` for timestamp). Self-documenting in context.
- No JSX, no transpilation, no minifier. The source is the deployed code.

When making changes, match the existing density. Do not run Prettier or ESLint --fix against `app/index.html`; both will explode the file from ~741 lines to several thousand and obscure intent. The compact style is what keeps the file scannable end to end.

React patterns in use:

- `React.createElement(type, props, ...children)` aliased as `e(...)` everywhere.
- `useState`, `useRef`, `useEffect` from React 18.
- Functional components only.
- Hooks are positionally ordered (`h1`, `h2`, `h3`, ...) and must not be reordered or inserted in the middle.

---

## Data model

All persistent user data lives in `localStorage` under the following keys:

| Key | Type | Description |
|-----|------|-------------|
| `nat-s` | JSON array | Slot configuration (the buttons and boards on the home grid, recursive) |
| `nat-l` | JSON array | Log entries (every tap, with timestamp) |
| `nat-n` | string | The user's app name (default `"natallie"`) |
| `nat-pin` | string | The 4-digit app PIN, if set |
| `nat-bp` | JSON object | Per-board PINs, keyed by board ID |
| `nat-ps` | string | PIN setup flag (`"1"` if user has been through the initial PIN setup screen, set or skipped) |
| `nat-lang` | string | Language preference (`"en"` or `"ja"`) |
| `nat-tr` | JSON array | Trash (deleted slots and notes, recoverable) |
| `nat-nt` | JSON array | Notes |
| `nat-enc` | string | Encryption toggle (`"1"` if enabled, empty otherwise) |
| `nat-tz` | string | Per-tap timezone recording toggle (`"1"` if enabled, empty otherwise; off by default) |

The reset-everything action clears all eleven keys. Any new `nat-*` key added in the future must also be cleared in that path, or the app's privacy guarantees are weakened.

---

## Exports and the .natallie format

The app supports four export paths and one decrypt-only path, all gated behind the device PIN:

- CSV of logs and notes, filterable by date range
- CSV of the board layout (no logged data)
- Full backup as a `.natallie` JSON file
- Per-button or per-board CSV from the view-logs screen
- Decrypt an encrypted file back to plaintext

When the user enables "encrypt exports" in settings, all of the above export paths produce password-protected encrypted files. Encrypted backups keep the `.natallie` extension; encrypted CSVs use the `.natallie-csv` extension. The encryption envelope and its parameters (PBKDF2-SHA-256 with 200,000 iterations, AES-GCM-256, 16-byte salt, 12-byte IV) are fully specified in [FORMAT.md](FORMAT.md), so any third-party tool can read or write these files independently of natallie.

When the user enables "record timezone with each tap" in settings (off by default), each new tap is logged with an additional `tz` field containing the IANA timezone name of the device at the moment of the tap. This appears in CSV exports as an `iana_timezone` column and in backup files as a `tz` field per log entry. Taps logged before the toggle was turned on, or while it was off, do not have this field; importers should treat its absence as "timezone unknown for this tap".

Boards may also carry an optional `tb` field on their slot definition: `{start, days, mode}`. This indicates a time-boxed board, a board with a finite lifecycle. When the time-box expires, the user is prompted to export the data and either delete, extend, or convert the board to permanent. The full schema is in [FORMAT.md](FORMAT.md).

---

## Browser support

Targets modern mobile browsers: iOS Safari 15+, Chrome on Android, Samsung Internet, Edge. Service worker registration requires HTTPS in production. PWA install prompts are supported on Chrome, Edge, and Samsung Internet on Android, and via "Add to Home Screen" on iOS Safari.

iOS Safari clears `localStorage` for installed PWAs after roughly 7 days of inactivity. The current mitigation is making backups easy to invoke and prominent in the UI.

---

## License

This repository is licensed under [PolyForm Noncommercial 1.0.0](LICENSE). It is a source-available license: the code may be read, forked, and modified for noncommercial use, including building viewers, importers, or successor apps. Commercial use requires a separate arrangement with the maintainer.

The `.natallie` file format spec is published under the same license, so any tool that reads or writes the format for noncommercial purposes is in the clear.

---

## Maintainer

Hannah Hiratsuka, Tokyo, Japan. Reach out at info@natallie.app.

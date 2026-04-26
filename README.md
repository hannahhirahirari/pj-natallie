# natallie

A free, tap-based self-report event logger. Web app (PWA), with native iOS and Android wrappers planned.

**Live:** https://natallie.app
**Vercel project:** pj-natallie
the `.natallie` file format is documented at [FORMAT.md](FORMAT.md).
---

## Tech stack

- **Vanilla HTML / CSS / JavaScript** — no build step, no bundler, no framework files
- **React via CDN** (loaded as a script tag in `index.html`) — used for component structure but no JSX, no transpilation
- **PWA** — installable, offline-capable via service worker
- **Local browser storage** — all user data lives in `localStorage`, nothing transmitted
- **Hosting:** Vercel (auto-deploys on push to `main`)
- **Domain:** natallie.app (Porkbun registrar, Vercel DNS)

No npm, no yarn, no node_modules. The entire app is one HTML file plus a service worker plus icons.

---

## File structure

All files live in the repo root:

```
index.html                  Main app (single file, ~520 lines, minified-style)
manifest.json               PWA manifest with icon definitions
sw.js                       Service worker (caches app shell for offline use)
privacy.html                Privacy policy page
favicon.ico                 Browser tab icon (multi-size)
icon-32.png                 Small favicon
icon-192.png                Standard PWA icon
icon-512.png                Large PWA icon
icon-maskable-192.png       Android maskable icon (with safe-zone padding)
icon-maskable-512.png       Android maskable icon (with safe-zone padding)
apple-touch-icon.png        iOS home screen icon (180x180)
README.md                   This file
```

---

## Running locally

There is no build step. To run:

1. Clone the repo
2. Open `index.html` directly in a browser, OR
3. Serve the folder with any static server (e.g. `python3 -m http.server 8000`)

Service worker registration only works when served over HTTP/HTTPS, not from `file://` — so for full PWA testing, use a static server.

---

## Deployment

Vercel is wired to the `main` branch of this repo. Any push to `main` triggers an auto-deploy in ~30 seconds. No CI, no tests, no build process.

To force users to refresh after a deploy, bump the `CACHE` version in `sw.js` (e.g., `natallie-v14` → `natallie-v15`). Without bumping, returning users will see cached old code until their browser invalidates the cache on its own.

---

## Coding conventions

The codebase intentionally uses a compact, minified-looking style:

- Single-character variable names where scope is small (e.g., `e` for `React.createElement`, `t` for translation function)
- Multiple statements per line where logically grouped
- Inline event handlers and styles
- No build tooling means no minifier, so the source IS the deployed code

This is deliberate. The app is small enough that this style is readable once you orient to it, and it keeps the bundle size near-zero. Don't reformat to "standard" multi-line JS — the style is intentional.

Key React patterns used:
- `React.createElement(type, props, ...children)` aliased as `e(...)` everywhere
- `useState`, `useEffect`, `useRef` from React
- No JSX (would require a transpiler)
- Functional components only

---

## Data model

All user data lives in `localStorage` under these keys:

- `nat-s` — slot configuration (the buttons/boards the user has set up)
- `nat-l` — log entries (tap events with timestamps)
- `nat-n` — notes (text entries with timestamps)
- `nat-pin` — main app PIN (if set)
- `nat-bp` — per-board PINs (object keyed by board id)
- `nat-ps` — pin settings (which actions require PIN)
- `nat-lang` — language preference (`en` or `ja`)
- `nat-tr` — trash (deleted items, recoverable)
- `nat-nt` — note settings

Backups export this state as a `.natallie` JSON file. CSV exports include UTC and local timestamps plus a timezone header line.

---

## Browser support

Targets modern mobile browsers (iOS Safari 15+, Chrome on Android). Service worker requires HTTPS in production. PWA install prompts work on Chrome/Edge/Samsung Internet on Android, and via "Add to Home Screen" on iOS Safari.

---

## Maintainer
Hiratsuka Hannah, Tokyo, Japan
info@natallie.app

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## DePix Frontend

## Project Overview

DePix is a Progressive Web App (PWA) for generating PIX QR codes (deposits) and processing Liquid-to-PIX withdrawals. It's a vanilla JavaScript SPA with zero npm runtime dependencies, hosted on GitHub Pages.

**This project is one of two repos:**
- **Frontend (this repo)**: `dadafros/depix` — Vanilla JS PWA on GitHub Pages
- **Backend**: `dadafros/depix-backend` — Vercel serverless API

**Live URL**: `https://depixapp.com`

## Code Language

All new code must be written in English — variable names, function names, table/column names, comments, error messages. Existing Portuguese names (e.g., `criado_em`, `valor_centavos`) are not renamed (breaking change), but all new additions must use English.

## Architecture

- **Language**: Vanilla JavaScript with ES Modules (`type="module"`)
- **Styling**: Custom CSS (no framework — dark teal theme, mobile-first, responsive)
- **Routing**: Hash-based SPA router (`#login`, `#home`, `#reports`, etc.)
- **Storage**: `localStorage` for addresses and auth tokens
- **PWA**: Service Worker for offline caching + Web App Manifest for installability
- **Build step**: None. Zero bundler, zero framework, zero npm runtime dependencies.
- **Backend**: Communicates with `https://depix-backend.vercel.app` via authenticated fetch

### Design Philosophy
This project is intentionally zero-dependency and framework-free. All JS is vanilla ES modules loaded directly by the browser. No build step — files are served as-is.

### Module Dependency Flow
`script.js` is the single entry point imported by `index.html`. It imports everything else:
- `router.js`, `auth.js`, `api.js`, `addresses.js` — core modules (no cross-dependencies except `api.js` → `auth.js`)
- `utils.js`, `validation.js` — pure functions, no side effects, no DOM access
- `script-helpers.js` — DOM helpers extracted for testability (depends on DOM but not other modules)

## File Structure

```
depix/
├── index.html          # All views as <section data-view="xxx"> + modals + toast
├── script.js           # Main entry point — imports all modules, event handlers, app state
├── script-helpers.js   # DOM helpers extracted from script.js (showToast, setMsg, goToAppropriateScreen)
├── router.js           # Hash-based SPA router (route, navigate, initRouter)
├── auth.js             # Auth state in localStorage (getToken, setAuth, clearAuth, isLoggedIn)
├── api.js              # Fetch wrapper with auto JWT refresh on 401 (apiFetch)
├── addresses.js        # Address CRUD in localStorage (add, remove, select, abbreviate)
├── utils.js            # Pure utilities (isAllowedImageUrl, toCents, formatBRL)
├── validation.js       # Input validators (validateLiquidAddress, validatePhone)
├── style.css           # All styles — dark teal theme, responsive, animations
├── service-worker.js   # PWA cache: network-first HTML, cache-first versioned assets, auto-reload on update
├── manifest.json       # PWA manifest (name, icons, start_url, display)
├── package.json        # Dev dependencies only (vitest + jsdom for testing)
├── docs/               # API documentation (static HTML, pt-BR + en)
│   ├── index.html      # Portuguese version (default)
│   └── en/index.html   # English version
├── btcpay/             # BTCPay Server plugin page (static HTML, pt-BR + en)
│   ├── index.html      # Portuguese version (default)
│   └── en/index.html   # English version
└── tests/              # Vitest tests with jsdom environment
    ├── addresses.test.js
    ├── api.test.js
    ├── auth.test.js
    ├── integration.test.js
    ├── router.test.js
    ├── script-helpers.test.js
    ├── transactions.test.js
    ├── utils.test.js
    └── validation.test.js
```

## Screens / Views

Each view is a `<section data-view="name">` in index.html, shown/hidden by the router.

| Route | View | Description |
|-------|------|-------------|
| `#login` | Login | Username + password → JWT auth |
| `#register` | Register | Name, email, WhatsApp, username, password → create account |
| `#verify` | Verify Email | 6-digit code input → confirms email |
| `#home` | Home | Toggle between deposit (QR generation) and withdrawal (saque) |
| `#no-address` | Empty State | Shown when user has no addresses — prompts to add first one |
| `#reports` | Reports | Date range picker → requests PDF+CSV report via email |

### Home screen has two modes (toggle):
1. **Depósito**: Enter amount → Generate PIX QR code → Copy PIX code
2. **Saque**: Enter amount + PIX key → Get Liquid deposit address + QR code

## Key Patterns

### API communication (`api.js`):
- All calls go through `apiFetch(path, options)` which auto-attaches `Authorization: Bearer <jwt>`
- On 401 response: automatically attempts token refresh via `/api/auth/refresh`
- On refresh failure: clears auth, redirects to `#login`
- Device ID (`X-Device-Id` header) generated once, stored in localStorage

### Address management (`addresses.js`):
- Addresses stored in localStorage as JSON array (`depix-addresses`)
- Selected address stored separately (`depix-selected-address`)
- Abbreviation format: `tlq1qqv2...x3f8` (first 8 + ... + last 4 chars)
- Changing selected address requires password confirmation (calls `/api/auth/verify-password`)
- Adding addresses does NOT require password

### Routing (`router.js`):
- Hash-based: `window.location.hash` drives navigation
- `route(hash, onShowCallback)` registers handlers
- `navigate(hash)` changes location
- On hash change: hides all `section[data-view]`, shows matching one, calls handler

### Auth flow:
- Register → verify email code → login → get JWT + refresh token → stored in localStorage
- On app load: check `isLoggedIn()` → if yes, check `hasAddresses()` → route accordingly
- Logout: call `/api/auth/logout`, clear localStorage, navigate to `#login`

## Security

- **CSP**: Strict Content-Security-Policy in meta tag (no `unsafe-inline` for scripts since using `type="module"`)
- **img-src**: Only allows `self`, `data:` URIs, `*.eulen.app`, and `api.qrserver.com`
- **connect-src**: Only allows `https://depix-backend.vercel.app`
- **QR URL validation**: `isAllowedImageUrl()` validates every QR image URL against allowlist before setting `img.src`

## Commands

```bash
npx --yes eslint@9 .               # Run lint checks
npm test                           # Run all tests (vitest)
npm run test:watch                 # Watch mode
npm run test:coverage              # Tests with coverage report
npx vitest run tests/auth.test.js  # Run a single test file
```

Requires Node.js >= 22.

## UI/UX Notes

- **Target audience**: Non-technical Brazilian users (leigos)
- **Language**: All UI text in Brazilian Portuguese
- **Theme**: Dark teal gradient (#0f3d3e → #071b1f), accent #4fd1c5
- **Typography**: system-ui, sans-serif
- **Mobile-first**: Max card width 420px, safe area insets for notch devices
- **Error messages**: Red (#ff6b6b), always user-friendly (no technical jargon)
- **Success messages**: Green (#68d391)
- **Toast notifications**: Bottom center, auto-dismiss after 2s

## Internationalization (i18n) — Static Pages

The `/docs` and `/btcpay` pages support Portuguese (default) and English:

- **Portuguese**: `{page}/index.html` — served at root path (e.g., `/docs`)
- **English**: `{page}/en/index.html` — served at `/en` subpath (e.g., `/docs/en`)

### Critical rule: content parity
The PT-BR and EN versions of each page must have **identical content** — same sections, same structure, same information. When adding, removing, or changing any content, **always apply the change to both languages**. Never leave one version ahead of the other.

### When editing these pages:
- Update **both language versions** when changing content
- Both files must have matching `hreflang` tags (pt-BR, en, x-default)
- CSS is duplicated intentionally (pages are standalone — no shared stylesheet)
- Each page has full SEO: OG tags, Twitter Card tags, JSON-LD structured data, hreflang, canonical
- Icon paths in `/en/` files use `../../icon-192.png` (one level deeper)
- Update `sitemap.xml` when adding new pages (with `xhtml:link` hreflang annotations)
- Nav links in EN pages point to EN counterparts (`/docs/en`, `/btcpay/en`) and vice versa
- Each page has a language switcher link in the nav

### Portuguese accentuation
All Portuguese text must have correct accentuation. This is non-negotiable — unaccented Portuguese reads as broken/unprofessional. Common patterns to watch for:
- **é** (not "e") when it means "is": *é possível*, *é enviado*, *é compatível*
- **ã/ão/ões**: *não*, *descrição*, *informações*, *requisições*, *produção*, *conversão*
- **í**: *possível*, *disponível*, *compatível*, *específico*, *início*, *válido*
- **ó**: *só*, *ótimo*
- **ú**: *útil*, *único*
- **ç**: *diferenças*, *reformatação*
- **ê**: *você*, *vê*
- **à**: *à* (crase)

After any edit to Portuguese content, grep for common unaccented words to catch regressions: `especifico`, `possivel`, `voce`, `producao`, `informacoes`, `disponivel`, `conversao`, etc.

### Docs page (`/docs`) — API documentation
- **Structure**: Nav + sidebar (section links) + main content with doc-section blocks
- **Code examples**: Multi-language tabs (curl, JavaScript, Python, PHP, C#, Go, Ruby, Java) using `setLang()` JS. User's choice is persisted in `localStorage`.
- **What to translate**: Headings, prose, table headers/descriptions, alert text, code labels ("Resposta — 201 Created" → "Response — 201 Created"), copy button text ("copiar"/"copiado!" → "copy"/"copied!"), code comments inside examples, badge labels ("obrigatório"/"opcional" → "required"/"optional")
- **What NOT to translate**: Code blocks, JSON payloads, curl commands, API paths, field names in tables (amount, description, etc.), technical terms standard in English (webhook, sandbox, endpoint, checkout, merchant, slug, payload)

### BTCPay page (`/btcpay`) — Plugin landing page
- **Structure**: Hero + MED banner + 3-step setup + benefits grid + FAQ accordion + final CTA + footer
- **Translate everything visible**: Hero text, step descriptions, benefit cards, FAQ questions/answers, CTA text, footer
- **FAQ accordion**: Uses `<details>/<summary>` elements — make sure both languages have the same questions

## Local Dev Environment

A Docker-based dev environment exists at `../depix-dev/`. Use it to test changes locally before pushing to production.

```bash
cd ../depix-dev && docker compose up -d
# Frontend + API: http://localhost:2323
# Blog: http://localhost:2324
```

Frontend changes reflect immediately (volume mount). See `../depix-dev/CLAUDE.md` for full instructions.

**E2E tests**: End-to-end tests live in `../depix-dev/tests/`. They run against the local dev environment and test full user flows (registration, login, blocking, webhooks, Telegram commands). See `../depix-dev/CLAUDE.md` for instructions on running and creating E2E tests.

## Git

- Remote: `git@github-personal:dadafros/depix.git`
- SSH key alias `github-personal` maps to `~/.ssh/id_ed25519_outlook`
- Commit as: `dadafros <davi_bf@outlook.com>`
- Branch naming: `feat/*` for features, `claude/*` for Claude Code branches
- CI: GitHub Actions runs ESLint + `npm test` on push to `main` and on PRs to `main`
- Deploy: GitHub Pages from main branch

## Service Worker & Cache Versioning

### How it works

The app uses a service worker with two caching strategies:
- **HTML (`index.html`)**: Network-first — always fetches from server, falls back to cache when offline
- **Static assets (JS, CSS, images)**: Cache-first — served from cache for speed, versioned via `?v=N` query strings

A single `APP_VERSION` constant in `service-worker.js` controls all cache busting. When bumped, all asset URLs change (e.g. `script.js?v=90` → `script.js?v=91`), causing cache misses that force fresh downloads.

The SW uses `skipWaiting()` + `clients.claim()` so new versions activate immediately. The app detects `controllerchange` and auto-reloads — users never stay stuck on an old version.

### CRITICAL: Deploy checklist

**Every time you change ANY frontend file (JS, CSS, HTML), you MUST do both of these steps before pushing:**

1. **Bump `APP_VERSION`** in `service-worker.js` (line 3): e.g. `const APP_VERSION = 90;` → `const APP_VERSION = 91;`
2. **Update `?v=` query strings** in `index.html` to match the new version number. Search for `?v=` — there are ~6 occurrences (script.js, style.css, router.js, manifest.json, icons). Change all from `?v=90` to `?v=91`.

**Both steps are required.** If you only bump `APP_VERSION` but not the HTML query strings, the SW will cache new URLs but the HTML will still reference old ones. If you only bump the HTML but not `APP_VERSION`, the SW won't reinstall.

### What happens if you forget

- Users will be served stale cached files from the old service worker
- The app can break entirely if JS/CSS imports changed between versions
- There is no way to remotely force-update users — they must wait for the browser to detect the SW change

### Files involved

| File | What to change |
|------|---------------|
| `service-worker.js` line 3 | `APP_VERSION = N` → `APP_VERSION = N+1` |
| `index.html` (~6 places) | All `?v=N` → `?v=N+1` |

### Adding new files to the cache

If you create a new JS/CSS file, add it to the `STATIC_FILES` array in `service-worker.js` using the versioned template:
```js
`./new-file.js?v=${APP_VERSION}`,
```
And reference it in `index.html` with the matching query string:
```html
<script type="module" src="new-file.js?v=90"></script>
```

## Workflow Rules

- **Always start from latest main**: Before starting any task, pull the latest `main` from remote (`git pull origin main`) to ensure you're working with the most recent code.
- **Before pushing**: Always run lint (`npx --yes eslint@9 .`) and tests (`npm test`) locally before pushing. CI runs both on push — fix any failures locally first.
- **Default for simple or urgent fixes**: Small fixes, hotfixes, and urgent production issues should be committed and pushed directly to `main`.
- **Use PRs for large or complex work**: Large refactors, high-risk changes, or substantial multi-file work should go on a separate branch and be opened as a PR for review.
- **User instruction wins**: If the user explicitly asks for a different flow, follow the user's instruction.
- **Sync before branching**: If the work should go through a PR, always sync with `main` first (`git pull origin main`) before creating or updating the branch.

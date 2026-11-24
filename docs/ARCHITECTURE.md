# Architecture — VPS Panel

Copyright (c) 2026 Fedaa Mohamed. All rights reserved.

## Overview

VPS Panel is a **static single-page application** built with TypeScript and
Vite. There is no server component. The browser owns routing, state,
persistence, simulation, validation and rendering.

```text
Browser
├─ index.html (lang/dir, CSP meta, favicon)
├─ src/main.ts
│  ├─ preferences (language, theme)
│  ├─ DemoStore.tick() every 4 s
│  ├─ hourly demo reseed check
│  ├─ startRouter()
│  │  ├─ #/login        → pages/login.ts
│  │  ├─ #/demo         → guest entry (or 404 when demo mode is off)
│  │  ├─ #/dashboard    → pages/dashboard.ts
│  │  ├─ #/servers      → pages/servers.ts
│  │  ├─ #/servers/:id  → pages/server-detail.ts
│  │  ├─ #/servers/new  → pages/create-server.ts
│  │  ├─ #/billing      → pages/billing.ts
│  │  ├─ #/settings     → pages/settings.ts
│  │  └─ unknown        → standalone 404 with the concept rail
│  └─ same-origin demo epoch check (optional)
├─ DemoStore
│  ├─ guarded mutations (session + CSRF)
│  ├─ seeded simulator and power state machine
│  ├─ versioned localStorage snapshot
│  └─ guest/login throttles, hourly re-seed
└─ UI system: dom helpers, icons, rack, charts, dialogs, shell
```

The application loads no external service, tracker, CDN or third-party font
request. `fetch` is used only for the same-origin `/demo-epoch.json` reset
marker, and failure is silent.

## Source map

| Path | Responsibility |
|---|---|
| `src/main.ts` | Boot: apply language/theme, enforce demo flag, tick, start clock/router, epoch sync |
| `src/config.ts` | `VITE_DEMO_MODE`, reset interval, default language |
| `src/app/router.ts` | Hash routing, guest route, auth guard, shell/404 rendering |
| `src/pages/*` | Screen factories returning `{ el, destroy?, titleKey }` |
| `src/pages/public.ts` | About, help/FAQ, privacy, terms and changelog pages |
| `src/state/store.ts` | DemoStore: auth, guest entry, session, mutations, persistence, reseed |
| `src/lib/auth.ts` | Demo credentials, login evaluation, session creation/TTL |
| `src/lib/demo.ts` | Guest throttle, hourly reset check, epoch parsing/fetch |
| `src/lib/csrf.ts` | Illustrative page-session token |
| `src/lib/validation.ts` | Email, server name, SSH key, snapshot label, IDs |
| `src/lib/firewall.ts` | Port list/range and IPv4 CIDR parsers |
| `src/lib/wizard.ts` | Wizard steps and per-step validation |
| `src/lib/power.ts` | Pure power state machine and transient settling |
| `src/lib/simulator.ts` | Seeded PRNG, series and fleet aggregates |
| `src/lib/format.ts` | Locale-aware numbers, money, dates, uptime |
| `src/lib/csv.ts` | Formula-safe CSV cells and UTF-8 download |
| `src/data/catalog.ts` | Plans, regions and OS images |
| `src/data/seed.ts` | Deterministic demo fleet, activity, alerts, invoices |
| `src/i18n/` | Typed English dictionary, Arabic dictionary, `t`/`tm` |
| `src/ui/layout.ts` | Brand mark, concept/demo rail, sidebar, topbar, footer |
| `src/ui/dom.ts` | Safe typed DOM/SVG builders; text nodes only |
| `src/ui/icons.ts` | Original 24 px stroke geometry |
| `src/ui/charts.ts` | Sparkline, area chart, gauge, donut, bars |
| `src/ui/dialog.ts` | Focus-trapped promise dialog |
| `src/ui/components.ts` | Cards, headers, notices, empty states, stat tiles |
| `src/styles.css` | Design tokens, rack/console components, themes, print |

## Public surface

Public hash routes render a separate header/footer without the console shell:
`#/about`, `#/help`, `#/privacy`, `#/terms` and `#/changelog`. They are static
content, use reserved demo contact values and carry the tiny demo note and the
footer-only owner credit link. They do not read or mutate demo state.

## Demo state shape

`AppState` (version `3`) contains:

- `servers` — seeded fleet with snapshots, firewall rules, SSH keys, RDP info;
- `activity`, `alerts`, `invoices` — seeded history;
- `settings` — language, theme, demo profile, notification preferences;
- `session` — demo email/name/token/timestamps, `isDemo`, `isGuest`, role;
- `planId` — current demo subscription;
- `sample` — simulator counter;
- `demoResetAt` — last reseed timestamp;
- `demoEpoch` — marker from the reset CLI.

A module singleton is created lazily by `getStore()`. Tests instantiate
`DemoStore` with a fixed clock, `persist: false` and an optional demo flag.

## Mutation flow

```text
UI event → local validation → DemoStore method
  → CSRF check → session validity check
  → domain validation (store) → state update
  → activity entry → save snapshot → notify subscribers
```

Every mutation returns a discriminated result (`ok` or a stable code) and never
throws for expected invalid input.

## Demo mode and reset

- `VITE_DEMO_MODE` is read at build time by `src/config.ts`, default `true`.
- With the flag off, `/demo` and unknown routes render the 404 page, the demo
  credentials/guest UI disappear, and store login/guest calls return
  `disabled`.
- `evaluateGuestAccess` limits guest entries to five per rolling minute, then a
  60-second lock. Attempts persist in `vps.panel.guest-throttle.v1`.
- `DemoStore.tick` checks `demoResetAt` hourly and reseeds while preserving the
  session, language and theme.
- `npm run demo:reset` writes `public/demo-epoch.json`; the next boot compares
  the epoch and reseeds once.

## Persistence

- State key: `vps.panel.state.v3`; language, theme, login throttle and guest
  throttle use separate keys.
- release 1.0 keys under `fedaa.vps.*` are cleared by `clearDemoKeys()` only.
- JSON is parsed defensively; a version mismatch falls back to a fresh seed.
- `sessionStorage` is not used. Sessions live in the state snapshot (8 h TTL) and
  are documented as a demo-only trust boundary.
- Demo data is user-editable and never treated as secret.

## Rendering and accessibility

- `h()`/`s()` create text nodes and SVG attributes; there is no HTML string
  injection.
- The shell has a skip link, focusable `main`, labelled navigation, focus-trapped
  drawer and dialog, visible focus rings and reduced-motion support.
- Charts pair colour with text labels; status is never conveyed by colour alone.
- `html[lang][dir]` changes on language switch; CSS uses logical properties.
- A concept badge sits on login/public pages; signed-in screens add the demo-mode line. The 404 page keeps the concept rail.

## Testing

- Server list filters collapse into a phone bottom sheet; the list paginates at
  eight cards. Search highlights matches with DOM `<mark>` nodes. Server and
  invoice exports use the own-code formula-safe CSV helper.
- Vitest + jsdom cover auth/throttle, guest limits, reset timing/epoch, store
  mutations, validation, simulator determinism, i18n parity and page smoke
  rendering.
- Playwright Core runs headless Edge against the dev server for real layout,
  language, theme, mobile overflow and keyboard-focus checks.
- No test is skipped or weakened to make the suite pass.

## Security headers

`vite.config.ts` sends CSP, frame denial, nosniff, referrer, permissions, COOP
and CORP for dev/preview. `public/_headers` provides the same for static hosts,
including HSTS over HTTPS. `frame-ancestors` and HSTS cannot be set by a meta
tag. See `docs/SECURITY-REVIEW.md`.

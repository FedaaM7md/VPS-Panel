# Testing — VPS Panel

Copyright (c) 2026 Fedaa Mohamed. All rights reserved.

Last verified: **2026-11-24** on Windows 11 with Node 24.12.0, npm 11.6.2,
TypeScript 7.0.2, Vite 8.3.8 and Microsoft Edge 158. This includes the release 1.1
review fix round.

## Commands and real results

### Type-check

```powershell
cd vpspanel
npm run typecheck
```

```text
> fedaa-vps-panel@0.2.0 typecheck
> tsc --noEmit

(no errors)
```

### Unit and DOM tests

```powershell
npm test
```

```text
> fedaa-vps-panel@0.2.0 test
> vitest run

 RUN  v5.1.1 vpspanel

 Test Files  11 passed (11)
      Tests  106 passed (106)
```

Suites:

| File | Focus |
|---|---|
| `tests/auth` cases inside `store.test.ts` | wrong credentials, lockout, unlock, token rotation, CSRF/session |
| `tests/demo.test.ts` | demo flag, guest throttle, hourly reset, epoch, guest sessions, demo email lock |
| `tests/store.test.ts` | power, wizard/store creation, snapshots, firewall, SSH, plan, profile, reset, persistence |
| `tests/pages-smoke.test.ts` | login, authenticated pages/tabs, server pagination/filter sheet/highlighting, wizard, settings |
| `tests/public-and-csv.test.ts` | public pages, footer credit, CSV formula safety, toast timeout and undo |
| `tests/i18n.test.ts` | key parity, placeholder parity, localisation ratio, RTL/LTR |
| `tests/firewall.test.ts` | port lists/ranges, CIDR, notes |
| `tests/seed.test.ts` | deterministic seed, documentation IPs, fictional keys, references |
| `tests/simulator.test.ts` | deterministic series and fleet aggregates |
| `tests/format.test.ts` | locale numbers, money, dates, relative time |
| `tests/wizard.test.ts` | step validation, name rules, plan/image compatibility |

No test is skipped, removed or loosened. The suite covers demo mode, guest
throttling, profile-email locking, reseeding, public product pages, CSV safety,
toast timing and server pagination.

### Production build

```powershell
npm run build
```

```text
> fedaa-vps-panel@0.2.0 build
> tsc --noEmit && vite build

vite v8.3.8 building client environment for production...
✓ 51 modules transformed.
dist/index.html                                          1.54 kB │ gzip:  0.78 kB
dist/assets/mada-arabic-*.woff2 / *.woff                 11–15 kB each
dist/assets/mada-latin-*.woff2 / *.woff                   11–15 kB each
dist/assets/jetbrains-mono-latin-*.woff2 / *.woff         21–28 kB each
dist/index.html                                          3.42 kB │ gzip:  1.18 kB
dist/assets/index-*.css                                  65.70 kB │ gzip: 12.60 kB
dist/assets/index-*.js                                  266.54 kB │ gzip: 73.76 kB
✓ built in 257ms
```

Fonts are emitted locally. There are no CDN references.

### Visual and interaction QA

```powershell
npm run dev          # terminal 1, port 5175
npm run qa:visual    # terminal 2
```

Latest run: 2026-11-24, 46 checks passed, 0 console or page errors, 0 failures.

Covered:

- security headers actually returned by the dev server;
- language-specific concept/demo rail, Arabic-only badge and Arabic RTL;
- owner credit only in the footer, linked to fedaamohamed.com with `noopener`;
- Mada font on the Arabic login eyebrow and no positive letter-spacing on Arabic text;
- public About and Help pages, contact values and demo footer note;
- guest entry, Arabic guest eyebrow, rack rows and footer copyright;
- toast auto-dismiss after four seconds;
- servers table, firewall rules, scripted console, invoices;
- demo-email lock and reset control;
- language switch to English LTR, light theme, logout;
- mobile 375 px: login, dashboard, cards above the fold, collapsed filter sheet,
  drawer, server detail, English switch;
- tablet 820 px: servers without page-level overflow;
- keyboard focus reaches an interactive element.

Evidence: `docs/qa-results.json`. Captures: 21 PNG files in
`docs/screenshots/` (Arabic and English, desktop / tablet / mobile) plus
`public/og-cover.png` for the social preview.

### Demo mode off (build-level check)

```powershell
$env:VITE_DEMO_MODE='false'; npm run build
npm run preview
```

Verified in headless Edge against the production bundle:

```text
demo route has 404: true
demo route has guest button: false
login has guest button: false
login shows disabled notice: true
login shows demo password: false
errors: []
```

The normal build was restored afterwards (`VITE_DEMO_MODE` unset, default true).

### Demo reset CLI

```powershell
npm run demo:reset
```

```text
Demo epoch written to vpspanel\public\demo-epoch.json
epoch: demo-20261123235856-wr17ep
The next page load reseeds the demo data and keeps the session.
```

The epoch marker is read by the app on the next boot. The hourly in-browser
reseed path is covered by `tests/demo.test.ts` with a fixed clock.

### Dependency audit

```powershell
npm audit
npm audit --omit=dev
```

```text
found 0 vulnerabilities
found 0 vulnerabilities
```

## What is not tested

- Firefox and Safari rendering (only Chromium/Edge was exercised).
- Screen-reader output; only keyboard focus and structural semantics were
  checked manually and in DOM tests.
- Real backend, provider API, payment, SSH, RDP or telemetry, because none
  exists in this concept.
- Arabic CLDR plural forms; counts use neutral phrasing.

## Limitations of the test suite

- jsdom verifies logic and DOM structure, not pixels.
- Visual QA depends on the local Edge executable and the dev server on port
  5175; it is a local QA tool, not a CI service.
- LocalStorage can be edited outside the tests, so the demo boundary tests
  prove the intended flow, not a security guarantee.

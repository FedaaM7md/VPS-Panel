# Install and run — VPS Panel

Copyright (c) 2026 Fedaa Mohamed. All rights reserved.

## Environment

| Tool | Verified version |
|---|---|
| Windows | Windows 11, PowerShell 5.1 |
| Node.js | v24.12.0 |
| npm | 11.6.2 |
| Git | 2.51.1.windows.1 |

No PHP, Composer, database, Docker or WSL is used by this project. The only
server is Vite on port **5175**.

## Exact commands

```powershell
cd vpspanel
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

Open <http://localhost:5175>. The app starts in Arabic, dark console theme.
Use the language button in the top bar or login screen to switch to English.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on 5175, strict port |
| `npm run build` | `tsc --noEmit` then production bundle into `dist/` |
| `npm run preview` | Preview the production bundle on 5175 |
| `npm run typecheck` | TypeScript only |
| `npm test` | Vitest run (10 files) |
| `npm run qa:visual` | Headless Edge QA; requires the dev server on 5175 |
| `npm run demo:reset` | Writes a new demo epoch; next load reseeds demo data |

## Environment file

Copy `.env.example` to `.env.local` only if you need to override values:

```text
VITE_APP_NAME=VPS Panel
VITE_DEMO_MODE=true
APP_DEBUG=false
```

Never commit `.env`, `.env.local` or any real secret. The build has no secret
to configure. `VITE_DEMO_MODE=false` disables guest entry and the demo account;
it is intended only for a build that is wired to a real backend.

## Fonts

Fonts are installed from npm and bundled locally:

```powershell
npm install @fontsource/mada@5.2.8 @fontsource/jetbrains-mono@5.2.8
```

No font is fetched from a CDN at runtime.

## Visual QA

Microsoft Edge must exist at:

```text
C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
```

Then, with `npm run dev` running in another terminal:

```powershell
npm run qa:visual
```

Screenshots are written to `docs/screenshots/` and the check log to
`docs/qa-results.json`. Stop the dev server when finished.

## Troubleshooting

- **Port 5175 in use:** stop the previous Vite process. `strictPort` fails
  instead of silently choosing another port.
- **Fonts look like system fallback:** confirm `npm install` completed and the
  Mada/JetBrains Mono packages exist in `node_modules/@fontsource/`.
- **Stale demo data after an upgrade:** open Settings → Reset demo data, or run
  `npm run demo:reset` and reload.
- **Edge not found:** adjust `EDGE` in `scripts/qa-visual.mjs`; do not install a
  browser globally just for QA.

## Ownership

Proprietary. Copyright (c) 2026 Fedaa Mohamed. All rights reserved. See
`LICENSE`.

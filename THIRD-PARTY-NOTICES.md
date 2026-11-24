# Third-party notices — VPS Panel

Copyright (c) 2026 Fedaa Mohamed. All rights reserved.

This repository contains original application code, design and documentation,
plus the third-party packages and fonts below. Third-party material remains the
property of its authors under the stated licences. Nothing here claims ownership
of third-party code or fonts.

## Direct dependencies

| Name | Version | Licence | Scope |
|---|---|---|---|
| @fontsource/mada | 5.2.8 | SIL Open Font License 1.1 (OFL-1.1) | Self-hosted UI font |
| @fontsource/jetbrains-mono | 5.2.8 | SIL Open Font License 1.1 (OFL-1.1) | Self-hosted mono font |
| typescript | 7.0.2 | Apache-2.0 | Compiler / type-check |
| vite | 8.3.8 | MIT | Build and dev server |
| tailwindcss | 4.3.5 | MIT | Styling |
| @tailwindcss/vite | 4.3.5 | MIT | Vite integration |
| vitest | 5.1.1 | MIT | Unit tests |
| jsdom | 29.1.1 | MIT | Test DOM |
| @types/node | 26.6.6 | MIT | Development typings |
| playwright-core | 1.65.1 | Apache-2.0 | Optional visual QA only; not bundled |

All direct dependencies are in the permitted set (MIT, Apache-2.0, OFL for
fonts). No GPL, AGPL or LGPL direct dependency is used.

## Fonts

**Mada** — UI text in Arabic and Latin. Self-hosted via `@fontsource/mada`,
weights 400, 500, 600 and 700, Arabic and Latin subsets. Licensed under the SIL
Open Font License, Version 1.1.

**JetBrains Mono** — IP addresses, logs, identifiers, metrics and prices.
Self-hosted via `@fontsource/jetbrains-mono`, weights 400, 500 and 600, Latin
subset. Licensed under the SIL Open Font License, Version 1.1.

Both fonts are emitted under `dist/assets/` at build time. No font request leaves
the origin. Cairo was removed in release 1.1.

## Transitive packages

A scan of the installed tree on 2026-11-24 found these licence families:

| Licence | Count | Notes |
|---|---|---|
| MIT | 72 | Build, test and small helper packages |
| Apache-2.0 | 6 | Tooling and typings |
| BSD-2-Clause / BSD-3-Clause | 4 | Helper packages |
| ISC / 0BSD / MIT-0 | 5 | Helper packages |
| BlueOak-1.0.0 | 2 | `lru-cache`, `graceful-fs` in the toolchain |
| CC0-1.0 | 1 | `mdn-data` reference data |
| MPL-2.0 | 2 | `lightningcss` and its Windows binary, used by Vite/Tailwind |
| OFL-1.1 | 2 | The two font packages |

MPL-2.0 is file-level copyleft, not GPL/AGPL/LGPL, and applies to build tooling
only. The complete installed tree contains **no GPL, AGPL or LGPL** package.

`npm audit` reported **0 vulnerabilities** at delivery (both production and full
tree). `npm ls --depth=0` listed two optional/extraneous helper packages in the
local `node_modules` (`@emnapi/wasi-threads`, `tslib`) that are pulled by the
toolchain's optional native pieces; they are not runtime dependencies of the
shipped bundle.

## Assets and brand

- The VPS Panel shield-rack logo, wordmark, icon geometry, charts, layout and
  illustrations are original work for this project.
- No third-party logos, stock photos, icon packs, trackers or CDN assets are
  included.
- Screenshots in `docs/screenshots/` are captures of this application.
- The app loads no external service. The only request is the same-origin demo
  epoch file used for reseeding.

## Verification commands

```powershell
cd vpspanel
npm ls --depth=0
npm audit
npm audit --omit=dev
```

Licence names come from the installed `package.json` files. If a downstream
policy requires a narrower allowlist than MIT/BSD/Apache/ISC/OFL, re-audit and
replace the build toolchain before distribution.

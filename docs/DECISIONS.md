# Decisions — VPS Panel

Status values: **Accepted**, **Superseded**, **Deferred**. Dates refer to the concept build (2026-11-23).

## D-001 — Vanilla TypeScript DOM instead of a UI framework

**Status:** Accepted

**Context:** The task allows vanilla TS or a lightweight framework (Preact/Lit). The project must remain original, fast and dependency-light.

**Decision:** Use a tiny typed DOM builder (`h`, `s`) plus page factories. No UI framework is bundled.

**Consequences:** Full control of markup, accessibility and RTL; smaller runtime. More manual re-render code and no component library; mitigated by page-local update functions and shared UI helpers.

## D-002 — Hash routing

**Status:** Accepted

**Decision:** Route with `#/path?query`, using `hashchange` plus a small route event for programmatic refreshes.

**Why:** A pure static build can be hosted from any subdirectory without rewrite rules.

**Consequences:** Ugly URLs and hash-based sharing; acceptable for a concept. A production panel would use history routing and a server rewrite.

## D-003 — Deterministic seeded simulator

**Status:** Accepted

**Decision:** FNV-1a hashing + mulberry32 PRNG; metric series seeded by `serverId:metric` with a sample offset derived from a 4-second clock bucket.

**Why:** The UI must look alive while remaining honest, reproducible and testable. No network or telemetry exists.

**Consequences:** All values are synthetic and explicitly labelled. Tests can assert exact determinism. Charts do not reflect real usage.

## D-004 — Single 4-second application clock

**Status:** Accepted

**Decision:** One module-level interval drives the sample counter, settles transient server states, and emits tick events to mounted charts.

**Why:** Avoid per-chart timers, keep CPU cost low, and make status transitions predictable.

**Consequences:** A demo reboot takes 6 seconds and provisioning 12 seconds. Hidden tabs are not explicitly throttled beyond browser behaviour.

## D-005 — In-memory store + versioned localStorage snapshot

**Status:** Accepted

**Decision:** A `DemoStore` class owns state, guards mutations and persists a versioned JSON snapshot. Seeded demo data is rebuilt when the version is missing or mismatched.

**Why:** Persistence across reloads in a pure client app, with easy reset.

**Consequences:** localStorage is user-editable, so it is not a trust boundary. Session tokens and demo data are readable by any script on the origin. Real deployments must use server state.

## D-006 — One documented demo account with local lockout

**Status:** Accepted

**Decision:** Accept only `ops@nilegrid.example` / `NileGrid#2026` (renamed in release 1.1); expose both on the login screen; lock for 60 seconds after five failures; persist the counter. Guest entry is a separate, rate-limited path.

**Why:** The task requires a documented demo account and rejects other credentials. Throttling demonstrates the interaction pattern without pretending to be security.

**Consequences:** Anyone can read the credentials. Lockout can be bypassed by clearing localStorage. Documented in `SECURITY.md`.

## D-007 — Illustrative CSRF token in every mutation

**Status:** Accepted (demo-only)

**Decision:** Issue an in-memory token per page session; require it for all data mutations; rotate on sign-in and clear on sign-out.

**Why:** Shows where CSRF checks belong and exercises authorization flow in tests.

**Consequences:** Not a real security boundary. Production must enforce CSRF server-side with a session-bound token and cookies.

## D-008 — Tailwind CSS v4 with semantic CSS variables

**Status:** Accepted

**Decision:** Use Tailwind v4 via the Vite plugin, custom `brand`/`accent` palettes, CSS variables for light/dark surfaces, and semantic component classes (`card`, `btn`, `input`, etc.).

**Why:** Rapid, consistent UI with a distinct identity and logical-property support.

**Consequences:** Build-time transitive dependencies include MPL-2.0 tooling (documented in `THIRD-PARTY-NOTICES.md`). No runtime framework is added.

## D-009 — Arabic-first typed dictionaries

**Status:** Accepted

**Decision:** English is the canonical object; Arabic is typed as `typeof en`; `t()` has a compile-time key union; a runtime test checks key and placeholder parity.

**Why:** Prevents missing Arabic strings in a bilingual product.

**Consequences:** Adding a key requires editing both dictionaries. Dynamic error codes use `tm()` with a safe fallback. Full Arabic plural morphology is not implemented.

## D-010 — Self-hosted Mada + JetBrains Mono and original visual identity (release 1.1)

**Status:** Accepted

**Decision:** Bundle Mada (UI) and JetBrains Mono (IPs/logs) through `@fontsource/*` (OFL 1.1); create the shield-rack mark, icons and charts originally; use console `#10151F`, panel `#1A2230`, steel `#8A99AD`, cyan `#00C2D1`, power green `#22C55E` and light steel-white `#F2F4F7`. Cairo and the indigo/teal palette were removed in release 1.1.

**Why:** Requirement for self-hosting, OFL font and original identity; no CDNs or third-party logos.

**Consequences:** ~250 KB of font files in the build (subset-split). No remote fallback; system fonts are used if the font fails.

## D-011 — Simulated state transitions with explicit invalid-action results

**Status:** Accepted

**Decision:** Keep power transitions as a pure function taking `nowMs`; return discriminated results; confirm all user power actions in a modal; never throw for expected invalid actions.

**Why:** Testability, honest UX and no accidental “everything works” illusion.

**Consequences:** Invalid transitions simply do nothing and show a toast. The UI shows all three actions with disabled states rather than hiding them.

## D-012 — Destructive and creation flows use modal forms

**Status:** Accepted

**Decision:** Snapshot creation, firewall rules and SSH keys use accessible dialogs with inline validation. Delete actions use confirmation dialogs.

**Why:** Keeps pages simple, centralises focus trapping and makes the interaction demonstrable.

**Consequences:** A little more code per form and modal focus management. Tables remain largely read-only plus per-row actions.

## D-013 — Documentation IP ranges and fictional keys

**Status:** Accepted

**Decision:** Use only RFC 5737 documentation ranges (`203.0.113.0/24`, `198.51.100.0/24`, `192.0.2.0/24`) and `2001:db8::/32`; every seeded SSH key contains “fictional” and cannot be used.

**Why:** Avoid implying real infrastructure or credentials.

**Consequences:** Some values look artificial by design; that is intentional and labelled.

## D-014 — Testing and visual QA with local tools only

**Status:** Accepted

**Decision:** Vitest + jsdom for unit/integration/smoke tests; Playwright Core driving the locally installed Microsoft Edge for optional visual QA; no CI service, no remote browsers, no downloaded browser binaries.

**Why:** Reproducible, network-light verification on the assigned machine; satisfies “run it, don’t claim it”.

**Consequences:** Only Chromium tested; visual QA requires Edge and a running dev server. Screenshots and `docs/qa-results.json` are committed as evidence.

## D-015 — No backend, payments, email or real provider integration

**Status:** Accepted (scope)

**Decision:** The concept deliberately stops at the UI and simulated domain layer.

**Why:** The task is explicitly a concept UI showcase that must never connect to a server or external API.

**Consequences:** Billing, authentication, provisioning, RDP, SSH, monitoring and notifications are illustrative only. `ROADMAP.md` lists the production gap.

## Deferred / rejected alternatives

- **React/Vue/Svelte:** rejected to keep the bundle and identity fully original and dependency-light.
- **IndexedDB:** unnecessary for this state size; localStorage is simpler and inspectable.
- **Service worker:** rejected; no offline requirement and it complicates cache semantics.
- **Real-time WebSocket metrics:** rejected by the “never connect” rule.
- **Tailwind UI/component libraries:** rejected; all components are original.
- **GitHub/remote CI:** prohibited by the environment rules; all checks ran locally.

## Deviations from the original brief

- The wizard uses six steps (Basics, Plan, Region, Image, Access, Review) rather than five, because a server name needs its own validated step. All required steps (plan, region, OS image, auth method, review) are present.
- The server table is shown only at ≥1280 px; tablets use a two-column card grid to avoid page-level horizontal overflow. Wide tables remain horizontally scrollable inside their cards.
- The console is a scripted log stream with a handful of simulated commands, not a shell.
- `frame-ancestors` is omitted from the meta CSP because browsers ignore it in meta; production must send it as a header.

## release 1.1 additions

### D-013 — Demo mode is a build-time flag

**Status:** Accepted

**Decision:** `VITE_DEMO_MODE` (default true) gates guest entry, the demo credentials and the `/demo` route. Turning it off makes those entry points disappear and `/demo` render 404. Password login also returns `disabled`.

**Why:** release 1.1 requires a demo entry that vanishes for a real build, without pretending the client can authenticate anyone.

**Consequences:** A build with demo mode off has no usable sign-in until a server-side identity provider is connected. This is documented in README, SECURITY and ROADMAP.

### D-014 — Guest entry is rate-limited, not anonymous trust

**Status:** Accepted

**Decision:** `guestLogin()` creates a normal administrator demo session with a new token, but is limited to five entries per rolling minute with a 60-second cooldown. The limit is persisted separately from the login throttle.

**Why:** The showcase needs one-click access while still demonstrating a public abuse control and avoiding an unthrottled session factory.

### D-015 — Hourly reseed plus a CLI epoch marker

**Status:** Accepted

**Decision:** The store reseeds seeded data when `demoResetAt` is over an hour old, preserving session, language and theme. `npm run demo:reset` writes a new same-origin `public/demo-epoch.json`; the next boot applies it once.

**Why:** release 1.1 asks for a reset command and an hourly schedule in a client-only app. A static epoch file is the smallest mechanism that works without a backend and without an external service.

**Consequences:** The reset is a demo convenience, not a security boundary. Each visitor's localStorage remains editable.

### D-016 — Headers over meta, and a written residual-risk list

**Status:** Accepted

**Decision:** Send CSP, frame denial, referrer, permissions, COOP and CORP from Vite dev/preview and document `public/_headers` for static hosting. Keep the meta CSP as a fallback and omit unsupported directives there.

**Why:** `frame-ancestors` and HSTS are ignored in meta tags; the browser console warning is a real symptom of an unenforceable policy.

**Consequences:** Static hosts that do not support `_headers` must translate the file to server configuration. Residual client-only risks are listed in `docs/SECURITY-REVIEW.md`.

## Fix round 1

### D-017 — Typography: Arabic never inside a Latin-only mono context

**Status:** Accepted

**Decision:** Mada is the Arabic fallback in the mono stack, and RTL technical labels reset letter-spacing to zero. Arabic strings were removed from mono/tracked containers app-wide; JetBrains Mono remains for IPs, IDs, logs and specs.

**Why:** Review round 1 found Arabic letter-spaced and disconnected in the login eyebrow and helper labels. A fallback plus targeted cleanup fixes the class of bug rather than one instance.

### D-018 — Public product pages and footer-only owner credit

**Status:** Accepted

**Decision:** Add About/contact, Help & FAQ, Privacy, Terms and Changelog as public hash routes. The brand stands alone; the only owner credit is the bottom footer link to fedaamohamed.com with rel=noopener. Public pages show a tiny demo note, not the demo-mode banner.

**Why:** The addendum requires a real-product surface and moves the owner credit out of headers/logos. The concept badge remains the product descriptor; the demo banner remains inside signed-in screens.

### D-019 — Phone-first server filters, pagination and own-code CSV/undo

**Status:** Accepted

**Decision:** Search stays visible; status/region/OS/sort move into a bottom sheet opened by a Filter button with a live result count. The list paginates at eight cards. CSV export and undo toasts are implemented in own code (`lib/csv.ts`, `toast` action), with no new dependency.

**Why:** The previous five full-width controls pushed the server list below the phone fold, and the addendum asks for export, pagination and undo with original code.

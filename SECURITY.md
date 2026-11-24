# Security — VPS Panel

Copyright (c) 2026 Fedaa Mohamed. All rights reserved.

## Status: demo, not production

This repository is a **client-side concept UI showcase**. It has no backend,
real accounts, real servers, payment processing or sensitive infrastructure
data. It must never be presented or used as a production hosting panel.

The documented demo account (`ops@nilegrid.example` / `NileGrid#2026`) and the
guest entry are intentionally public. They unlock simulated data only.

A detailed threat model and review is in
[docs/SECURITY-REVIEW.md](docs/SECURITY-REVIEW.md).

## Demo mode

- Controlled by `VITE_DEMO_MODE` (default `true`).
- When `false`: the guest button, demo credentials and `/demo` route disappear;
  `/demo` and unknown routes render 404, and password sign-in is rejected.
  A build with demo mode off is unusable until a real identity provider is
  connected.
- Guest entry creates an administrator demo session with a new token.
- Guest entry is limited to five attempts per rolling minute, then a 60-second
  cooldown. The limit is persisted in localStorage.
- Demo data reseeds every hour and after `npm run demo:reset`. Session,
  language and theme are kept.
- The demo email is locked in the UI and rejected by the store if a modified
  request changes it. Name and company remain editable.

## Controls in this build

### Authentication and session

- One documented demo account; other credentials rejected with a generic error.
- Five failed sign-ins → 60-second lock, persisted across reloads.
- Hidden honeypot field rejects naive form bots.
- Every successful sign-in (password or guest) rotates the session token and
  the CSRF token.
- Sessions expire after 8 hours and are rejected on boot and on each mutation.
- Sign-out clears the session and CSRF token.

### Authorization and CSRF

Every data mutation (`power`, server creation, snapshots, firewall, SSH keys,
billing, profile, notifications, alerts, reset) requires a valid session **and**
a CSRF token issued for the current page session. Cosmetic preferences
(language/theme) are allowed before sign-in; they carry no sensitive data.

This is an illustrative client-side pattern, not a server trust boundary. See
the production checklist in `docs/SECURITY-REVIEW.md`.

### Input and output

- Server names, snapshot labels, profile fields, SSH key shape, keys, ports/CIDR
  and passwords are validated before mutation.
- Output is built with DOM text nodes and attribute APIs. There is no
  `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval` or `document.write`.
- No user-controlled redirect target; routes are fixed hash paths.
- No Markdown/HTML rendering, file uploads or CSV exports exist.

### Headers and CSP

The dev/preview server sends:

- `Content-Security-Policy` with `default-src 'self'`, self-hosted scripts,
  styles, fonts and images, `frame-ancestors 'none'`, `object-src 'none'` and no
  third-party connect targets.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer`, Permissions-Policy, COOP and CORP.

`public/_headers` documents the same headers for Cloudflare Pages/Netlify-style
hosts, including HSTS for HTTPS. `frame-ancestors` and HSTS cannot be delivered
by a meta tag, so a static host must send the header file or equivalent config.

### Network and secrets

- The app loads no CDN, tracker, analytics, third-party font or external API.
- The only request is the same-origin `/demo-epoch.json` reset marker; it has no
  user-controlled target and fails silently.
- No `.env` is committed. `.env.example` has dummy values and `APP_DEBUG=false`.
- No API keys, private keys or real credentials are stored. Sample SSH keys are
  fictional and labelled.
- `localStorage` holds demo state, preferences and the demo session. It can be
  cleared or edited; this is not a trust boundary.

### Dependencies

Direct dependencies are Mada and JetBrains Mono (OFL 1.1), plus MIT/Apache-2.0
build/test tools. `npm audit` reported 0 vulnerabilities at delivery. Full
attribution: [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Production checklist

Before any real deployment:

1. Replace demo auth with a server-side provider; use HttpOnly/Secure/SameSite
   sessions with server-side revocation.
2. Enforce authorization and CSRF on the server, not in the browser.
3. Add MFA, password reset with expiry, email verification and audit logging.
4. Move rate limits and lockouts to the server; add alerting.
5. Send the security headers over HTTPS and enable HSTS.
6. Add upload scanning if uploads are introduced.
7. Run dependency, container and infrastructure scans in CI.
8. Test Firefox/Safari and with screen readers, not only Chromium.

## Reporting

This is a private, proprietary concept project. Report issues to the owner,
Fedaa Mohamed. Do not publish exploit details or demo data publicly.

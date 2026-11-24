# Security review — VPS Panel (release 1.1)

Date: 2026-11-24
Scope: the client-side concept build in this repository. It has no backend,
database, file storage, payment processor or provider credential. This review
hardens the demo boundary and documents what a production build must add.

## Threat model

| Asset | Exposure | Relevant threat | Control in this build |
|---|---|---|---|
| Demo account and guest entry | Public login page | Credential stuffing, bot loops | Five failed sign-ins → 60 s lock; five guest entries per minute → 60 s lock; honeypot; generic error |
| Session token | Browser localStorage | XSS, shared device, token theft | Strict CSP, no HTML injection, 8 h TTL, new token per sign-in, explicit logout, no remote scripts |
| Demo fleet and invoice data | Browser localStorage | Tampering | Not a trust boundary; clearly labelled simulated data; hourly reseed |
| CLI reseed marker | `public/demo-epoch.json` | Spoofed reset | Same-origin static file; reset only reseeds demo data and keeps the session |
| User profile | Settings | Changing the demo identity email | Email locked in UI and rejected in the store for demo sessions |
| Source and brand | Repository | Unauthorised reuse | Proprietary `LICENSE`, `COPYRIGHT.md`, `NOTICE`, source headers |

## Checked and fixed

1. **Guest entry authorization.** A new `/demo` route creates a guest session
   only when `VITE_DEMO_MODE` is enabled. When disabled, the route is not
   registered and renders the 404 page; the demo account and guest button also
   disappear. Store methods still require a valid session plus CSRF token.
2. **Guest rate limiting.** `evaluateGuestAccess` keeps a rolling one-minute
   window in localStorage (five entries), then locks for 60 seconds. The login
   page shows the remaining time and cannot bypass the lock by reloading.
3. **Profile email lock.** Demo sessions can edit name and company, but the
   email field is disabled and `updateProfile` returns `settings.emailLocked`
   if a modified request changes it. There is no password-change or
   admin-creation surface to abuse.
4. **Login abuse.** The existing five-attempt/60-second lock is retained. A
   hidden honeypot field is present; filling it rejects the submission without
   calling the credential check. Error copy stays generic.
5. **Session handling.** Every successful password or guest sign-in issues a new
   token and rotates the CSRF token. Sessions expire after eight hours and are
   rejected on boot and on every mutation.
6. **Security headers.** CSP (self-hosted scripts/styles/fonts, no objects,
   no framing, no third-party connections), `frame-ancestors 'none'`,
   `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
   `Referrer-Policy: no-referrer`, Permissions-Policy, COOP and CORP are sent by
   the dev/preview server and documented for static hosting in `public/_headers`.
   HSTS is in `_headers` for HTTPS hosting; it is not sent on plain localhost.
7. **Output safety.** All user-visible text goes through text nodes and attribute
   builders. A scan found no `innerHTML`, `outerHTML`, `insertAdjacentHTML`,
   `eval`, `new Function` or `document.write`. No Markdown/HTML rendering.
8. **CSV export.** Server and invoice exports quote every cell and prefix
   formula-leading values (`=`, `+`, `-`, `@`, tab, carriage return) with an
   apostrophe to prevent spreadsheet formula injection. A unit test covers this.
9. **Public pages.** About/contact, help, privacy, terms and changelog are static
   documents with reserved contact values. They do not expose console state or
   accept input; the footer carries the demo note and owner credit link.
10. **Owner credit.** The only owner mention in the UI is the bottom footer link
    to `https://fedaamohamed.com` with `rel="noopener"`. It is not authorization
    or a data flow.
11. **Uploads and outbound calls.** There is no upload surface. The only request
    is the same-origin `/demo-epoch.json` check used for reseeding; it has no
    user-controlled target and fails silently offline. No external service,
    tracker, CDN or analytics is loaded.
12. **Secrets.** No `.env` is committed. `.env.example` has dummy values only and
    `APP_DEBUG=false`. No API keys, passwords or private keys are stored; sample
    SSH keys are fictional and labelled.
13. **Dependencies.** `npm audit` reports zero vulnerabilities; direct
    dependencies are Mada and JetBrains Mono (OFL), plus MIT/Apache-2.0 build
    tools. No new library was added in this round. See `THIRD-PARTY-NOTICES.md`.

## Authorization test coverage

`tests/store.test.ts` and `tests/demo.test.ts` verify:

- mutations fail without a session and without a CSRF token;
- a wrong CSRF token fails even with a valid session;
- demo mode off rejects guest and password sign-in;
- guest entry is limited and reports a retry delay;
- profile email changes are rejected for a demo session;
- CLI epoch changes reseed data without invalidating the session;
- expired sessions are signed out on boot.

The UI additionally routes unauthenticated visitors away from every protected
page and shows the 404 page for unknown routes.

## Remaining risks (accepted for a concept build)

1. **Client-side only.** There is no server to enforce authorization, rate
   limits or CSRF. localStorage is editable and the demo credentials are public
   by design. Anyone can bypass the UI with devtools.
2. **Session token in localStorage.** This is readable by any script that runs in
   the origin. The strict CSP and absence of third-party scripts reduce the XSS
   surface, but production must use an HttpOnly, Secure, SameSite cookie and a
   server-side session store.
3. **No MFA, password reset, email verification, account lockout notification,
   audit export or "log out everywhere".** These need a backend identity layer.
4. **Hourly reset is a UX promise, not a security control.** A visitor can keep
   altered demo data in their own browser until the next reset.
5. **Only Chromium/Edge was exercised.** Firefox and Safari are untested.
6. **Static-host headers depend on the host.** `public/_headers` is honoured by
   Cloudflare Pages/Netlify-style hosts; other hosts need equivalent
   configuration.

## Production checklist

- Replace demo auth with a server-side identity provider; enforce policy on
  every route and record.
- Store sessions in HttpOnly/Secure/SameSite cookies with rotation and
  server-side revocation.
- Move CSRF tokens to a session-bound, server-verifiable mechanism with origin
  checks.
- Enforce rate limits and lockouts on the server; add MFA for administrators.
- Add an append-only audit log for sign-in, power, firewall, snapshot, key and
  billing actions.
- Serve all assets with the headers in `public/_headers`; terminate HTTPS and
  enable HSTS.
- Run dependency and container scans in CI; keep the licence allowlist.
- Add upload scanning, MIME sniffing and re-encoding if uploads are introduced.
- Test with screen readers and Firefox/Safari in addition to automated checks.

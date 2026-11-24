# Roadmap — VPS Panel

Copyright (c) 2026 Fedaa Mohamed. All rights reserved.

This is a concept UI showcase, not a hosting product. The roadmap separates what
exists in the demo from what a production panel would need. No item below should
be read as a promise or a shipped feature.

## Delivered in the concept (release 1.1)

- Infrastructure-console identity: rack rows, steel/cyan palette, Mada +
  JetBrains Mono, original shield-rack mark and favicon.
- Arabic-first RTL and English LTR, with identical translation key sets and
  natural operations copy.
- Login with one-click guest entry, documented demo account, five-per-minute
  guest limit, five-failure login lock and honeypot.
- Permanent concept/demo rail, hourly demo reseed, `npm run demo:reset` epoch
  command, demo-email lock and reset from Settings.
- Hardened headers (CSP, frame denial, referrer, permissions, COOP/CORP), a
  written security review and tests for the demo boundary.
- Proprietary licence, copyright notice and source headers.
- Responsive desktop/tablet/mobile screens with real screenshots.

## Added in fix round 1 (release 1.1 review)

- Arabic typography guard: Mada fallback in mono contexts and zero tracking on
  Arabic labels.
- Language-specific concept/demo rail; Arabic-only badge copy.
- Public About/contact, Help & FAQ, Privacy, Terms and Changelog pages.
- Footer-only owner credit link; no owner name near the logo.
- Phone filter bottom sheet, eight-card pagination, search highlighting.
- Formula-safe CSV export for servers and invoices.
- Undo toast for snapshot, firewall and SSH-key deletion.
- Four-second toasts above the phone safe area; pre-hydration skeleton;
  `?` keyboard shortcut to Help.
- Richer seeded content (17 servers, 13 invoices, 15 activity entries).

## Deliberately missing (needs a backend)

1. **Real authentication.** Server-side identity, hashed passwords, HttpOnly
   cookies, MFA, password reset, email verification and "log out everywhere".
2. **Server-side authorization and CSRF.** Policies on every route, record
   ownership checks, origin checks and an append-only audit log.
3. **Provider integration.** Real VPS/RDP provisioning, power operations,
   billing, invoices, payment processing and a signed-PDF pipeline.
4. **Telemetry.** Metrics agent, uptime checks, alert delivery, log streaming and
   a real web console (WebSocket/SSH gateway).
5. **Networking controls.** Actual firewall enforcement, IPv6 rules, NAT,
   private networks and snapshot storage.
6. **Uploads and exports.** No upload surface exists; if one is added it needs
   MIME sniffing, random names, image re-encoding and SVG rejection.
7. **Account roles.** The concept has one administrator role. A production build
   needs at least owner, operator and viewer with tested separation of duties.
8. **Per-visitor demo isolation.** The current demo uses one shared seeded
   dataset per browser. Multiple visitors on one machine share the same local
   data until the hourly reset.

## Later polish

- Firefox and Safari visual QA.
- CLDR plural rules for Arabic counts.
- Print stylesheet for a server fact sheet and invoice.
- Optional CSV export with formula-injection protection.
- Locale-aware Arabic-Indic digit option (currently Western digits throughout).

## Out of scope for this repository

- Any real server credential, SSH private key, payment secret or provider token.
- A hosted demo service.
- Open-source licensing. The project is proprietary; see `LICENSE`.

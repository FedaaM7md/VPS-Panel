# VPS Panel — brand notes

Copyright (c) 2026 Fedaa Mohamed. All rights reserved.

## Owner credit

The product name stands alone next to the mark. Do not put “by Fedaa”, “من فداء”
or any owner name under the logo, in the header, on login cards or in page
titles.

The bottom footer line is the only UI credit:

- Arabic: `© 2026 لوحة الخوادم. جميع الحقوق محفوظة.` then `تصميم وتطوير: فداء محمد`.
- English: `© 2026 VPS Panel. All rights reserved.` then `Designed & built by Fedaa Mohamed`.
- The credit links to `https://fedaamohamed.com` with `rel="noopener"`.

Legal ownership stays in `LICENSE`, `COPYRIGHT.md`, `NOTICE`, `README.md` and
`package.json`; those files are not UI.

## Demo disclosure

- Signed-in console: a small top rail with the concept badge and “Demo mode —
  data resets automatically”.
- Public pages and login: a small concept badge plus a one-line footer note
  (“Demo build — sample data” / “نسخة عرض — البيانات افتراضية”). No loud red
  demo bar on public pages.

## Positioning

VPS Panel is an infrastructure console for VPS and Windows RDP fleets. It should
feel like equipment: steel, labelled ports, a status light and a log line. The
product is a **concept / UI showcase**; the permanent rail says so in both
languages and must never be removed.

The product name is **VPS Panel** and **لوحة الخوادم**. It stands alone next to
the logo, with no owner name under the wordmark. The only UI credit is the
bottom footer line: "© 2026 VPS Panel. All rights reserved." followed by
"Designed & built by Fedaa Mohamed" / "تصميم وتطوير: فداء محمد", linked to
`https://fedaamohamed.com`. Do not title the product "Fedaa VPS Panel" or
"لوحة فداء".

## Logo

- Concept: three 1U rack units stacked inside a shield outline. The top unit is
  cyan, the middle carries a cyan LED and the bottom is steel.
- The mark is drawn as original SVG in `src/ui/layout.ts` (`brandMark`) and in
  `public/favicon.svg`.
- Minimum size: 24 px. Do not add a rounded-square background, gradient,
  outline shadow or letterform substitution.
- Wordmark: VPS in Mada Bold, PANEL in JetBrains Mono with 0.18em tracking.

## Palette

| Token | Hex | Use |
|---|---|---|
| Console background (dark) | `#10151F` | default page background |
| Panel (dark) | `#1A2230` | cards and tables |
| Steel | `#8A99AD` | secondary text, vents, metal details |
| Electric cyan | `#00C2D1` | primary actions, focus ring, active nav |
| Power green | `#22C55E` | running, healthy, paid |
| Stop red | `#EF4444` | danger, destructive actions |
| Steel white (light) | `#F2F4F7` | light theme background |
| Ink (light) | `#10151F` | text on steel white |
| Line (light) | `#D7DEE7` | borders and table rules |

Cyan is the only action colour. Do not introduce indigo/purple gradients.
Positive states use green, never cyan, so the two remain distinguishable.

## Type

- **Mada** — UI, Arabic and Latin. Self-hosted via `@fontsource/mada` (OFL 1.1).
- **JetBrains Mono** — IP addresses, IDs, timestamps, log lines, metrics and
  prices. Self-hosted via `@fontsource/jetbrains-mono` (OFL 1.1).
- Numerals: Latin digits with tabular figures in mono contexts. Arabic UI keeps
  Western digits for addresses and invoice-style identifiers, matching how an
  Egyptian operations team reads them.
- No Cairo, no display script face, no all-caps headings longer than a label.

## Layout personality

- Rack rows: a dark frame, screw ears, vent slots, one LED per unit.
- Dense tables at ≥1280 px; two-column cards at tablet; one column on phones.
- Asymmetric dashboard: rack and telemetry take the wide column; alerts and
  regions sit in the narrow rail.
- Login is split: the left/right dark side shows a real seeded rack preview and
  a console line, not a marketing illustration.
- Public pages (about, help, privacy, terms, changelog) use a quiet product
  header and a compact footer; no dashboard sidebar.
- Corners are 4–8 px. Shadows are minimal. No glass panels or floating mockups.

## Voice

- English: technical, compact, specific. "Five failed sign-ins lock the form for
  60 seconds." Not "seamless security".
- Arabic: clear Modern Standard Arabic, short sentences, Egyptian operations
  vocabulary. "تُقفل الاستمارة 60 ثانية" not "بكل سهولة".
- Always label simulated behavior. Prefer a concrete count, address or timestamp
  over an adjective.
- Demo copy uses `.example`/`.invalid` domains and documentation IP ranges.

## Glossary

| English | Arabic | Note |
|---|---|---|
| Server | خادم | not "سيرفر" in UI copy |
| Fleet | أسطول | collective server inventory |
| Plan | باقة | hosting plan |
| Snapshot | لقطة | backup snapshot |
| Firewall rule | قاعدة جدار حماية | full phrase on first use |
| Provisioning | تجهيز | creating a server |
| Guest entry | دخول كضيف | one-click demo session |
| Demo mode | الوضع التجريبي | banner and settings |
| Concept UI | واجهة مفاهيمية | permanent rail |

## Do / don't

Do: use the rack, status LEDs, mono labels, tabular numbers, real demo data and
specific limits. Do keep the concept rail and demo banner visible.

Don't: use an owner name under the logo or in titles, purple gradients,
glassmorphism, sparkle icons, emoji, “trusted by” rows, fake customer logos,
invented testimonials, or claims that a simulated action reached a server.
Don't put the owner credit anywhere except the bottom footer link.

/**
 * Headless Edge visual and interaction QA for VPS Panel.
 * Run the dev server on port 5175 first, then `npm run qa:visual`.
 * © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = 'http://localhost:5175/';
const OUT = 'docs/screenshots';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
fs.mkdirSync(OUT, { recursive: true });

const errors = [];
const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) console.log('FAIL:', name, detail);
}

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ar-EG', colorScheme: 'dark' });
const page = await desktop.newPage();
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

// ---------------------------------------------------------------- security headers
const response = await page.goto(`${BASE}#/login`, { waitUntil: 'networkidle' });
const headers = response?.headers() ?? {};
check('CSP header present', String(headers['content-security-policy'] ?? '').includes("frame-ancestors 'none'"));
check('X-Frame-Options DENY', headers['x-frame-options'] === 'DENY');
check('nosniff header', headers['x-content-type-options'] === 'nosniff');
check('referrer policy', headers['referrer-policy'] === 'no-referrer');
check('permissions policy', String(headers['permissions-policy'] ?? '').includes('camera=()'));
await page.waitForTimeout(500);

const rail = await page.locator('.demo-rail').innerText();
check('Arabic concept badge is Arabic only', rail.includes('عرض مفاهيمي') && !rail.includes('Concept'));
check('rtl active for Arabic', (await page.evaluate(() => document.documentElement.dir)) === 'rtl');
check('guest entry button present', (await page.locator('[data-guest-entry]').count()) === 1);
check('brand is VPS Panel, not Fedaa', (await page.locator('body').innerText()).includes('VPS') && !(await page.locator('body').innerText()).includes('Fedaa VPS'));
const kickerFont = await page.locator('.card p').first().evaluate((el) => getComputedStyle(el).fontFamily);
check('Arabic login eyebrow uses Mada, not mono', kickerFont.includes('Mada') && !kickerFont.includes('JetBrains'));
const loginBody = await page.locator('body').innerText();
check('owner credit is footer-only', loginBody.includes('تصميم وتطوير: فداء محمد') && !loginBody.includes('من فداء'));
const creditLink = page.locator('a[href="https://fedaamohamed.com"]');
check('owner credit links to fedaamohamed.com', (await creditLink.count()) >= 1 && (await creditLink.first().getAttribute('rel')) === 'noopener');
await page.screenshot({ path: `${OUT}/01-login-ar-desktop.png`, fullPage: true });

// ---------------------------------------------------------------- public product pages
await page.goto(`${BASE}#/about`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
check('about page renders with Arabic title', (await page.locator('h1').first().innerText()).includes('لوحة الخوادم'));
check('about page shows contact and demo note', (await page.locator('body').innerText()).includes('hello@vpspanel.example') && (await page.locator('body').innerText()).includes('نسخة عرض'));
await page.screenshot({ path: `${OUT}/19-about-ar-desktop.png`, fullPage: true });
await page.goto(`${BASE}#/help`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
check('help page has FAQ items', (await page.locator('details').count()) >= 6);
await page.screenshot({ path: `${OUT}/20-help-ar-desktop.png`, fullPage: true });
await page.goto(`${BASE}#/login`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);

// ---------------------------------------------------------------- guest entry + dashboard
await page.locator('[data-guest-entry]').click();
check('guest toast appears immediately', (await page.locator('.toast-stack > *').count()) === 1);
await page.waitForURL(/#\/dashboard/, { timeout: 10000 });
await page.waitForTimeout(4500);
check('guest session reaches the dashboard', page.url().includes('/dashboard'));
check('toast auto-dismisses within four seconds', (await page.locator('.toast-stack > *').count()) === 0);
const dashboardRail = await page.locator('.demo-rail').innerText();
check('signed-in rail shows demo mode in Arabic', dashboardRail.includes('الوضع التجريبي') && !dashboardRail.includes('Demo mode'));
const dashboardBody = await page.locator('body').innerText();
check('guest eyebrow is Arabic', dashboardBody.includes('مشغّل ضيف') && !dashboardBody.includes('GUEST OPERATOR'));
check('rack units rendered', (await page.locator('.rack-unit').count()) >= 5);
check('footer copyright and credit present', dashboardBody.includes('© 2026 لوحة الخوادم') && dashboardBody.includes('تصميم وتطوير: فداء محمد'));
check('no horizontal overflow on desktop', (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);
const arabicTracking = await page.evaluate(() => {
  const bad = [];
  for (const element of document.querySelectorAll('body *')) {
    if (element.childElementCount > 0) continue;
    const text = element.textContent?.trim() ?? '';
    if (!/[\u0600-\u06FF]/.test(text)) continue;
    const spacing = Number.parseFloat(getComputedStyle(element).letterSpacing);
    if (Number.isFinite(spacing) && spacing > 0.05) {
      bad.push({ tag: element.tagName, text: text.slice(0, 30), spacing });
    }
  }
  return bad.slice(0, 5);
});
check('Arabic text has no positive letter-spacing', arabicTracking.length === 0, JSON.stringify(arabicTracking));
await page.screenshot({ path: `${OUT}/02-dashboard-ar-desktop.png`, fullPage: true });

// Open Graph cover from the real dashboard, without a toast.
await page.setViewportSize({ width: 1200, height: 630 });
await page.waitForTimeout(300);
await page.screenshot({ path: 'public/og-cover.png', fullPage: false });
await page.setViewportSize({ width: 1440, height: 1000 });

// ---------------------------------------------------------------- servers + detail
await page.goto(`${BASE}#/servers`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
check('servers table has rows', (await page.locator('tbody tr').count()) >= 8);
await page.screenshot({ path: `${OUT}/03-servers-ar-desktop.png`, fullPage: true });

await page.goto(`${BASE}#/servers/srv_web_fra_01`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/04-server-detail-ar-desktop.png`, fullPage: true });

await page.getByRole('tab', { name: 'جدار الحماية' }).click();
await page.waitForTimeout(300);
check('firewall rules rendered', (await page.locator('tbody tr').count()) >= 2);
await page.screenshot({ path: `${OUT}/05-firewall-ar-desktop.png`, fullPage: true });

await page.goto(`${BASE}#/servers/srv_web_fra_01?tab=console`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
check('console scripted output present', (await page.locator('main').innerText()).includes('SCRIPTED OUTPUT'));
await page.screenshot({ path: `${OUT}/06-console-ar-desktop.png`, fullPage: true });

// ---------------------------------------------------------------- billing/settings
await page.goto(`${BASE}#/billing`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
check('billing invoices listed', (await page.locator('tbody tr').count()) >= 6);
await page.screenshot({ path: `${OUT}/07-billing-ar-desktop.png`, fullPage: true });

await page.goto(`${BASE}#/settings`, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
check('demo account email is locked', await page.locator('#profile-email').isDisabled());
check('reset control present', (await page.locator('body').innerText()).includes('إعادة تعيين بيانات العرض'));
await page.screenshot({ path: `${OUT}/08-settings-ar-desktop.png`, fullPage: true });

// ---------------------------------------------------------------- English + light theme
const langButton = page.locator('header button[aria-label*="Language"], header button[aria-label*="اللغة"]').first();
await langButton.click();
await page.waitForTimeout(700);
check('ltr active after language switch', (await page.evaluate(() => document.documentElement.dir)) === 'ltr');
await page.goto(`${BASE}#/dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/09-dashboard-en-desktop.png`, fullPage: true });

await page.goto(`${BASE}#/settings`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.locator('[data-theme-toggle]').click();
await page.waitForTimeout(500);
check('light theme applied', (await page.evaluate(() => document.documentElement.classList.contains('dark'))) === false);
await page.goto(`${BASE}#/dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/10-dashboard-light-en-desktop.png`, fullPage: true });

// Log out for the English login capture.
await page.locator('header button[aria-label="Profile"]').click();
await page.waitForTimeout(250);
const logout = page.locator('header').getByRole('button', { name: 'Sign out' });
if (await logout.count()) await logout.click();
else await page.goto(`${BASE}#/login`, { waitUntil: 'networkidle' });
await page.waitForTimeout(4300);
check('logout returns to login', page.url().includes('/login'));
check('logout toast has cleared before capture', (await page.locator('.toast-stack > *').count()) === 0);
await page.screenshot({ path: `${OUT}/11-login-en-desktop.png`, fullPage: true });

// ---------------------------------------------------------------- mobile Arabic
const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: 'ar-EG', colorScheme: 'dark' });
const mobilePage = await mobile.newPage();
mobilePage.on('pageerror', (error) => errors.push(`mobile pageerror: ${error.message}`));
mobilePage.on('console', (message) => {
  if (message.type() === 'error') errors.push(`mobile console: ${message.text()}`);
});
await mobilePage.goto(`${BASE}#/login`, { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(500);
check('mobile login has no horizontal overflow', (await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);
await mobilePage.screenshot({ path: `${OUT}/12-login-ar-mobile.png`, fullPage: true });

await mobilePage.locator('[data-guest-entry]').click();
await mobilePage.waitForURL(/#\/dashboard/, { timeout: 10000 });
await mobilePage.waitForTimeout(5200);
check('mobile dashboard has no horizontal overflow', (await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);
await mobilePage.screenshot({ path: `${OUT}/13-dashboard-ar-mobile.png`, fullPage: true });

await mobilePage.goto(`${BASE}#/servers`, { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(500);
check('mobile servers has no horizontal overflow', (await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);
const firstCard = await mobilePage.locator('article').first().boundingBox();
check('first server card is above the phone fold', Boolean(firstCard && firstCard.y < 812), `top=${firstCard?.y}`);
check('phone filters are collapsed by default', !(await mobilePage.locator('#servers-filters').isVisible()));
await mobilePage.screenshot({ path: `${OUT}/14-servers-ar-mobile.png`, fullPage: true });
await mobilePage.locator('[data-filter-toggle]').click();
await mobilePage.waitForTimeout(250);
check('phone filter sheet opens', await mobilePage.locator('#servers-filters').isVisible());
await mobilePage.screenshot({ path: `${OUT}/21-filters-ar-mobile.png`, fullPage: false });
await mobilePage.keyboard.press('Escape');
await mobilePage.waitForTimeout(200);

const menuButton = mobilePage.locator('[data-menu-toggle]');
if (await menuButton.count()) {
  await menuButton.click();
  await mobilePage.waitForTimeout(300);
  check('mobile drawer opens', await mobilePage.getByRole('dialog').isVisible());
  await mobilePage.screenshot({ path: `${OUT}/15-drawer-ar-mobile.png`, fullPage: false });
  await mobilePage.keyboard.press('Escape');
  await mobilePage.waitForTimeout(200);
}

await mobilePage.goto(`${BASE}#/servers/srv_web_fra_01?tab=firewall`, { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(600);
check('mobile server detail has no page-level overflow', (await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);
await mobilePage.screenshot({ path: `${OUT}/16-server-ar-mobile.png`, fullPage: true });

// English mobile capture.
await mobilePage.goto(`${BASE}#/dashboard`, { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(300);
const mobileLang = mobilePage.locator('header button[aria-label*="Language"], header button[aria-label*="اللغة"]').first();
await mobileLang.click();
await mobilePage.waitForTimeout(700);
check('mobile English switch sets LTR', (await mobilePage.evaluate(() => document.documentElement.dir)) === 'ltr');
check('mobile English dashboard has no overflow', (await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);
await mobilePage.screenshot({ path: `${OUT}/18-dashboard-en-mobile.png`, fullPage: true });

// ---------------------------------------------------------------- tablet
const tablet = await browser.newContext({ viewport: { width: 820, height: 1180 }, locale: 'en-US', colorScheme: 'dark' });
const tabletPage = await tablet.newPage();
await tabletPage.goto(`${BASE}#/login`, { waitUntil: 'networkidle' });
await tabletPage.locator('[data-guest-entry]').click();
await tabletPage.waitForURL(/#\/dashboard/, { timeout: 10000 });
await tabletPage.waitForTimeout(800);
await tabletPage.goto(`${BASE}#/servers`, { waitUntil: 'networkidle' });
await tabletPage.waitForTimeout(500);
check('tablet servers has no page-level overflow', (await tabletPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);
await tabletPage.screenshot({ path: `${OUT}/17-servers-en-tablet.png`, fullPage: true });

// ---------------------------------------------------------------- keyboard focus
await page.goto(`${BASE}#/login`, { waitUntil: 'networkidle' });
await page.keyboard.press('Tab');
const focused = await page.evaluate(() => {
  const el = document.activeElement;
  return el ? `${el.tagName}:${el.getAttribute('data-guest-entry') ?? ''}` : '';
});
check('keyboard focus reaches an interactive element', focused.startsWith('BUTTON') || focused.startsWith('A'), focused);

console.log(JSON.stringify({ checks, errors }, null, 2));
fs.writeFileSync(
  'docs/qa-results.json',
  JSON.stringify({ runAt: new Date().toISOString(), base: BASE, viewport: 'desktop 1440 / mobile 375 / tablet 820', checks, errors }, null, 2),
);
await browser.close();
if (errors.length > 0 || checks.some((entry) => !entry.ok)) process.exitCode = 1;

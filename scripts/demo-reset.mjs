/**
 * `npm run demo:reset`
 * Writes a new same-origin epoch marker. The application compares this file on
 * boot and reseeds the seeded demo fleet while keeping the visitor's session,
 * language and theme. Intended for a scheduled hourly task.
 *
 * © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(here, '..', 'public', 'demo-epoch.json');

const now = new Date();
const epoch = `demo-${now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random()
  .toString(36)
  .slice(2, 8)}`;

const payload = { epoch, resetAt: now.toISOString() };
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

console.log(`Demo epoch written to ${target}`);
console.log(`epoch: ${epoch}`);
console.log('The next page load reseeds the demo data and keeps the session.');

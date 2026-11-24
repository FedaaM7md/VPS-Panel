/**
 * Build-time configuration for VPS Panel.
 * © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE.
 */
import type { Lang } from './lib/types';

/**
 * Demo mode is on unless VITE_DEMO_MODE is explicitly false/0/off/no.
 * When it is off, guest entry and the demo account are unavailable and
 * `/demo` resolves to the 404 page. A real build then needs a server-side
 * identity provider that is outside the scope of this concept.
 */
export function readDemoModeFlag(raw: unknown): boolean {
  if (typeof raw !== 'string') return true;
  const value = raw.trim().toLowerCase();
  return value !== 'false' && value !== '0' && value !== 'off' && value !== 'no';
}

export const DEMO_MODE_ENABLED = readDemoModeFlag(import.meta.env.VITE_DEMO_MODE);

/** Demo data is reseeded once an hour, and after `npm run demo:reset`. */
export const DEMO_RESET_INTERVAL_MS = 60 * 60 * 1000;

/** Same-origin static file bumped by `npm run demo:reset`. */
export const DEMO_EPOCH_FILE = 'demo-epoch.json';

export const DEFAULT_LANG: Lang = 'ar';

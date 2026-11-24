/**
 * Demo-mode helpers: guest throttling, automatic reseed timing and the
 * same-origin epoch check used by `npm run demo:reset`.
 * © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE.
 */
import { DEMO_RESET_INTERVAL_MS } from '../config';

export const GUEST_MAX_ENTRIES = 5;
export const GUEST_WINDOW_MS = 60_000;
export const GUEST_LOCK_MS = 60_000;

export interface GuestThrottle {
  /** Unix milliseconds of recent guest entries, newest last. */
  entries: number[];
  lockedUntil: number | null;
}

export type GuestAccess =
  | { allowed: true; throttle: GuestThrottle }
  | { allowed: false; throttle: GuestThrottle; retryAfterMs: number };

export function freshGuestThrottle(): GuestThrottle {
  return { entries: [], lockedUntil: null };
}

/**
 * Limits guest entry to five attempts per rolling minute. A blocked attempt
 * starts a 60-second cooldown so a script cannot keep hammering the button.
 */
export function evaluateGuestAccess(throttle: GuestThrottle, nowMs: number): GuestAccess {
  if (throttle.lockedUntil !== null && nowMs < throttle.lockedUntil) {
    return {
      allowed: false,
      throttle,
      retryAfterMs: throttle.lockedUntil - nowMs,
    };
  }

  const base: GuestThrottle =
    throttle.lockedUntil !== null && nowMs >= throttle.lockedUntil
      ? freshGuestThrottle()
      : {
          entries: throttle.entries.filter((stamp) => Number.isFinite(stamp) && nowMs - stamp < GUEST_WINDOW_MS),
          lockedUntil: null,
        };

  if (base.entries.length >= GUEST_MAX_ENTRIES) {
    const locked = { entries: base.entries, lockedUntil: nowMs + GUEST_LOCK_MS };
    return { allowed: false, throttle: locked, retryAfterMs: GUEST_LOCK_MS };
  }

  return {
    allowed: true,
    throttle: { entries: [...base.entries, nowMs], lockedUntil: null },
  };
}

export function guestRetryAfterMs(throttle: GuestThrottle, nowMs: number): number {
  if (throttle.lockedUntil === null || nowMs >= throttle.lockedUntil) return 0;
  return throttle.lockedUntil - nowMs;
}

/** True when the persisted demo data is old enough to be reseeded. */
export function demoResetDue(
  lastResetAt: string | null | undefined,
  nowMs: number,
  intervalMs: number = DEMO_RESET_INTERVAL_MS,
): boolean {
  if (!lastResetAt) return false;
  const stamp = new Date(lastResetAt).getTime();
  if (Number.isNaN(stamp)) return true;
  return nowMs - stamp >= intervalMs;
}

export interface DemoEpochFile {
  epoch: string;
  resetAt?: string;
}

export function parseDemoEpoch(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const epoch = (payload as { epoch?: unknown }).epoch;
  if (typeof epoch !== 'string') return null;
  const trimmed = epoch.trim();
  return trimmed.length > 0 && trimmed.length <= 80 ? trimmed : null;
}

/**
 * Reads the same-origin epoch marker written by `npm run demo:reset`.
 * It never contacts a third-party service and fails silently offline.
 */
export async function fetchDemoEpoch(file: string, enabled: boolean): Promise<string | null> {
  if (!enabled || typeof fetch !== 'function' || typeof window === 'undefined') return null;
  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return null;
  try {
    const response = await fetch(`/${file}`, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return null;
    return parseDemoEpoch(await response.json());
  } catch {
    return null;
  }
}

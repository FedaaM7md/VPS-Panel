/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { afterEach, describe, expect, it } from 'vitest';
import { DemoStore } from '../src/state/store';
import { createSeedState } from '../src/data/seed';
import { GUEST_LOCK_MS, GUEST_MAX_ENTRIES, demoResetDue, evaluateGuestAccess, freshGuestThrottle, parseDemoEpoch } from '../src/lib/demo';
import { readDemoModeFlag } from '../src/config';
import { clearDemoKeys } from '../src/lib/storage';
import { resetCsrfToken } from '../src/lib/csrf';

const NOW = Date.UTC(2026, 10, 24, 9, 0, 0);

function makeStore(overrides: { demoMode?: boolean; state?: ReturnType<typeof createSeedState>; nowMs?: number } = {}) {
  const clock = { value: overrides.nowMs ?? NOW };
  let counter = 0;
  const store = new DemoStore({
    state: overrides.state ?? createSeedState(clock.value),
    now: () => clock.value,
    persist: false,
    demoMode: overrides.demoMode ?? true,
    tokenFactory: () => `guest-token-${++counter}`,
  });
  return { store, clock };
}

afterEach(() => {
  clearDemoKeys();
  resetCsrfToken();
});

describe('demo mode configuration', () => {
  it('defaults to enabled and recognises explicit opt-outs', () => {
    expect(readDemoModeFlag(undefined)).toBe(true);
    expect(readDemoModeFlag('true')).toBe(true);
    expect(readDemoModeFlag('TRUE')).toBe(true);
    expect(readDemoModeFlag('false')).toBe(false);
    expect(readDemoModeFlag('0')).toBe(false);
    expect(readDemoModeFlag('off')).toBe(false);
    expect(readDemoModeFlag('no')).toBe(false);
  });
});

describe('guest entry throttle', () => {
  it(`allows ${GUEST_MAX_ENTRIES} entries a minute, then locks for a minute`, () => {
    let throttle = freshGuestThrottle();
    for (let index = 0; index < GUEST_MAX_ENTRIES; index += 1) {
      const result = evaluateGuestAccess(throttle, NOW + index * 100);
      expect(result.allowed).toBe(true);
      throttle = result.throttle;
    }

    const blocked = evaluateGuestAccess(throttle, NOW + 1000);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.retryAfterMs).toBe(GUEST_LOCK_MS);

    const stillBlocked = evaluateGuestAccess(blocked.throttle, NOW + 30_000);
    expect(stillBlocked.allowed).toBe(false);

    const unlocked = evaluateGuestAccess(blocked.throttle, NOW + GUEST_LOCK_MS + 1000);
    expect(unlocked.allowed).toBe(true);
  });

  it('forgets entries outside the rolling window', () => {
    let throttle = freshGuestThrottle();
    for (let index = 0; index < GUEST_MAX_ENTRIES; index += 1) {
      const result = evaluateGuestAccess(throttle, NOW + index);
      throttle = result.throttle;
    }
    const later = evaluateGuestAccess(throttle, NOW + 61_000);
    expect(later.allowed).toBe(true);
  });
});

describe('demo reset timing and epoch markers', () => {
  it('detects an hourly reseed window', () => {
    expect(demoResetDue(null, NOW)).toBe(false);
    expect(demoResetDue(new Date(NOW - 59 * 60_000).toISOString(), NOW)).toBe(false);
    expect(demoResetDue(new Date(NOW - 61 * 60_000).toISOString(), NOW)).toBe(true);
    expect(demoResetDue('not-a-date', NOW)).toBe(true);
  });

  it('validates epoch markers written by the CLI', () => {
    expect(parseDemoEpoch({ epoch: 'demo-123' })).toBe('demo-123');
    expect(parseDemoEpoch({ epoch: '  spaced  ' })).toBe('spaced');
    expect(parseDemoEpoch({ epoch: '' })).toBeNull();
    expect(parseDemoEpoch({ epoch: 'x'.repeat(81) })).toBeNull();
    expect(parseDemoEpoch(null)).toBeNull();
  });
});

describe('guest sessions in the store', () => {
  it('opens a demo administrator session and records the activity', () => {
    const { store } = makeStore();
    const result = store.guestLogin();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.isGuest).toBe(true);
    expect(result.session.isDemo).toBe(true);
    expect(result.session.role).toBe('admin');
    expect(store.getState().session?.isGuest).toBe(true);
    expect(store.getState().activity[0]?.action.type).toBe('auth.guest');
  });

  it('enforces the rate limit and reports the retry delay', () => {
    const { store } = makeStore();
    for (let index = 0; index < GUEST_MAX_ENTRIES; index += 1) {
      expect(store.guestLogin().ok).toBe(true);
      store.logout();
    }
    const blocked = store.guestLogin();
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.code).toBe('throttled');
      expect(blocked.retryAfterMs).toBeGreaterThan(0);
    }
    expect(store.guestRetryAfterSeconds()).toBeGreaterThan(0);
  });

  it('is unavailable when demo mode is off', () => {
    const { store } = makeStore({ demoMode: false });
    const result = store.guestLogin();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('disabled');
    expect(store.isDemoModeEnabled()).toBe(false);
  });

  it('refuses password login when demo mode is off', () => {
    const { store } = makeStore({ demoMode: false });
    const result = store.login('ops@nilegrid.example', 'NileGrid#2026');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('disabled');
    expect(store.getState().session).toBeNull();
  });
});

describe('automatic and epoch-driven reseeding', () => {
  it('resets stale demo data on construction while keeping the session and preferences', () => {
    const old = createSeedState(NOW - 2 * 60 * 60 * 1000);
    old.session = {
      email: 'ops@nilegrid.example',
      name: 'Omar El-Sayed',
      token: 'old-token',
      issuedAt: new Date(NOW - 60 * 60_000).toISOString(),
      expiresAt: new Date(NOW + 60 * 60_000).toISOString(),
      isDemo: true,
      isGuest: false,
      role: 'admin',
    };
    old.servers = [];
    old.settings.lang = 'en';
    old.settings.theme = 'light';

    const { store } = makeStore({ state: old });
    expect(store.getState().servers.length).toBeGreaterThan(0);
    expect(store.getState().session?.token).toBe('old-token');
    expect(store.getState().settings.lang).toBe('en');
    expect(store.getState().settings.theme).toBe('light');
  });

  it('applies a new CLI epoch once and keeps the session', () => {
    const { store } = makeStore();
    const guest = store.guestLogin();
    expect(guest.ok).toBe(true);
    const token = store.getState().session?.token;

    expect(store.applyDemoEpoch('demo-new-1')).toBe(true);
    expect(store.getState().demoEpoch).toBe('demo-new-1');
    expect(store.getState().session?.token).toBe(token);
    expect(store.applyDemoEpoch('demo-new-1')).toBe(false);
  });
});

/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import type { Session } from './types';
import { isValidEmail } from './validation';

/**
 * The single documented demo account. This is intentionally public: the app is
 * a local UI showcase with no real backend and no sensitive data.
 */
export const DEMO_EMAIL = 'ops@nilegrid.example';
export const DEMO_PASSWORD = 'NileGrid#2026';
export const DEMO_NAME = 'Omar El-Sayed';
export const GUEST_EMAIL = 'guest@vpspanel.example';
export const GUEST_NAME = 'Guest operator';

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_MS = 60_000;
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export interface LoginThrottle {
  failures: number;
  lockedUntil: number | null;
}

export type LoginFailureCode = 'invalid' | 'locked' | 'disabled';

export type LoginResult =
  | { ok: true; session: Session; throttle: LoginThrottle }
  | { ok: false; code: LoginFailureCode; throttle: LoginThrottle; retryAfterMs?: number };

export function freshThrottle(): LoginThrottle {
  return { failures: 0, lockedUntil: null };
}

/** Length-independent-ish comparison; good enough for a local demo. */
export function constantTimeEqual(left: string, right: string): boolean {
  const max = Math.max(left.length, right.length);
  let diff = left.length === right.length ? 0 : 1;
  for (let index = 0; index < max; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return diff === 0;
}

export function defaultTokenFactory(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `demo_${cryptoApi.randomUUID().replace(/-/g, '')}`;
  }
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    return `demo_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }
  return `demo_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function createSession(
  email: string,
  name: string,
  nowMs: number,
  token: string,
  options: { isGuest?: boolean } = {},
): Session {
  return {
    email,
    name,
    token,
    issuedAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + SESSION_TTL_MS).toISOString(),
    isDemo: true,
    isGuest: options.isGuest === true,
    role: 'admin',
  };
}

export function isSessionValid(session: Session | null, nowMs: number): boolean {
  if (!session) return false;
  const expiry = new Date(session.expiresAt).getTime();
  if (Number.isNaN(expiry)) return false;
  return expiry > nowMs && session.token.length > 0;
}

/**
 * Pure login evaluation with a persistent-style throttle:
 * five failed attempts lock the form for 60 seconds. Every successful sign-in
 * issues a brand-new session token (simulated session rotation).
 */
export function evaluateLogin(
  input: { email: string; password: string },
  throttle: LoginThrottle,
  nowMs: number,
  tokenFactory: () => string = defaultTokenFactory,
  demoEnabled: boolean = true,
): LoginResult {
  if (!demoEnabled) {
    return { ok: false, code: 'disabled', throttle };
  }
  let state: LoginThrottle = { ...throttle };

  if (state.lockedUntil !== null && nowMs < state.lockedUntil) {
    return {
      ok: false,
      code: 'locked',
      throttle: state,
      retryAfterMs: state.lockedUntil - nowMs,
    };
  }

  if (state.lockedUntil !== null && nowMs >= state.lockedUntil) {
    state = freshThrottle();
  }

  const email = input.email.trim().toLowerCase();
  const passwordOk = constantTimeEqual(input.password, DEMO_PASSWORD);
  const emailOk = isValidEmail(email) && constantTimeEqual(email, DEMO_EMAIL);

  if (!emailOk || !passwordOk) {
    state = { ...state, failures: state.failures + 1 };
    if (state.failures >= MAX_LOGIN_ATTEMPTS) {
      state = { failures: state.failures, lockedUntil: nowMs + LOGIN_LOCK_MS };
      return {
        ok: false,
        code: 'locked',
        throttle: state,
        retryAfterMs: LOGIN_LOCK_MS,
      };
    }
    return { ok: false, code: 'invalid', throttle: state };
  }

  const session = createSession(DEMO_EMAIL, DEMO_NAME, nowMs, tokenFactory());
  return { ok: true, session, throttle: freshThrottle() };
}

export function retryAfterSeconds(result: { retryAfterMs?: number }): number {
  return Math.max(1, Math.ceil((result.retryAfterMs ?? 0) / 1000));
}

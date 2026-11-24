/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { constantTimeEqual } from './auth';

/**
 * Demonstrates the shape of anti-CSRF protection inside a client-only app.
 *
 * Real CSRF protection must be enforced server-side with a session-bound token
 * and an HttpOnly, SameSite cookie. Here every mutating store action requires a
 * token issued for the current page session, so the pattern is visible in the
 * UI and testable — but it is not a security boundary on its own.
 */

let currentToken: string | null = null;

function fallbackToken(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = new Uint8Array(24);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

export function issueCsrfToken(factory: () => string = fallbackToken): string {
  currentToken = factory();
  return currentToken;
}

export function getCsrfToken(): string {
  if (!currentToken) currentToken = fallbackToken();
  return currentToken;
}

export function resetCsrfToken(): void {
  currentToken = null;
}

export function verifyCsrfToken(candidate: string | null | undefined): boolean {
  if (!candidate || !currentToken) return false;
  return constantTimeEqual(candidate, currentToken);
}

export function requireCsrf(candidate: string | null | undefined): void {
  if (!verifyCsrfToken(candidate)) {
    throw new Error('csrf_invalid');
  }
}

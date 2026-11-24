/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
/** Namespaced, failure-tolerant localStorage helpers. */

export const STORAGE_KEYS = {
  state: 'vps.panel.state.v3',
  lang: 'vps.panel.lang.v1',
  theme: 'vps.panel.theme.v1',
  throttle: 'vps.panel.throttle.v1',
  guestThrottle: 'vps.panel.guest-throttle.v1',
} as const;

/** T-000 keys kept only so the old build's data can be cleared explicitly. */
const LEGACY_KEYS = [
  'fedaa.vps.state.v1',
  'fedaa.vps.lang.v1',
  'fedaa.vps.theme.v1',
  'fedaa.vps.throttle.v1',
  'vps.panel.state.v2',
] as const;

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probeKey = 'fedaa.vps.probe';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readJSON<T>(key: string): T | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readString(key: string): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Clears only this app's keys, including the superseded T-000 namespace. */
export function clearDemoKeys(): void {
  for (const key of Object.values(STORAGE_KEYS)) removeKey(key);
  for (const key of LEGACY_KEYS) removeKey(key);
}

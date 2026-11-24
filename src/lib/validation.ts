/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
/** Shared, dependency-free validators. Codes map to i18n keys. */

export const MAX_SSH_KEY_LENGTH = 2048;

let idCounter = 0;

export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  if (email.length < 5 || email.length > 254) return false;
  if (/\s/.test(email)) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length > 64) return false;
  if (!domain || !domain.includes('.')) return false;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;
  if (!/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(domain)) return false;
  const tld = domain.split('.').pop() ?? '';
  return tld.length >= 2;
}

export const SERVER_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.-]{2,31}$/;
export const KEY_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$/;
export const RDP_USER_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{2,31}$/;

/** Returns a message key, or null when valid. */
export function validateServerName(name: string, existingNames: readonly string[]): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'wizard.requiredName';
  if (!SERVER_NAME_PATTERN.test(trimmed)) return 'wizard.invalidName';
  const lower = trimmed.toLowerCase();
  if (existingNames.some((existing) => existing.toLowerCase() === lower)) return 'wizard.nameTaken';
  return null;
}

export function validateSnapshotLabel(label: string): string | null {
  const trimmed = label.trim();
  if (trimmed.length < 3 || trimmed.length > 40) return 'errors.snapshotLabel';
  return null;
}

export function validateKeyName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'errors.required';
  if (!KEY_NAME_PATTERN.test(trimmed)) return 'errors.keyName';
  return null;
}

const SSH_TYPES = ['ssh-ed25519', 'ssh-rsa', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521'];

export interface ParsedPublicKey {
  type: string;
  payload: string;
  comment: string;
}

/** Structural validation only — no cryptography is performed. */
export function parseSshPublicKey(value: string): ParsedPublicKey | null {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_SSH_KEY_LENGTH) return null;
  const parts = trimmed.split(/\s+/);
  const type = parts[0];
  const payload = parts[1];
  if (!type || !payload) return null;
  if (!SSH_TYPES.includes(type)) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) return null;
  if (payload.length < 24 || payload.length > 1024) return null;
  return { type, payload, comment: parts.slice(2).join(' ') };
}

export function validateSshPublicKey(value: string): string | null {
  if (!value.trim()) return 'errors.required';
  if (!parseSshPublicKey(value)) return 'errors.keyFormat';
  return null;
}

export function passwordProblem(password: string): string | null {
  if (password.length < 12) return 'errors.passwordWeak';
  if (!/[a-z]/.test(password)) return 'errors.passwordWeak';
  if (!/[A-Z]/.test(password)) return 'errors.passwordWeak';
  if (!/[0-9]/.test(password)) return 'errors.passwordWeak';
  return null;
}

/** Deterministic, non-cryptographic demo fingerprint (SHA-256-style label). */
export function demoFingerprint(publicKey: string): string {
  let hashA = 2166136261;
  let hashB = 5381;
  for (let index = 0; index < publicKey.length; index += 1) {
    const code = publicKey.charCodeAt(index);
    hashA ^= code;
    hashA = Math.imul(hashA, 16777619);
    hashB = (hashB * 33 + code) >>> 0;
  }
  const hex = (value: number): string => (value >>> 0).toString(16).padStart(8, '0');
  const raw = `${hex(hashA)}${hex(hashB)}${hex(Math.imul(hashA, hashB))}${hex(hashA ^ hashB)}`;
  return `SHA256:${raw.slice(0, 43)}`;
}

/** Server-name-safe random suffix for demo identifiers. */
export function makeId(prefix: string, seed: number = Date.now()): string {
  idCounter += 1;
  const base = Math.abs(Math.imul(seed, 2654435761)) >>> 0;
  return `${prefix}_${base.toString(36)}${Math.floor(seed % 46656).toString(36)}${idCounter.toString(36)}`;
}

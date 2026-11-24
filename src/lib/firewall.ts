/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import type {
  FirewallDirection,
  FirewallProtocol,
  FirewallRule,
  ValidationResult,
} from './types';

export const MAX_FIREWALL_RULES = 25;
export const MAX_PORT_TOKENS = 20;
export const MAX_NOTE_LENGTH = 60;

export interface ParsedPorts {
  normalized: string;
  tokens: number;
}

const TOKEN_PATTERN = /^(\d{1,5})(?:-(\d{1,5}))?$/;

/**
 * Accepts `22`, `80,443` or `8000-8100` (whitespace tolerated around commas).
 * Returns a normalized comma list, or a message-key error code.
 */
export function parsePorts(raw: string): ValidationResult<ParsedPorts> {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, code: 'errors.portRequired' };

  const pieces = trimmed.split(',').map((piece) => piece.trim());
  if (pieces.length > MAX_PORT_TOKENS) return { ok: false, code: 'errors.portTooMany' };

  const normalized: string[] = [];
  for (const piece of pieces) {
    if (!piece) return { ok: false, code: 'errors.portFormat' };
    const match = TOKEN_PATTERN.exec(piece);
    if (!match) return { ok: false, code: 'errors.portFormat' };

    const startRaw = match[1];
    const endRaw = match[2];
    if (!startRaw) return { ok: false, code: 'errors.portFormat' };
    const start = Number(startRaw);

    if (endRaw === undefined) {
      if (!Number.isInteger(start) || start < 1 || start > 65535) {
        return { ok: false, code: 'errors.portRange' };
      }
      normalized.push(String(start));
      continue;
    }

    const end = Number(endRaw);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1 || start > 65535 || end > 65535) {
      return { ok: false, code: 'errors.portRange' };
    }
    if (start > end) return { ok: false, code: 'errors.portOrder' };
    normalized.push(`${start}-${end}`);
  }

  return {
    ok: true,
    value: { normalized: normalized.join(','), tokens: normalized.length },
  };
}

/**
 * Validates an IPv4 address or CIDR. A bare address is normalized to /32.
 * IPv6 is intentionally out of scope for this concept.
 */
export function validateCidr(raw: string): ValidationResult<string> {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, code: 'errors.cidrRequired' };
  if (trimmed.length > 43) return { ok: false, code: 'errors.cidrFormat' };

  const parts = trimmed.split('/');
  if (parts.length > 2) return { ok: false, code: 'errors.cidrFormat' };
  const address = parts[0] ?? '';
  const prefixRaw = parts[1];

  const octets = address.split('.');
  if (octets.length !== 4) return { ok: false, code: 'errors.cidrFormat' };

  const numericOctets: number[] = [];
  for (const octet of octets) {
    if (!/^\d{1,3}$/.test(octet)) return { ok: false, code: 'errors.cidrFormat' };
    const value = Number(octet);
    if (value < 0 || value > 255) return { ok: false, code: 'errors.cidrOctet' };
    numericOctets.push(value);
  }

  let prefix = 32;
  if (prefixRaw !== undefined) {
    if (!/^\d{1,2}$/.test(prefixRaw)) return { ok: false, code: 'errors.cidrPrefix' };
    prefix = Number(prefixRaw);
    if (prefix < 0 || prefix > 32) return { ok: false, code: 'errors.cidrPrefix' };
  }

  return { ok: true, value: `${numericOctets.join('.')}/${prefix}` };
}

export interface FirewallDraft {
  direction: FirewallDirection;
  protocol: FirewallProtocol;
  ports: string;
  source: string;
  note: string;
}

export type FirewallField = 'ports' | 'source' | 'note';
export type FirewallErrors = Partial<Record<FirewallField, string>>;

export function validateFirewallDraft(draft: FirewallDraft): FirewallErrors {
  const errors: FirewallErrors = {};

  const ports = parsePorts(draft.ports);
  if (!ports.ok) errors.ports = ports.code;

  if (draft.protocol !== 'icmp') {
    const cidr = validateCidr(draft.source);
    if (!cidr.ok) errors.source = cidr.code;
  } else if (!draft.source.trim()) {
    errors.source = 'errors.cidrRequired';
  } else {
    const cidr = validateCidr(draft.source);
    if (!cidr.ok) errors.source = cidr.code;
  }

  if (draft.note.trim().length > MAX_NOTE_LENGTH) errors.note = 'errors.noteLong';

  return errors;
}

export function normalizeFirewallDraft(draft: FirewallDraft): FirewallDraft {
  const ports = parsePorts(draft.ports);
  const cidr = validateCidr(draft.source);
  return {
    direction: draft.direction,
    protocol: draft.protocol,
    ports: ports.ok ? ports.value.normalized : draft.ports.trim(),
    source: cidr.ok ? cidr.value : draft.source.trim(),
    note: draft.note.trim(),
  };
}

export function buildFirewallRule(draft: FirewallDraft, id: string, nowIso: string): FirewallRule {
  const normalized = normalizeFirewallDraft(draft);
  return { ...normalized, id, createdAt: nowIso };
}

export function firewallSummary(rule: FirewallRule): string {
  return `${rule.protocol.toUpperCase()} ${rule.ports} ← ${rule.source}`;
}

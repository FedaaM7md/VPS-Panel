/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { describe, expect, it } from 'vitest';
import {
  MAX_NOTE_LENGTH,
  buildFirewallRule,
  normalizeFirewallDraft,
  parsePorts,
  validateCidr,
  validateFirewallDraft,
  type FirewallDraft,
} from '../src/lib/firewall';

function draft(overrides: Partial<FirewallDraft> = {}): FirewallDraft {
  return { direction: 'inbound', protocol: 'tcp', ports: '22', source: '203.0.113.0/24', note: '', ...overrides };
}

describe('port validation', () => {
  it('accepts single ports, lists, ranges and whitespace', () => {
    const single = parsePorts('22');
    expect(single).toMatchObject({ ok: true, value: { normalized: '22' } });
    const list = parsePorts('80, 443, 8080');
    expect(list.ok && list.value.normalized).toBe('80,443,8080');
    const range = parsePorts('8000-8100');
    expect(range.ok && range.value.normalized).toBe('8000-8100');
    const mixed = parsePorts(' 22 , 80-81 ');
    expect(mixed.ok && mixed.value.normalized).toBe('22,80-81');
  });

  it('rejects empty, malformed, out-of-range and reversed ports', () => {
    expect(parsePorts('')).toEqual({ ok: false, code: 'errors.portRequired' });
    expect(parsePorts('abc')).toEqual({ ok: false, code: 'errors.portFormat' });
    expect(parsePorts('22,')).toEqual({ ok: false, code: 'errors.portFormat' });
    expect(parsePorts('0')).toEqual({ ok: false, code: 'errors.portRange' });
    expect(parsePorts('65536')).toEqual({ ok: false, code: 'errors.portRange' });
    expect(parsePorts('80-22')).toEqual({ ok: false, code: 'errors.portOrder' });
  });

  it('limits the number of tokens', () => {
    const many = Array.from({ length: 21 }, (_, index) => String(index + 1)).join(',');
    expect(parsePorts(many)).toEqual({ ok: false, code: 'errors.portTooMany' });
  });
});

describe('CIDR validation', () => {
  it('accepts IPv4 addresses and networks, normalising bare IPs to /32', () => {
    expect(validateCidr('203.0.113.10')).toEqual({ ok: true, value: '203.0.113.10/32' });
    expect(validateCidr('0.0.0.0/0')).toEqual({ ok: true, value: '0.0.0.0/0' });
    expect(validateCidr(' 198.51.100.0/24 ')).toEqual({ ok: true, value: '198.51.100.0/24' });
  });

  it('rejects empty, malformed, bad octets and bad prefixes', () => {
    expect(validateCidr('')).toEqual({ ok: false, code: 'errors.cidrRequired' });
    expect(validateCidr('1.2.3')).toEqual({ ok: false, code: 'errors.cidrFormat' });
    expect(validateCidr('1.2.3.4.5')).toEqual({ ok: false, code: 'errors.cidrFormat' });
    expect(validateCidr('1.2.3.999')).toEqual({ ok: false, code: 'errors.cidrOctet' });
    expect(validateCidr('1.2.3.4/33')).toEqual({ ok: false, code: 'errors.cidrPrefix' });
    expect(validateCidr('1.2.3.4/abc')).toEqual({ ok: false, code: 'errors.cidrPrefix' });
    expect(validateCidr('2001:db8::1')).toEqual({ ok: false, code: 'errors.cidrFormat' });
  });
});

describe('firewall draft validation', () => {
  it('accepts a valid rule', () => {
    expect(validateFirewallDraft(draft())).toEqual({});
  });

  it('collects field errors', () => {
    const errors = validateFirewallDraft(draft({ ports: '', source: '999.1.1.1/24', note: 'x'.repeat(MAX_NOTE_LENGTH + 1) }));
    expect(errors.ports).toBe('errors.portRequired');
    expect(errors.source).toBe('errors.cidrOctet');
    expect(errors.note).toBe('errors.noteLong');
  });

  it('validates the source even for ICMP rules', () => {
    const errors = validateFirewallDraft(draft({ protocol: 'icmp', source: '' }));
    expect(errors.source).toBe('errors.cidrRequired');
  });

  it('normalises drafts for storage', () => {
    const normalised = normalizeFirewallDraft(draft({ ports: '443, 80', source: '203.0.113.7' }));
    expect(normalised.ports).toBe('443,80');
    expect(normalised.source).toBe('203.0.113.7/32');
  });

  it('builds an immutable rule with id and timestamp', () => {
    const rule = buildFirewallRule(draft({ ports: ' 22 ' }), 'fw_test', '2026-11-23T12:00:00.000Z');
    expect(rule.id).toBe('fw_test');
    expect(rule.ports).toBe('22');
    expect(rule.createdAt).toBe('2026-11-23T12:00:00.000Z');
  });
});

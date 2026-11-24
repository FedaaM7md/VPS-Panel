/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { describe, expect, it } from 'vitest';
import { collectSshKeys, createSeedState, STATE_VERSION } from '../src/data/seed';

const NOW = Date.UTC(2026, 10, 23, 12, 0, 0);

describe('demo seed data', () => {
  const first = createSeedState(NOW);
  const second = createSeedState(NOW);

  it('is deterministic for a fixed clock', () => {
    expect(second).toEqual(first);
    expect(first.version).toBe(STATE_VERSION);
    expect(first.session).toBeNull();
    expect(first.settings.lang).toBe('ar');
  });

  it('contains unique servers with documentation-range addresses', () => {
    const ids = new Set(first.servers.map((server) => server.id));
    const names = new Set(first.servers.map((server) => server.name));
    const ips = new Set(first.servers.map((server) => server.ipv4));
    expect(ids.size).toBe(first.servers.length);
    expect(names.size).toBe(first.servers.length);
    expect(ips.size).toBe(first.servers.length);
    for (const server of first.servers) {
      expect(
        server.ipv4.startsWith('203.0.113.') || server.ipv4.startsWith('198.51.100.') || server.ipv4.startsWith('192.0.2.'),
      ).toBe(true);
      expect(server.ipv6.startsWith('2001:db8:')).toBe(true);
      expect(Number.isNaN(new Date(server.createdAt).getTime())).toBe(false);
    }
  });

  it('includes running, stopped, rebooting and provisioning demo states', () => {
    const statuses = new Set(first.servers.map((server) => server.status));
    expect(statuses).toEqual(new Set(['running', 'stopped', 'rebooting', 'provisioning']));
  });

  it('includes Windows RDP servers with plausible demo endpoints', () => {
    const rdpServers = first.servers.filter((server) => server.rdp !== null);
    expect(rdpServers.length).toBeGreaterThanOrEqual(2);
    for (const server of rdpServers) {
      expect(server.osId.startsWith('windows')).toBe(true);
      expect(server.rdp?.port).toBe(3389);
      expect(server.rdp?.username.length).toBeGreaterThan(0);
    }
  });

  it('labels every seeded SSH key as fictional demo material', () => {
    const keys = collectSshKeys(first.servers);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key.publicKey.toLowerCase()).toContain('fictional');
      expect(key.fingerprint.startsWith('SHA256:')).toBe(true);
      expect(key.publicKey).toContain('demo');
    }
  });

  it('seeds invoices, activity and alerts with valid references', () => {
    expect(first.invoices.length).toBeGreaterThan(3);
    expect(new Set(first.invoices.map((invoice) => invoice.number)).size).toBe(first.invoices.length);
    for (const invoice of first.invoices) {
      expect(['paid', 'pending', 'overdue']).toContain(invoice.status);
      expect(invoice.amountUsd).toBeGreaterThan(0);
    }
    expect(first.activity.length).toBeGreaterThan(3);
    expect(first.alerts.length).toBeGreaterThan(2);
    for (const alert of first.alerts) {
      if (alert.serverId) {
        expect(first.servers.some((server) => server.id === alert.serverId)).toBe(true);
      }
    }
  });

  it('deduplicates SSH keys across the fleet', () => {
    const keys = collectSshKeys(first.servers);
    expect(new Set(keys.map((key) => key.id)).size).toBe(keys.length);
  });

  it('contains no external URLs or third-party branding in seeded strings', () => {
    const serialised = JSON.stringify(first).toLowerCase();
    expect(serialised).not.toContain('http://');
    expect(serialised).not.toContain('https://');
  });
});

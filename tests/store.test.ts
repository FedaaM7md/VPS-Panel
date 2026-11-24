/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { afterEach, describe, expect, it } from 'vitest';
import { DemoStore } from '../src/state/store';
import { createSeedState } from '../src/data/seed';
import { DEMO_EMAIL, DEMO_PASSWORD, LOGIN_LOCK_MS, MAX_LOGIN_ATTEMPTS } from '../src/lib/auth';
import { getCsrfToken, resetCsrfToken } from '../src/lib/csrf';
import { createEmptyDraft, type WizardDraft } from '../src/lib/wizard';
import { PROVISION_MS } from '../src/lib/power';
import { clearDemoKeys, STORAGE_KEYS, writeJSON } from '../src/lib/storage';

const NOW = Date.UTC(2026, 10, 23, 12, 0, 0);

function makeStore() {
  const clock = { value: NOW };
  let tokenCounter = 0;
  const store = new DemoStore({
    state: createSeedState(NOW),
    now: () => clock.value,
    persist: false,
    tokenFactory: () => `test-token-${++tokenCounter}`,
  });
  return { store, clock };
}

function login(store: DemoStore): string {
  resetCsrfToken();
  const result = store.login(DEMO_EMAIL, DEMO_PASSWORD);
  expect(result.ok).toBe(true);
  return getCsrfToken();
}

function validDraft(overrides: Partial<WizardDraft> = {}): WizardDraft {
  return {
    ...createEmptyDraft(),
    name: `demo-${Math.random().toString(36).slice(2, 8)}`,
    planId: 'business',
    regionId: 'fra',
    osId: 'ubuntu-2404',
    authMethod: 'password',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    ...overrides,
  };
}

afterEach(() => {
  clearDemoKeys();
  resetCsrfToken();
});

describe('demo store authentication', () => {
  it('rejects wrong credentials and locks after five failures', () => {
    const { store } = makeStore();
    for (let attempt = 1; attempt < MAX_LOGIN_ATTEMPTS; attempt += 1) {
      const result = store.login('wrong@example.com', 'wrong-password');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe('invalid');
      expect(store.getState().session).toBeNull();
    }
    const locking = store.login('wrong@example.com', 'wrong-password');
    expect(locking.ok).toBe(false);
    if (!locking.ok) {
      expect(locking.code).toBe('locked');
      expect(locking.retryAfterMs).toBe(LOGIN_LOCK_MS);
    }

    const blocked = store.login(DEMO_EMAIL, DEMO_PASSWORD);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe('locked');
  });

  it('unlocks after the throttle window', () => {
    const { store, clock } = makeStore();
    for (let attempt = 0; attempt < MAX_LOGIN_ATTEMPTS; attempt += 1) {
      store.login(DEMO_EMAIL, 'nope');
    }
    clock.value += LOGIN_LOCK_MS + 1;
    const result = store.login(DEMO_EMAIL, DEMO_PASSWORD);
    expect(result.ok).toBe(true);
    expect(store.getState().session?.email).toBe(DEMO_EMAIL);
  });

  it('rotates the session token on every sign-in', () => {
    const { store } = makeStore();
    const first = store.login(DEMO_EMAIL, DEMO_PASSWORD);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const firstToken = first.session.token;
    store.logout();
    const second = store.login(DEMO_EMAIL, DEMO_PASSWORD);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.session.token).not.toBe(firstToken);
    expect(store.getState().session?.token).toBe(second.session.token);
  });

  it('requires CSRF and an active session for mutations', () => {
    const { store } = makeStore();
    const server = store.getState().servers.find((item) => item.status === 'running');
    expect(server).toBeDefined();
    if (!server) return;
    expect(store.power(server.id, 'stop', null).ok).toBe(false);
    expect(store.power(server.id, 'stop', 'fake').ok).toBe(false);

    const token = login(store);
    expect(store.power(server.id, 'stop', token).ok).toBe(true);
  });
});

describe('server lifecycle in the demo store', () => {
  it('stops, starts and reboots a server with observed state changes', () => {
    const { store } = makeStore();
    const token = login(store);
    const running = store.getState().servers.find((item) => item.status === 'running');
    expect(running).toBeDefined();
    if (!running) return;

    const stopped = store.power(running.id, 'stop', token);
    expect(stopped.ok).toBe(true);
    expect(store.getState().servers.find((item) => item.id === running.id)?.status).toBe('stopped');
    expect(store.getState().activity[0]?.serverId).toBe(running.id);

    const started = store.power(running.id, 'start', token);
    expect(started.ok).toBe(true);
    expect(store.getState().servers.find((item) => item.id === running.id)?.status).toBe('running');

    const rebooted = store.power(running.id, 'reboot', token);
    expect(rebooted.ok).toBe(true);
    expect(store.getState().servers.find((item) => item.id === running.id)?.status).toBe('rebooting');
  });

  it('refuses invalid power transitions', () => {
    const { store } = makeStore();
    const token = login(store);
    const stopped = store.getState().servers.find((item) => item.status === 'stopped');
    expect(stopped).toBeDefined();
    if (!stopped) return;
    const result = store.power(stopped.id, 'reboot', token);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('invalid_transition');
  });

  it('creates a provisioning server and settles it to running', () => {
    const { store, clock } = makeStore();
    const token = login(store);
    const before = store.getState().servers.length;
    const result = store.createServer(validDraft({ name: 'new-demo-01' }), token);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('provisioning');
    expect(result.value.ipv4.startsWith('203.0.113.')).toBe(true);
    expect(result.value.ipv6).toMatch(/^2001:db8:[0-9a-f]+:[0-9a-f]+::1$/);
    expect(store.getState().servers.length).toBe(before + 1);
    expect(store.getState().activity[0]?.action.type).toBe('server.create');

    clock.value += PROVISION_MS + 1000;
    const { changed } = store.tick(clock.value);
    expect(changed).toBe(true);
    expect(store.getState().servers.find((item) => item.id === result.value.id)?.status).toBe('running');
  });

  it('rejects duplicate server names and incompatible plans', () => {
    const { store } = makeStore();
    const token = login(store);
    const duplicate = store.createServer(validDraft({ name: 'web-fra-01' }), token);
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.code).toBe('invalid');

    const incompatible = store.createServer(validDraft({ planId: 'rdp', osId: 'ubuntu-2404' }), token);
    expect(incompatible.ok).toBe(false);
  });

  it('creates, validates and deletes snapshots, enforcing the demo limit', () => {
    const { store } = makeStore();
    const token = login(store);
    const server = store.getState().servers.find((item) => item.snapshots.length === 1);
    expect(server).toBeDefined();
    if (!server) return;

    const created = store.createSnapshot(server.id, 'before-test', token);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const invalid = store.createSnapshot(server.id, 'x', token);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.errors?.label).toBe('errors.snapshotLabel');

    const current = () => store.getState().servers.find((item) => item.id === server.id);
    while ((current()?.snapshots.length ?? 0) < 8) {
      const result = store.createSnapshot(server.id, `snapshot-${Math.random().toString(36).slice(2, 6)}`, token);
      expect(result.ok).toBe(true);
    }
    const overLimit = store.createSnapshot(server.id, 'one-too-many', token);
    expect(overLimit.ok).toBe(false);
    if (!overLimit.ok) expect(overLimit.code).toBe('limit');

    const removed = store.deleteSnapshot(server.id, created.value.id, token);
    expect(removed.ok).toBe(true);
    expect(current()?.snapshots.some((snapshot) => snapshot.id === created.value.id)).toBe(false);
  });
});

describe('firewall and SSH actions in the store', () => {
  const firewallDraft = {
    direction: 'inbound' as const,
    protocol: 'tcp' as const,
    ports: '2222',
    source: '203.0.113.0/24',
    note: 'demo management',
  };

  it('adds normalised firewall rules and reports field errors', () => {
    const { store } = makeStore();
    const token = login(store);
    const server = store.getState().servers[0];
    if (!server) throw new Error('missing server');

    const added = store.addFirewallRule(server.id, firewallDraft, token);
    expect(added.ok).toBe(true);
    if (added.ok) {
      expect(added.value.ports).toBe('2222');
      expect(added.value.source).toBe('203.0.113.0/24');
    }

    const invalid = store.addFirewallRule(server.id, { ...firewallDraft, ports: '99999', source: 'bad' }, token);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.errors?.ports).toBe('errors.portRange');
      expect(invalid.errors?.source).toBe('errors.cidrFormat');
    }

    if (added.ok) {
      const deleted = store.deleteFirewallRule(server.id, added.value.id, token);
      expect(deleted.ok).toBe(true);
    }
  });

  it('adds and rejects duplicate SSH keys', () => {
    const { store } = makeStore();
    const token = login(store);
    const server = store.getState().servers[0];
    if (!server) throw new Error('missing server');
    const publicKey =
      'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDEMOTESTKEYMATERIAL0000000000000000000000 demo-test@example.invalid';

    const first = store.addSshKey(server.id, { name: 'test-key', publicKey }, token);
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.value.fingerprint.startsWith('SHA256:')).toBe(true);

    const duplicate = store.addSshKey(server.id, { name: 'test-key-2', publicKey }, token);
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.errors?.publicKey).toBe('errors.duplicateKey');

    const invalid = store.addSshKey(server.id, { name: 'a', publicKey: 'not-a-key' }, token);
    expect(invalid.ok).toBe(false);

    if (first.ok) expect(store.deleteSshKey(server.id, first.value.id, token).ok).toBe(true);
  });
});

describe('billing, settings and demo reset', () => {
  it('changes the demo plan once and records the activity', () => {
    const { store } = makeStore();
    const token = login(store);
    expect(store.getState().planId).toBe('business');

    const changed = store.changePlan('scale', token);
    expect(changed.ok).toBe(true);
    expect(store.getState().planId).toBe('scale');
    expect(store.getState().activity[0]?.action.type).toBe('billing.plan');

    const same = store.changePlan('scale', token);
    expect(same.ok).toBe(false);
    if (!same.ok) expect(same.code).toBe('same');
  });

  it('validates profile updates', () => {
    const { store } = makeStore();
    const token = login(store);
    const invalid = store.updateProfile({ name: 'A', email: 'not-an-email', company: '' }, token);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.errors?.name).toBe('settings.invalidName');
      expect(invalid.errors?.email).toBe('settings.invalidEmail');
    }

    const currentEmail = store.getState().settings.profile.email;
    const changedEmail = store.updateProfile({ name: 'Mostafa Reviewer', email: 'other@example.com', company: 'NileGrid' }, token);
    expect(changedEmail.ok).toBe(false);
    if (!changedEmail.ok) expect(changedEmail.errors?.email).toBe('settings.emailLocked');

    const valid = store.updateProfile({ name: 'Mostafa Reviewer', email: currentEmail, company: 'NileGrid' }, token);
    expect(valid.ok).toBe(true);
    expect(store.getState().settings.profile.name).toBe('Mostafa Reviewer');
    expect(store.getState().settings.profile.email).toBe(currentEmail);
  });

  it('marks alerts read and keeps cosmetic preferences available pre-login', () => {
    const { store } = makeStore();
    expect(store.setLanguage('en', null)).toBe(true);
    expect(store.getState().settings.lang).toBe('en');
    expect(store.setTheme('dark', null)).toBe(true);
    expect(store.getState().settings.theme).toBe('dark');

    const token = login(store);
    const unread = store.getState().alerts.filter((alert) => !alert.read);
    expect(unread.length).toBeGreaterThan(0);
    if (unread[0]) expect(store.markAlertRead(unread[0].id, token)).toBe(true);
    expect(store.markAllAlertsRead(token)).toBe(true);
    expect(store.getState().alerts.every((alert) => alert.read)).toBe(true);
  });

  it('resets demo data but keeps the session', () => {
    const { store } = makeStore();
    const token = login(store);
    const session = store.getState().session;
    expect(session).not.toBeNull();
    const running = store.getState().servers.find((item) => item.status === 'running');
    if (running) store.power(running.id, 'stop', token);

    expect(store.resetDemo(token)).toBe(true);
    expect(store.getState().session?.token).toBe(session?.token);
    expect(store.getState().planId).toBe('business');
    expect(store.getState().servers.some((item) => item.status === 'running')).toBe(true);
  });
});

describe('persistence', () => {
  it('restores state and session from localStorage', () => {
    clearDemoKeys();
    const clock = { value: NOW };
    let counter = 0;
    const first = new DemoStore({ now: () => clock.value, persist: true, tokenFactory: () => `persist-${++counter}` });
    const result = first.login(DEMO_EMAIL, DEMO_PASSWORD);
    expect(result.ok).toBe(true);
    const token = getCsrfToken();
    const running = first.getState().servers.find((item) => item.status === 'running');
    if (!running) throw new Error('missing running server');
    expect(first.power(running.id, 'stop', token).ok).toBe(true);

    const second = new DemoStore({ now: () => clock.value, persist: true });
    expect(second.getState().session?.email).toBe(DEMO_EMAIL);
    expect(second.getState().servers.find((item) => item.id === running.id)?.status).toBe('stopped');
    expect(second.sessionExpiredOnBoot).toBe(false);

    clearDemoKeys();
  });

  it('treats an expired stored session as signed out', () => {
    clearDemoKeys();
    const state = createSeedState(NOW);
    state.session = {
      email: DEMO_EMAIL,
      name: 'Demo',
      token: 'expired-token',
      issuedAt: new Date(NOW - 9 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(NOW - 60_000).toISOString(),
      isDemo: true,
      isGuest: false,
      role: 'admin',
    };
    writeJSON(STORAGE_KEYS.state, state);
    const store = new DemoStore({ now: () => NOW, persist: true });
    expect(store.getState().session).toBeNull();
    expect(store.sessionExpiredOnBoot).toBe(true);
    clearDemoKeys();
  });
});

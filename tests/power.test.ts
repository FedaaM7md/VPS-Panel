/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { describe, expect, it } from 'vitest';
import { createSeedState } from '../src/data/seed';
import {
  applyPowerAction,
  isPowerAllowed,
  isTransient,
  REBOOT_MS,
  settleServer,
  simulatedUptimeMinutes,
} from '../src/lib/power';

const NOW = Date.UTC(2026, 10, 23, 12, 0, 0);

function demoServer(status: 'running' | 'stopped' | 'rebooting' | 'provisioning') {
  const state = createSeedState(NOW);
  const server = state.servers[0];
  if (!server) throw new Error('seed failed');
  return { ...server, status, transientUntil: status === 'rebooting' ? new Date(NOW + 60_000).toISOString() : null };
}

describe('power state transitions', () => {
  it('starts a stopped server immediately', () => {
    const outcome = applyPowerAction(demoServer('stopped'), 'start', NOW);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.server.status).toBe('running');
    expect(outcome.server.transientUntil).toBeNull();
    expect(outcome.server.rebootedAt).toBe(new Date(NOW).toISOString());
  });

  it('stops a running server', () => {
    const outcome = applyPowerAction(demoServer('running'), 'stop', NOW);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.server.status).toBe('stopped');
  });

  it('reboots a running server through a timed transition', () => {
    const outcome = applyPowerAction(demoServer('running'), 'reboot', NOW);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.server.status).toBe('rebooting');
    expect(outcome.server.transientUntil).toBe(new Date(NOW + REBOOT_MS).toISOString());
  });

  it('never mutates the input object', () => {
    const original = demoServer('running');
    const copy = { ...original };
    applyPowerAction(original, 'stop', NOW);
    expect(original).toEqual(copy);
  });

  it('rejects duplicate start and stop actions without changing state', () => {
    const running = applyPowerAction(demoServer('running'), 'start', NOW);
    expect(running.ok).toBe(false);
    if (!running.ok) expect(running.code).toBe('already_in_state');

    const stopped = applyPowerAction(demoServer('stopped'), 'stop', NOW);
    expect(stopped.ok).toBe(false);
    if (!stopped.ok) expect(stopped.code).toBe('already_in_state');
  });

  it('rejects rebooting a stopped server', () => {
    const outcome = applyPowerAction(demoServer('stopped'), 'reboot', NOW);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.code).toBe('invalid_transition');
  });

  it('rejects every action during provisioning or rebooting', () => {
    for (const status of ['provisioning', 'rebooting'] as const) {
      for (const action of ['start', 'stop', 'reboot'] as const) {
        expect(applyPowerAction(demoServer(status), action, NOW).ok).toBe(false);
      }
    }
  });

  it('exposes allowed actions consistently with transitions', () => {
    expect(isPowerAllowed(demoServer('running'), 'stop')).toBe(true);
    expect(isPowerAllowed(demoServer('running'), 'reboot')).toBe(true);
    expect(isPowerAllowed(demoServer('running'), 'start')).toBe(false);
    expect(isPowerAllowed(demoServer('stopped'), 'start')).toBe(true);
    expect(isPowerAllowed(demoServer('stopped'), 'stop')).toBe(false);
    expect(isPowerAllowed(demoServer('provisioning'), 'start')).toBe(false);
    expect(isTransient('rebooting')).toBe(true);
    expect(isTransient('running')).toBe(false);
  });

  it('keeps the same reference before the transient deadline', () => {
    const rebooting = demoServer('rebooting');
    expect(settleServer(rebooting, NOW + 30_000)).toBe(rebooting);
    expect(settleServer(rebooting, NOW - 1)).toBe(rebooting);
  });

  it('settles a reboot after its deadline', () => {
    const rebooting = demoServer('rebooting');
    const deadline = new Date(rebooting.transientUntil ?? '').getTime();
    const settled = settleServer(rebooting, deadline);
    expect(settled).not.toBe(rebooting);
    expect(settled.status).toBe('running');
    expect(settled.transientUntil).toBeNull();
    expect(settled.rebootedAt).toBe(rebooting.transientUntil);
  });

  it('settles provisioning when its timer elapses', () => {
    const state = createSeedState(NOW);
    const build = state.servers.find((server) => server.status === 'provisioning');
    expect(build).toBeDefined();
    if (!build) return;
    const deadline = new Date(build.transientUntil ?? '').getTime();
    const settled = settleServer(build, deadline);
    expect(settled.status).toBe('running');
  });

  it('computes simulated uptime from creation time', () => {
    const server = demoServer('running');
    const reference = server.rebootedAt ?? server.createdAt;
    const minutes = simulatedUptimeMinutes(server, new Date(reference).getTime() + 3 * 60 * 60 * 1000);
    expect(minutes).toBeGreaterThanOrEqual(180);
  });
});

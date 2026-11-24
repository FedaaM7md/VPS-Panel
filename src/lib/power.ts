/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import type { PowerAction, Server, ServerStatus } from './types';

export const REBOOT_MS = 6000;
export const PROVISION_MS = 12000;

export type PowerCode = 'ok' | 'invalid_transition' | 'already_in_state';

export interface PowerSuccess {
  ok: true;
  code: 'ok';
  server: Server;
  action: PowerAction;
}

export interface PowerFailure {
  ok: false;
  code: Exclude<PowerCode, 'ok'>;
  server: Server;
  action: PowerAction;
}

export type PowerOutcome = PowerSuccess | PowerFailure;

function isRedundant(server: Server, action: PowerAction): boolean {
  if (action === 'start') return server.status === 'running';
  if (action === 'stop') return server.status === 'stopped';
  return false;
}

export function isPowerAllowed(server: Server, action: PowerAction): boolean {
  if (server.status === 'provisioning' || server.status === 'rebooting') return false;
  if (action === 'start') return server.status === 'stopped';
  return server.status === 'running';
}

/**
 * Pure simulated power transition. `nowMs` is injected so tests are stable.
 * Returns a new server object; the input is never mutated.
 */
export function applyPowerAction(server: Server, action: PowerAction, nowMs: number): PowerOutcome {
  if (!isPowerAllowed(server, action)) {
    return {
      ok: false,
      code: isRedundant(server, action) ? 'already_in_state' : 'invalid_transition',
      server,
      action,
    };
  }

  const nowIso = new Date(nowMs).toISOString();

  if (action === 'start') {
    return {
      ok: true,
      code: 'ok',
      action,
      server: {
        ...server,
        status: 'running',
        rebootedAt: nowIso,
        transientUntil: null,
      },
    };
  }

  if (action === 'stop') {
    return {
      ok: true,
      code: 'ok',
      action,
      server: {
        ...server,
        status: 'stopped',
        transientUntil: null,
      },
    };
  }

  return {
    ok: true,
    code: 'ok',
    action,
    server: {
      ...server,
      status: 'rebooting',
      transientUntil: new Date(nowMs + REBOOT_MS).toISOString(),
    },
  };
}

/**
 * Resolves rebooting/provisioning states once their simulated timer elapsed.
 * Returns the same reference when nothing changed, which lets the store detect
 * real changes cheaply.
 */
export function settleServer(server: Server, nowMs: number): Server {
  if (server.status !== 'rebooting' && server.status !== 'provisioning') return server;
  if (!server.transientUntil) return server;
  const deadline = new Date(server.transientUntil).getTime();
  if (Number.isNaN(deadline) || nowMs < deadline) return server;
  return {
    ...server,
    status: 'running',
    rebootedAt: server.transientUntil,
    transientUntil: null,
  };
}

export function isTransient(status: ServerStatus): boolean {
  return status === 'rebooting' || status === 'provisioning';
}

/** Simulated uptime in minutes, derived from creation time (capped for realism). */
export function simulatedUptimeMinutes(server: Server, nowMs: number): number {
  if (server.status === 'stopped') {
    const referenced = server.rebootedAt ? new Date(server.rebootedAt).getTime() : new Date(server.createdAt).getTime();
    return Math.max(0, Math.floor((nowMs - referenced) / 60000));
  }
  const started = server.rebootedAt ?? server.createdAt;
  const startedMs = new Date(started).getTime();
  if (Number.isNaN(startedMs)) return 0;
  return Math.max(0, Math.floor((nowMs - startedMs) / 60000));
}

/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import type {
  ActivityAction,
  ActivityEntry,
  Alert,
  AppState,
  FirewallRule,
  Lang,
  NotificationSettings,
  PowerAction,
  Profile,
  Server,
  Session,
  Settings,
  Snapshot,
  SshKey,
  Theme,
} from '../lib/types';
import { STATE_VERSION, collectSshKeys, createSeedState } from '../data/seed';
import { DEMO_MODE_ENABLED } from '../config';
import {
  demoResetDue,
  evaluateGuestAccess,
  freshGuestThrottle,
  guestRetryAfterMs,
  type GuestThrottle,
} from '../lib/demo';
import { getOs, getPlan, getRegion } from '../data/catalog';
import {
  createSession,
  evaluateLogin,
  defaultTokenFactory,
  freshThrottle,
  isSessionValid,
  GUEST_EMAIL,
  GUEST_NAME,
  type LoginResult,
  type LoginThrottle,
} from '../lib/auth';
import { applyPowerAction, settleServer, PROVISION_MS } from '../lib/power';
import { issueCsrfToken, resetCsrfToken, verifyCsrfToken } from '../lib/csrf';
import { STORAGE_KEYS, readJSON, writeJSON } from '../lib/storage';
import { isValidEmail, makeId, parseSshPublicKey, demoFingerprint, validateKeyName, validateSnapshotLabel, validateSshPublicKey } from '../lib/validation';
import { buildFirewallRule, validateFirewallDraft, type FirewallDraft, type FirewallErrors } from '../lib/firewall';
import { canCreate, type WizardContext, type WizardDraft } from '../lib/wizard';

export type MutationFailure = { ok: false; code: string; errors?: Record<string, string> };
export type MutationSuccess<T> = { ok: true; value: T };
export type MutationResult<T> = MutationSuccess<T> | MutationFailure;

export type PowerResult =
  | { ok: true; server: Server }
  | { ok: false; code: 'csrf' | 'unauthorized' | 'not_found' | 'invalid_transition' | 'already_in_state' };

export type GuestLoginResult =
  | { ok: true; session: Session }
  | { ok: false; code: 'disabled' | 'throttled'; retryAfterMs?: number };

export interface StoreOptions {
  state?: AppState;
  now?: () => number;
  tokenFactory?: () => string;
  persist?: boolean;
  demoMode?: boolean;
}

let activityCounter = 0;

function nextActivityId(nowMs: number): string {
  activityCounter += 1;
  return `act_${nowMs.toString(36)}_${activityCounter}`;
}

function capActivity(entries: ActivityEntry[]): ActivityEntry[] {
  return entries.slice(0, 80);
}

export class DemoStore {
  private state: AppState;
  private listeners = new Set<() => void>();
  private now: () => number;
  private tokenFactory: () => string;
  private persistEnabled: boolean;
  private demoModeEnabled: boolean;
  private throttle: LoginThrottle;
  private guestThrottle: GuestThrottle;
  /** True when a stored session had expired when the app booted. */
  readonly sessionExpiredOnBoot: boolean;

  constructor(options: StoreOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.tokenFactory = options.tokenFactory ?? defaultTokenFactory;
    this.persistEnabled = options.persist ?? true;
    this.demoModeEnabled = options.demoMode ?? DEMO_MODE_ENABLED;

    const loaded = options.state ?? (this.persistEnabled ? this.loadState() : null);
    const nowMs = this.now();
    this.state = loaded && loaded.version === STATE_VERSION ? loaded : createSeedState(nowMs);

    let bootReseed = false;
    if (loaded && loaded.version === STATE_VERSION && demoResetDue(loaded.demoResetAt, nowMs)) {
      this.state = this.reseeded(loaded);
      bootReseed = true;
    }

    let expired = false;
    if (this.state.session && !isSessionValid(this.state.session, nowMs)) {
      this.state = { ...this.state, session: null };
      expired = true;
    }
    this.sessionExpiredOnBoot = expired;

    this.throttle = this.loadThrottle();
    this.guestThrottle = this.loadGuestThrottle();
    if (this.persistEnabled) {
      if (!loaded || expired || bootReseed) this.saveState();
    }
  }

  getState(): Readonly<AppState> {
    return this.state;
  }

  getThrottle(): LoginThrottle {
    return { ...this.throttle };
  }

  getGuestThrottle(): GuestThrottle {
    return { entries: [...this.guestThrottle.entries], lockedUntil: this.guestThrottle.lockedUntil };
  }

  guestRetryAfterSeconds(): number {
    return Math.max(0, Math.ceil(guestRetryAfterMs(this.guestThrottle, this.now()) / 1000));
  }

  isDemoModeEnabled(): boolean {
    return this.demoModeEnabled;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        console.error('Store listener failed', error);
      }
    }
  }

  private saveState(): void {
    if (!this.persistEnabled) return;
    writeJSON(STORAGE_KEYS.state, this.state);
  }

  private loadState(): AppState | null {
    const loaded = readJSON<AppState>(STORAGE_KEYS.state);
    if (!loaded || typeof loaded !== 'object') return null;
    if (!Array.isArray(loaded.servers) || !Array.isArray(loaded.activity) || !loaded.settings) return null;
    return loaded;
  }

  private loadThrottle(): LoginThrottle {
    if (!this.persistEnabled) return freshThrottle();
    const stored = readJSON<LoginThrottle>(STORAGE_KEYS.throttle);
    if (!stored || typeof stored.failures !== 'number') return freshThrottle();
    const lockedUntil = typeof stored.lockedUntil === 'number' ? stored.lockedUntil : null;
    return { failures: Math.max(0, stored.failures), lockedUntil };
  }

  private saveThrottle(): void {
    if (!this.persistEnabled) return;
    writeJSON(STORAGE_KEYS.throttle, this.throttle);
  }

  private loadGuestThrottle(): GuestThrottle {
    if (!this.persistEnabled) return freshGuestThrottle();
    const stored = readJSON<GuestThrottle>(STORAGE_KEYS.guestThrottle);
    if (!stored || !Array.isArray(stored.entries)) return freshGuestThrottle();
    return {
      entries: stored.entries.filter((stamp) => typeof stamp === 'number' && Number.isFinite(stamp)).slice(-20),
      lockedUntil: typeof stored.lockedUntil === 'number' ? stored.lockedUntil : null,
    };
  }

  private saveGuestThrottle(): void {
    if (!this.persistEnabled) return;
    writeJSON(STORAGE_KEYS.guestThrottle, this.guestThrottle);
  }

  /**
   * Fresh seeded data that keeps the sign-in, language and theme so an hourly
   * reset does not throw the visitor out of the demonstration.
   */
  private reseeded(previous: AppState): AppState {
    const nowMs = this.now();
    const seed = createSeedState(nowMs);
    seed.session = previous.session;
    seed.settings = {
      ...seed.settings,
      lang: previous.settings.lang,
      theme: previous.settings.theme,
    };
    seed.demoEpoch = previous.demoEpoch || seed.demoEpoch;
    seed.demoResetAt = new Date(nowMs).toISOString();
    return seed;
  }

  private authorized(csrf: string | null): boolean {
    if (!verifyCsrfToken(csrf)) return false;
    return isSessionValid(this.state.session, this.now());
  }

  private addActivity(action: ActivityAction, server?: Server): ActivityEntry {
    const nowMs = this.now();
    const entry: ActivityEntry = {
      id: nextActivityId(nowMs),
      at: new Date(nowMs).toISOString(),
      action,
      ...(server ? { serverId: server.id, serverName: server.name } : {}),
    };
    this.state.activity = capActivity([entry, ...this.state.activity]);
    return entry;
  }

  // ---------------------------------------------------------------- auth

  login(email: string, password: string): LoginResult {
    const nowMs = this.now();
    const result = evaluateLogin(
      { email, password },
      this.throttle,
      nowMs,
      this.tokenFactory,
      this.demoModeEnabled,
    );
    this.throttle = result.throttle;
    this.saveThrottle();

    if (result.ok) {
      this.state.session = result.session;
      this.addActivity({ type: 'auth.login' });
      issueCsrfToken(this.tokenFactory);
      this.saveState();
      this.notify();
    }
    return result;
  }

  /**
   * One-click guest entry for the showcase. Rate-limited to five entries per
   * minute, then a 60-second cooldown, and revoked entirely when demo mode is
   * switched off at build time.
   */
  guestLogin(): GuestLoginResult {
    if (!this.demoModeEnabled) return { ok: false, code: 'disabled' };

    const nowMs = this.now();
    const access = evaluateGuestAccess(this.guestThrottle, nowMs);
    this.guestThrottle = access.throttle;
    this.saveGuestThrottle();

    if (!access.allowed) {
      return { ok: false, code: 'throttled', retryAfterMs: access.retryAfterMs };
    }

    const session = createSession(GUEST_EMAIL, GUEST_NAME, nowMs, this.tokenFactory(), { isGuest: true });
    this.state.session = session;
    this.addActivity({ type: 'auth.guest' });
    issueCsrfToken(this.tokenFactory);
    this.saveState();
    this.notify();
    return { ok: true, session };
  }

  /** Applies a new epoch written by `npm run demo:reset`; true when reseeded. */
  applyDemoEpoch(epoch: string): boolean {
    const next = epoch.trim();
    if (!next || this.state.demoEpoch === next) return false;
    this.state = this.reseeded(this.state);
    this.state.demoEpoch = next;
    this.saveState();
    this.notify();
    return true;
  }

  logout(): void {
    this.state.session = null;
    resetCsrfToken();
    this.saveState();
    this.notify();
  }

  // ---------------------------------------------------------------- clock

  /** Advances the simulator and settles transient states. Returns the sample. */
  tick(nowMs: number = this.now()): { sample: number; changed: boolean } {
    if (this.demoModeEnabled && demoResetDue(this.state.demoResetAt, nowMs)) {
      this.state = this.reseeded(this.state);
      this.saveState();
      this.notify();
    }
    const sample = Math.floor(nowMs / 4000);
    let changed = false;
    const servers = this.state.servers.map((server) => {
      const settled = settleServer(server, nowMs);
      if (settled !== server) changed = true;
      return settled;
    });

    this.state.sample = sample;
    if (changed) {
      this.state.servers = servers;
      this.saveState();
      this.notify();
    }
    return { sample, changed };
  }

  // ---------------------------------------------------------------- servers

  power(serverId: string, action: PowerAction, csrf: string | null): PowerResult {
    if (!this.authorized(csrf)) {
      return { ok: false, code: verifyCsrfToken(csrf) ? 'unauthorized' : 'csrf' };
    }
    const server = this.state.servers.find((item) => item.id === serverId);
    if (!server) return { ok: false, code: 'not_found' };

    const outcome = applyPowerAction(server, action, this.now());
    if (!outcome.ok) return { ok: false, code: outcome.code };

    this.state.servers = this.state.servers.map((item) => (item.id === serverId ? outcome.server : item));
    this.addActivity({ type: 'power', action }, outcome.server);
    this.saveState();
    this.notify();
    return { ok: true, server: outcome.server };
  }

  createServer(draft: WizardDraft, csrf: string | null): MutationResult<Server> {
    if (!this.authorized(csrf)) {
      return { ok: false, code: verifyCsrfToken(csrf) ? 'unauthorized' : 'csrf' };
    }
    const context: WizardContext = {
      existingNames: this.state.servers.map((server) => server.name),
      availableKeyIds: collectSshKeys(this.state.servers).map((key) => key.id),
    };
    if (!canCreate(draft, context)) return { ok: false, code: 'invalid' };

    if (!draft.planId || !draft.regionId || !draft.osId) return { ok: false, code: 'invalid' };
    const plan = getPlan(draft.planId);
    const os = getOs(draft.osId);
    const region = getRegion(draft.regionId);
    if (plan.rdp !== os.rdp) return { ok: false, code: 'invalid' };

    const nowMs = this.now();
    const name = draft.name.trim();
    const ipv4 = this.allocateIpv4();
    const zone = (10 + this.state.servers.length).toString(16);
    const ipv6 = `2001:db8:${zone}:${(50 + this.state.servers.length).toString(16)}::1`;
    const keys = draft.authMethod === 'key' ? this.pickKeys(draft.keyIds, nowMs) : [];

    const server: Server = {
      id: makeId('srv', nowMs),
      name,
      hostname: name,
      planId: plan.id,
      regionId: region.id,
      osId: os.id,
      status: 'provisioning',
      ipv4,
      ipv6,
      cpuCores: plan.vcpu,
      ramGb: plan.ramGb,
      diskGb: plan.diskGb,
      bandwidthTb: plan.bandwidthTb,
      createdAt: new Date(nowMs).toISOString(),
      rebootedAt: null,
      transientUntil: new Date(nowMs + PROVISION_MS).toISOString(),
      snapshots: [],
      firewall: [],
      sshKeys: keys,
      rdp: plan.rdp
        ? { enabled: true, port: 3389, username: draft.rdpUser.trim() || 'Administrator' }
        : null,
    };

    this.state.servers = [server, ...this.state.servers];
    this.addActivity({ type: 'server.create' }, server);
    this.saveState();
    this.notify();
    return { ok: true, value: server };
  }

  private pickKeys(keyIds: readonly string[], nowMs: number): SshKey[] {
    const vault = collectSshKeys(this.state.servers);
    const selected: SshKey[] = [];
    keyIds.forEach((id, index) => {
      const key = vault.find((candidate) => candidate.id === id);
      if (key) selected.push({ ...key, id: makeId('key', nowMs + index) });
    });
    return selected;
  }

  private allocateIpv4(): string {
    const used = new Set(this.state.servers.map((server) => server.ipv4));
    for (let host = 70; host <= 240; host += 1) {
      const candidate = `203.0.113.${host}`;
      if (!used.has(candidate)) return candidate;
    }
    return `203.0.113.${Math.floor(Math.random() * 100) + 100}`;
  }

  // ---------------------------------------------------------------- snapshots

  createSnapshot(serverId: string, label: string, csrf: string | null): MutationResult<Snapshot> {
    if (!this.authorized(csrf)) {
      return { ok: false, code: verifyCsrfToken(csrf) ? 'unauthorized' : 'csrf' };
    }
    const server = this.state.servers.find((item) => item.id === serverId);
    if (!server) return { ok: false, code: 'not_found' };
    if (server.snapshots.length >= 8) return { ok: false, code: 'limit' };
    const problem = validateSnapshotLabel(label);
    if (problem) return { ok: false, code: 'invalid', errors: { label: problem } };

    const nowMs = this.now();
    const sizeGb = Math.max(8, Math.round(server.diskGb * (0.12 + (server.snapshots.length % 4) * 0.03)));
    const snapshot: Snapshot = {
      id: makeId('snap', nowMs),
      label: label.trim(),
      sizeGb,
      createdAt: new Date(nowMs).toISOString(),
      state: 'available',
    };
    const updated: Server = { ...server, snapshots: [snapshot, ...server.snapshots] };
    this.state.servers = this.state.servers.map((item) => (item.id === serverId ? updated : item));
    this.addActivity({ type: 'snapshot.create', label: snapshot.label }, updated);
    this.saveState();
    this.notify();
    return { ok: true, value: snapshot };
  }

  deleteSnapshot(serverId: string, snapshotId: string, csrf: string | null): MutationResult<true> {
    if (!this.authorized(csrf)) {
      return { ok: false, code: verifyCsrfToken(csrf) ? 'unauthorized' : 'csrf' };
    }
    const server = this.state.servers.find((item) => item.id === serverId);
    if (!server) return { ok: false, code: 'not_found' };
    if (!server.snapshots.some((snapshot) => snapshot.id === snapshotId)) {
      return { ok: false, code: 'not_found' };
    }
    const updated: Server = {
      ...server,
      snapshots: server.snapshots.filter((snapshot) => snapshot.id !== snapshotId),
    };
    this.state.servers = this.state.servers.map((item) => (item.id === serverId ? updated : item));
    this.addActivity({ type: 'snapshot.delete' }, updated);
    this.saveState();
    this.notify();
    return { ok: true, value: true };
  }

  // ---------------------------------------------------------------- firewall

  addFirewallRule(serverId: string, draft: FirewallDraft, csrf: string | null): MutationResult<FirewallRule> {
    if (!this.authorized(csrf)) {
      return { ok: false, code: verifyCsrfToken(csrf) ? 'unauthorized' : 'csrf' };
    }
    const server = this.state.servers.find((item) => item.id === serverId);
    if (!server) return { ok: false, code: 'not_found' };
    if (server.firewall.length >= 25) return { ok: false, code: 'limit' };

    const errors: FirewallErrors = validateFirewallDraft(draft);
    if (Object.keys(errors).length > 0) {
      return { ok: false, code: 'validation', errors: { ...errors } };
    }

    const nowMs = this.now();
    const rule = buildFirewallRule(draft, makeId('fw', nowMs), new Date(nowMs).toISOString());
    const updated: Server = { ...server, firewall: [rule, ...server.firewall] };
    this.state.servers = this.state.servers.map((item) => (item.id === serverId ? updated : item));
    this.addActivity({ type: 'firewall.add', ports: rule.ports }, updated);
    this.saveState();
    this.notify();
    return { ok: true, value: rule };
  }

  deleteFirewallRule(serverId: string, ruleId: string, csrf: string | null): MutationResult<true> {
    if (!this.authorized(csrf)) {
      return { ok: false, code: verifyCsrfToken(csrf) ? 'unauthorized' : 'csrf' };
    }
    const server = this.state.servers.find((item) => item.id === serverId);
    if (!server) return { ok: false, code: 'not_found' };
    if (!server.firewall.some((rule) => rule.id === ruleId)) return { ok: false, code: 'not_found' };
    const updated: Server = { ...server, firewall: server.firewall.filter((rule) => rule.id !== ruleId) };
    this.state.servers = this.state.servers.map((item) => (item.id === serverId ? updated : item));
    this.addActivity({ type: 'firewall.delete' }, updated);
    this.saveState();
    this.notify();
    return { ok: true, value: true };
  }

  // ---------------------------------------------------------------- ssh

  addSshKey(serverId: string, input: { name: string; publicKey: string }, csrf: string | null): MutationResult<SshKey> {
    if (!this.authorized(csrf)) {
      return { ok: false, code: verifyCsrfToken(csrf) ? 'unauthorized' : 'csrf' };
    }
    const server = this.state.servers.find((item) => item.id === serverId);
    if (!server) return { ok: false, code: 'not_found' };
    if (server.sshKeys.length >= 10) return { ok: false, code: 'limit' };

    const nameError = validateKeyName(input.name);
    if (nameError) return { ok: false, code: 'validation', errors: { name: nameError } };
    const keyError = validateSshPublicKey(input.publicKey);
    if (keyError) return { ok: false, code: 'validation', errors: { publicKey: keyError } };

    const parsed = parseSshPublicKey(input.publicKey);
    if (!parsed) return { ok: false, code: 'validation', errors: { publicKey: 'errors.keyFormat' } };

    if (server.sshKeys.some((key) => key.publicKey.includes(parsed.payload))) {
      return { ok: false, code: 'validation', errors: { publicKey: 'errors.duplicateKey' } };
    }

    const nowMs = this.now();
    const publicKey = input.publicKey.trim();
    const key: SshKey = {
      id: makeId('key', nowMs),
      name: input.name.trim(),
      publicKey,
      fingerprint: demoFingerprint(publicKey),
      addedAt: new Date(nowMs).toISOString(),
    };
    const updated: Server = { ...server, sshKeys: [key, ...server.sshKeys] };
    this.state.servers = this.state.servers.map((item) => (item.id === serverId ? updated : item));
    this.addActivity({ type: 'ssh.add', keyName: key.name }, updated);
    this.saveState();
    this.notify();
    return { ok: true, value: key };
  }

  deleteSshKey(serverId: string, keyId: string, csrf: string | null): MutationResult<true> {
    if (!this.authorized(csrf)) {
      return { ok: false, code: verifyCsrfToken(csrf) ? 'unauthorized' : 'csrf' };
    }
    const server = this.state.servers.find((item) => item.id === serverId);
    if (!server) return { ok: false, code: 'not_found' };
    if (!server.sshKeys.some((key) => key.id === keyId)) return { ok: false, code: 'not_found' };
    const updated: Server = { ...server, sshKeys: server.sshKeys.filter((key) => key.id !== keyId) };
    this.state.servers = this.state.servers.map((item) => (item.id === serverId ? updated : item));
    this.addActivity({ type: 'ssh.delete' }, updated);
    this.saveState();
    this.notify();
    return { ok: true, value: true };
  }

  // ---------------------------------------------------------------- billing & settings

  changePlan(planId: 'starter' | 'business' | 'scale' | 'rdp', csrf: string | null): MutationResult<'starter' | 'business' | 'scale' | 'rdp'> {
    if (!this.authorized(csrf)) {
      return { ok: false, code: verifyCsrfToken(csrf) ? 'unauthorized' : 'csrf' };
    }
    if (this.state.planId === planId) return { ok: false, code: 'same' };
    this.state.planId = planId;
    this.addActivity({ type: 'billing.plan', planId });
    this.saveState();
    this.notify();
    return { ok: true, value: planId };
  }

  updateProfile(profile: Profile, csrf: string | null): MutationResult<Settings> {
    if (!this.authorized(csrf)) {
      return { ok: false, code: verifyCsrfToken(csrf) ? 'unauthorized' : 'csrf' };
    }
    const name = profile.name.trim();
    const email = profile.email.trim().toLowerCase();
    const company = profile.company.trim();
    const errors: Record<string, string> = {};
    if (name.length < 2 || name.length > 60) errors.name = 'settings.invalidName';
    if (!isValidEmail(email)) errors.email = 'settings.invalidEmail';
    else if (this.state.session?.isDemo && email !== this.state.settings.profile.email) {
      errors.email = 'settings.emailLocked';
    }
    if (company.length > 80) errors.company = 'errors.maxLength';
    if (Object.keys(errors).length > 0) return { ok: false, code: 'validation', errors };

    this.state.settings = { ...this.state.settings, profile: { name, email, company } };
    this.addActivity({ type: 'settings.update' });
    this.saveState();
    this.notify();
    return { ok: true, value: this.state.settings };
  }

  updateNotifications(notifications: NotificationSettings, csrf: string | null): MutationResult<Settings> {
    if (!this.authorized(csrf)) {
      return { ok: false, code: verifyCsrfToken(csrf) ? 'unauthorized' : 'csrf' };
    }
    this.state.settings = { ...this.state.settings, notifications: { ...notifications } };
    this.addActivity({ type: 'settings.update' });
    this.saveState();
    this.notify();
    return { ok: true, value: this.state.settings };
  }

  setLanguage(lang: Lang, csrf: string | null): boolean {
    // Cosmetic preference: allowed on the login screen, guarded once signed in.
    if (this.state.session && !this.authorized(csrf)) return false;
    this.state.settings = { ...this.state.settings, lang };
    writeJSON(STORAGE_KEYS.lang, lang);
    this.saveState();
    this.notify();
    return true;
  }

  setTheme(theme: Theme, csrf: string | null): boolean {
    if (this.state.session && !this.authorized(csrf)) return false;
    this.state.settings = { ...this.state.settings, theme };
    writeJSON(STORAGE_KEYS.theme, theme);
    this.saveState();
    this.notify();
    return true;
  }

  markAlertRead(alertId: string, csrf: string | null): boolean {
    if (!this.authorized(csrf)) return false;
    let changed = false;
    this.state.alerts = this.state.alerts.map((alert) => {
      if (alert.id === alertId && !alert.read) {
        changed = true;
        return { ...alert, read: true };
      }
      return alert;
    });
    if (changed) {
      this.saveState();
      this.notify();
    }
    return changed;
  }

  markAllAlertsRead(csrf: string | null): boolean {
    if (!this.authorized(csrf)) return false;
    const changed = this.state.alerts.some((alert) => !alert.read);
    if (changed) {
      this.state.alerts = this.state.alerts.map((alert) => ({ ...alert, read: true }));
      this.saveState();
      this.notify();
    }
    return changed;
  }

  resetDemo(csrf: string | null): boolean {
    if (!this.authorized(csrf)) return false;
    this.state = this.reseeded(this.state);
    this.saveState();
    this.notify();
    return true;
  }

  /** Unread alerts only, newest first. */
  unreadAlerts(): Alert[] {
    return this.state.alerts.filter((alert) => !alert.read);
  }
}

let singleton: DemoStore | null = null;

export function getStore(): DemoStore {
  if (!singleton) singleton = new DemoStore();
  return singleton;
}

/** Test-only reset of the module singleton. */
export function resetStoreSingleton(): void {
  singleton = null;
}

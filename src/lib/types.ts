/**
 * Shared domain types for the VPS Panel concept showcase.
 * © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE.
 */

export const APP_VERSION = '0.2.0';

export type Lang = 'ar' | 'en';
export type Theme = 'light' | 'dark';
export type Direction = 'rtl' | 'ltr';

export type ServerStatus = 'running' | 'stopped' | 'rebooting' | 'provisioning';
export type PowerAction = 'start' | 'stop' | 'reboot';

export type PlanId = 'starter' | 'business' | 'scale' | 'rdp';
export type RegionId = 'fra' | 'dxb' | 'ruh' | 'ams' | 'iad' | 'sin';
export type OsId = 'ubuntu-2404' | 'debian-12' | 'rocky-9' | 'windows-2022' | 'windows-2025';

export interface Plan {
  id: PlanId;
  vcpu: number;
  ramGb: number;
  diskGb: number;
  bandwidthTb: number;
  priceUsd: number;
  rdp: boolean;
  popular: boolean;
}

export interface Region {
  id: RegionId;
  code: string;
  latencyMs: number;
  zone: 'eu' | 'me' | 'us' | 'apac';
}

export interface OsImage {
  id: OsId;
  name: string;
  family: 'linux' | 'windows';
  version: string;
  rdp: boolean;
}

export interface SshKey {
  id: string;
  name: string;
  publicKey: string;
  fingerprint: string;
  addedAt: string;
}

export interface Snapshot {
  id: string;
  label: string;
  sizeGb: number;
  createdAt: string;
  state: 'available' | 'creating';
}

export type FirewallProtocol = 'tcp' | 'udp' | 'icmp';
export type FirewallDirection = 'inbound' | 'outbound';

export interface FirewallRule {
  id: string;
  direction: FirewallDirection;
  protocol: FirewallProtocol;
  ports: string;
  source: string;
  note: string;
  createdAt: string;
}

export interface RdpInfo {
  enabled: boolean;
  port: number;
  username: string;
}

export interface Server {
  id: string;
  name: string;
  hostname: string;
  planId: PlanId;
  regionId: RegionId;
  osId: OsId;
  status: ServerStatus;
  ipv4: string;
  ipv6: string;
  cpuCores: number;
  ramGb: number;
  diskGb: number;
  bandwidthTb: number;
  createdAt: string;
  rebootedAt: string | null;
  /** When a transient status (rebooting/provisioning) resolves. */
  transientUntil: string | null;
  snapshots: Snapshot[];
  firewall: FirewallRule[];
  sshKeys: SshKey[];
  rdp: RdpInfo | null;
}

export type ActivityAction =
  | { type: 'power'; action: PowerAction }
  | { type: 'server.create' }
  | { type: 'snapshot.create'; label: string }
  | { type: 'snapshot.delete' }
  | { type: 'firewall.add'; ports: string }
  | { type: 'firewall.delete' }
  | { type: 'ssh.add'; keyName: string }
  | { type: 'ssh.delete' }
  | { type: 'billing.plan'; planId: PlanId }
  | { type: 'auth.login' }
  | { type: 'auth.guest' }
  | { type: 'settings.update' };

export interface ActivityEntry {
  id: string;
  at: string;
  serverId?: string;
  serverName?: string;
  action: ActivityAction;
}

export type AlertCode = 'high_cpu' | 'backup_done' | 'invoice_due' | 'rdp_blocked' | 'snapshot_cleanup';
export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  code: AlertCode;
  severity: AlertSeverity;
  serverId?: string;
  at: string;
  read: boolean;
}

export type InvoiceStatus = 'paid' | 'pending' | 'overdue';

export interface Invoice {
  id: string;
  number: string;
  issuedAt: string;
  amountUsd: number;
  status: InvoiceStatus;
  planId: PlanId;
}

export interface NotificationSettings {
  email: boolean;
  maintenance: boolean;
  security: boolean;
  product: boolean;
}

export interface Profile {
  name: string;
  email: string;
  company: string;
}

export interface Settings {
  lang: Lang;
  theme: Theme;
  profile: Profile;
  notifications: NotificationSettings;
}

export interface Session {
  email: string;
  name: string;
  token: string;
  issuedAt: string;
  expiresAt: string;
  /** Every account in this concept is a demo account. */
  isDemo: boolean;
  isGuest: boolean;
  role: 'admin';
}

export interface AppState {
  version: number;
  servers: Server[];
  activity: ActivityEntry[];
  alerts: Alert[];
  invoices: Invoice[];
  settings: Settings;
  session: Session | null;
  planId: PlanId;
  /** Monotonic counter used by the deterministic simulator. */
  sample: number;
  /** ISO timestamp of the last demo reseed (hourly maintenance). */
  demoResetAt: string;
  /** Marker from `public/demo-epoch.json`; a new value triggers a reseed. */
  demoEpoch: string;
}

export interface ServerMetrics {
  cpu: number;
  memory: number;
  disk: number;
  netIn: number;
  netOut: number;
  series: {
    cpu: number[];
    memory: number[];
    disk: number[];
    network: number[];
  };
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; code: string };

export type FieldErrors = Record<string, string>;

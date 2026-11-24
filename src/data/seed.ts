/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import type {
  ActivityEntry,
  Alert,
  AppState,
  FirewallRule,
  Invoice,
  Server,
  Snapshot,
  SshKey,
} from '../lib/types';
import { demoFingerprint } from '../lib/validation';
import { getOs, getPlan } from './catalog';

export const STATE_VERSION = 3;

function iso(nowMs: number, minutesAgo: number): string {
  return new Date(nowMs - minutesAgo * 60_000).toISOString();
}

function inMinutes(nowMs: number, minutes: number): string {
  return new Date(nowMs + minutes * 60_000).toISOString();
}

const DEMO_KEY_A =
  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINILEGfictionaldemokeydonotuse0000000000 ops@nilegrid.invalid';
const DEMO_KEY_B =
  'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDNILEGfictionaldemorsakeydonotuse0000000ci-runner@nilegrid.invalid';
const DEMO_KEY_C =
  'ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBNILEGfictionaldemokey000000000000 laptop@nilegrid.invalid';

function demoKey(id: string, name: string, publicKey: string, addedAt: string): SshKey {
  return {
    id,
    name,
    publicKey,
    fingerprint: demoFingerprint(publicKey),
    addedAt,
  };
}

function snapshot(id: string, label: string, sizeGb: number, createdAt: string): Snapshot {
  return { id, label, sizeGb, createdAt, state: 'available' };
}

function rule(
  id: string,
  direction: FirewallRule['direction'],
  protocol: FirewallRule['protocol'],
  ports: string,
  source: string,
  note: string,
  createdAt: string,
): FirewallRule {
  return { id, direction, protocol, ports, source, note, createdAt };
}

interface ServerSeed {
  id: string;
  name: string;
  planId: Server['planId'];
  regionId: Server['regionId'];
  osId: Server['osId'];
  status: Server['status'];
  ipv4: string;
  ipv6: string;
  createdMinutesAgo: number;
  rebootedMinutesAgo: number | null;
  transientInMinutes?: number;
  snapshots: Snapshot[];
  firewall: FirewallRule[];
  sshKeys: SshKey[];
  rdp: Server['rdp'];
  hostnameSuffix?: string;
}

export function createSeedState(nowMs: number = Date.now()): AppState {
  const keyA = demoKey('key_a1', 'laptop-omar', DEMO_KEY_A, iso(nowMs, 60 * 24 * 92));
  const keyB = demoKey('key_b2', 'ci-runner', DEMO_KEY_B, iso(nowMs, 60 * 24 * 41));
  const keyC = demoKey('key_c3', 'ops-yubikey', DEMO_KEY_C, iso(nowMs, 60 * 24 * 13));

  const seeds: ServerSeed[] = [
    {
      id: 'srv_web_fra_01',
      name: 'web-fra-01',
      planId: 'business',
      regionId: 'fra',
      osId: 'ubuntu-2404',
      status: 'running',
      ipv4: '203.0.113.11',
      ipv6: '2001:db8:11::11',
      createdMinutesAgo: 60 * 24 * 126,
      rebootedMinutesAgo: 60 * 24 * 12,
      snapshots: [
        snapshot('snap_w1', 'pre-nginx-upgrade', 34, iso(nowMs, 60 * 24 * 3)),
        snapshot('snap_w2', 'weekly-2026-11-18', 31, iso(nowMs, 60 * 24 * 5)),
      ],
      firewall: [
        rule('fw_w1', 'inbound', 'tcp', '22,80,443', '0.0.0.0/0', 'public web + ssh (demo)', iso(nowMs, 60 * 24 * 120)),
        rule('fw_w2', 'inbound', 'tcp', '5432', '203.0.113.0/24', 'db access from demo vnet', iso(nowMs, 60 * 24 * 90)),
        rule('fw_w3', 'outbound', 'udp', '53', '0.0.0.0/0', 'dns (demo)', iso(nowMs, 60 * 24 * 120)),
      ],
      sshKeys: [keyA, keyB],
      rdp: null,
    },
    {
      id: 'srv_api_fra_02',
      name: 'api-fra-02',
      planId: 'scale',
      regionId: 'fra',
      osId: 'debian-12',
      status: 'running',
      ipv4: '203.0.113.12',
      ipv6: '2001:db8:11::12',
      createdMinutesAgo: 60 * 24 * 74,
      rebootedMinutesAgo: 60 * 24 * 21,
      snapshots: [snapshot('snap_a1', 'release-2026.11', 46, iso(nowMs, 60 * 24 * 8))],
      firewall: [
        rule('fw_a1', 'inbound', 'tcp', '443', '0.0.0.0/0', 'https (demo)', iso(nowMs, 60 * 24 * 70)),
        rule('fw_a2', 'inbound', 'tcp', '22', '203.0.113.0/24', 'admin ssh (demo)', iso(nowMs, 60 * 24 * 70)),
      ],
      sshKeys: [keyA],
      rdp: null,
    },
    {
      id: 'srv_db_dxb_01',
      name: 'db-dxb-01',
      planId: 'scale',
      regionId: 'dxb',
      osId: 'rocky-9',
      status: 'running',
      ipv4: '198.51.100.21',
      ipv6: '2001:db8:21::21',
      createdMinutesAgo: 60 * 24 * 210,
      rebootedMinutesAgo: 60 * 24 * 34,
      snapshots: [
        snapshot('snap_d1', 'before-minor-upgrade', 52, iso(nowMs, 60 * 24 * 9)),
        snapshot('snap_d2', 'weekly-2026-11-15', 51, iso(nowMs, 60 * 24 * 8)),
        snapshot('snap_d3', 'monthly-2026-10', 49, iso(nowMs, 60 * 24 * 38)),
      ],
      firewall: [
        rule('fw_d1', 'inbound', 'tcp', '5432', '203.0.113.0/24', 'postgres private (demo)', iso(nowMs, 60 * 24 * 205)),
        rule('fw_d2', 'inbound', 'tcp', '22', '203.0.113.0/24', 'admin ssh (demo)', iso(nowMs, 60 * 24 * 205)),
      ],
      sshKeys: [keyA, keyC],
      rdp: null,
    },
    {
      id: 'srv_stage_ams_01',
      name: 'stage-ams-01',
      planId: 'starter',
      regionId: 'ams',
      osId: 'ubuntu-2404',
      status: 'stopped',
      ipv4: '198.51.100.31',
      ipv6: '2001:db8:31::31',
      createdMinutesAgo: 60 * 24 * 31,
      rebootedMinutesAgo: 60 * 24 * 6,
      snapshots: [snapshot('snap_s1', 'staging-baseline', 22, iso(nowMs, 60 * 24 * 28))],
      firewall: [
        rule('fw_s1', 'inbound', 'tcp', '22,80', '0.0.0.0/0', 'staging access (demo)', iso(nowMs, 60 * 24 * 30)),
      ],
      sshKeys: [keyB],
      rdp: null,
    },
    {
      id: 'srv_win_dxb_01',
      name: 'win-dxb-rdp-01',
      planId: 'rdp',
      regionId: 'dxb',
      osId: 'windows-2022',
      status: 'running',
      ipv4: '203.0.113.41',
      ipv6: '2001:db8:41::41',
      createdMinutesAgo: 60 * 24 * 58,
      rebootedMinutesAgo: 60 * 24 * 2,
      snapshots: [
        snapshot('snap_r1', 'post-app-install', 64, iso(nowMs, 60 * 24 * 4)),
        snapshot('snap_r2', 'weekly-2026-11-17', 61, iso(nowMs, 60 * 24 * 6)),
      ],
      firewall: [
        rule('fw_r1', 'inbound', 'tcp', '3389', '203.0.113.0/24', 'restricted rdp (demo)', iso(nowMs, 60 * 24 * 50)),
        rule('fw_r2', 'inbound', 'tcp', '443', '0.0.0.0/0', 'demo gateway (demo)', iso(nowMs, 60 * 24 * 50)),
      ],
      sshKeys: [],
      rdp: { enabled: true, port: 3389, username: 'ops-admin' },
    },
    {
      id: 'srv_win_ruh_02',
      name: 'win-ruh-rdp-02',
      planId: 'rdp',
      regionId: 'ruh',
      osId: 'windows-2025',
      status: 'stopped',
      ipv4: '203.0.113.42',
      ipv6: '2001:db8:42::42',
      createdMinutesAgo: 60 * 24 * 15,
      rebootedMinutesAgo: 60 * 24 * 9,
      snapshots: [],
      firewall: [
        rule('fw_r3', 'inbound', 'tcp', '3389', '198.51.100.0/24', 'office range (demo)', iso(nowMs, 60 * 24 * 14)),
      ],
      sshKeys: [],
      rdp: { enabled: true, port: 3389, username: 'Administrator' },
    },
    {
      id: 'srv_edge_sin_01',
      name: 'edge-sin-01',
      planId: 'starter',
      regionId: 'sin',
      osId: 'debian-12',
      status: 'rebooting',
      ipv4: '203.0.113.51',
      ipv6: '2001:db8:51::51',
      createdMinutesAgo: 60 * 24 * 9,
      rebootedMinutesAgo: 60 * 24 * 9,
      transientInMinutes: 1,
      snapshots: [],
      firewall: [rule('fw_e1', 'inbound', 'tcp', '80,443', '0.0.0.0/0', 'edge http (demo)', iso(nowMs, 60 * 24 * 9))],
      sshKeys: [keyB],
      rdp: null,
    },
    {
      id: 'srv_build_iad_01',
      name: 'build-iad-01',
      planId: 'business',
      regionId: 'iad',
      osId: 'ubuntu-2404',
      status: 'provisioning',
      ipv4: '203.0.113.61',
      ipv6: '2001:db8:61::61',
      createdMinutesAgo: 4,
      rebootedMinutesAgo: null,
      transientInMinutes: 3,
      snapshots: [],
      firewall: [],
      sshKeys: [keyA],
      rdp: null,
    },
    {
      id: 'srv_mail_fra_03',
      name: 'mail-fra-03',
      planId: 'starter',
      regionId: 'fra',
      osId: 'debian-12',
      status: 'running',
      ipv4: '203.0.113.13',
      ipv6: '2001:db8:11::13',
      createdMinutesAgo: 60 * 24 * 167,
      rebootedMinutesAgo: 60 * 24 * 47,
      snapshots: [snapshot('snap_m1', 'mail-config-backup', 18, iso(nowMs, 60 * 24 * 11))],
      firewall: [
        rule('fw_m1', 'inbound', 'tcp', '25,465,587,993', '0.0.0.0/0', 'mail services (demo)', iso(nowMs, 60 * 24 * 160)),
        rule('fw_m2', 'inbound', 'tcp', '22', '203.0.113.0/24', 'admin ssh (demo)', iso(nowMs, 60 * 24 * 160)),
      ],
      sshKeys: [keyC],
      rdp: null,
    },
    {
      id: 'srv_cache_fra_02',
      name: 'cache-fra-02',
      planId: 'business',
      regionId: 'fra',
      osId: 'ubuntu-2404',
      status: 'running',
      ipv4: '203.0.113.14',
      ipv6: '2001:db8:11::14',
      createdMinutesAgo: 60 * 24 * 93,
      rebootedMinutesAgo: 60 * 24 * 5,
      snapshots: [snapshot('snap_c1', 'redis-baseline', 28, iso(nowMs, 60 * 24 * 20))],
      firewall: [
        rule('fw_c1', 'inbound', 'tcp', '6379', '198.51.100.0/24', 'cache from app subnet (demo)', iso(nowMs, 60 * 24 * 90)),
      ],
      sshKeys: [keyA],
      rdp: null,
    },
    {
      id: 'srv_logs_ams_02',
      name: 'logs-ams-02',
      planId: 'starter',
      regionId: 'ams',
      osId: 'debian-12',
      status: 'running',
      ipv4: '198.51.100.32',
      ipv6: '2001:db8:32::32',
      createdMinutesAgo: 60 * 24 * 61,
      rebootedMinutesAgo: 60 * 24 * 18,
      snapshots: [],
      firewall: [rule('fw_l1', 'inbound', 'tcp', '22', '203.0.113.0/24', 'admin ssh (demo)', iso(nowMs, 60 * 24 * 60))],
      sshKeys: [keyB],
      rdp: null,
    },
    {
      id: 'srv_crm_dxb_02',
      name: 'crm-dxb-02',
      planId: 'business',
      regionId: 'dxb',
      osId: 'rocky-9',
      status: 'running',
      ipv4: '198.51.100.22',
      ipv6: '2001:db8:22::22',
      createdMinutesAgo: 60 * 24 * 122,
      rebootedMinutesAgo: 60 * 24 * 11,
      snapshots: [snapshot('snap_c2', 'crm-weekly', 36, iso(nowMs, 60 * 24 * 7))],
      firewall: [rule('fw_c2', 'inbound', 'tcp', '443', '0.0.0.0/0', 'https (demo)', iso(nowMs, 60 * 24 * 120))],
      sshKeys: [keyA, keyC],
      rdp: null,
    },
    {
      id: 'srv_backup_ruh_01',
      name: 'backup-ruh-01',
      planId: 'starter',
      regionId: 'ruh',
      osId: 'ubuntu-2404',
      status: 'stopped',
      ipv4: '203.0.113.71',
      ipv6: '2001:db8:71::71',
      createdMinutesAgo: 60 * 24 * 46,
      rebootedMinutesAgo: 60 * 24 * 12,
      snapshots: [snapshot('snap_b1', 'offsite-seed', 19, iso(nowMs, 60 * 24 * 30))],
      firewall: [],
      sshKeys: [keyA],
      rdp: null,
    },
    {
      id: 'srv_video_iad_02',
      name: 'video-iad-02',
      planId: 'scale',
      regionId: 'iad',
      osId: 'ubuntu-2404',
      status: 'running',
      ipv4: '203.0.113.62',
      ipv6: '2001:db8:62::62',
      createdMinutesAgo: 60 * 24 * 32,
      rebootedMinutesAgo: 60 * 24 * 3,
      snapshots: [snapshot('snap_v1', 'encoder-v2', 62, iso(nowMs, 60 * 24 * 6))],
      firewall: [rule('fw_v1', 'inbound', 'tcp', '1935,443', '0.0.0.0/0', 'stream ingest (demo)', iso(nowMs, 60 * 24 * 30))],
      sshKeys: [keyC],
      rdp: null,
    },
    {
      id: 'srv_shop_sin_02',
      name: 'shop-sin-02',
      planId: 'business',
      regionId: 'sin',
      osId: 'debian-12',
      status: 'running',
      ipv4: '203.0.113.52',
      ipv6: '2001:db8:52::52',
      createdMinutesAgo: 60 * 24 * 76,
      rebootedMinutesAgo: 60 * 24 * 9,
      snapshots: [],
      firewall: [rule('fw_s2', 'inbound', 'tcp', '80,443', '0.0.0.0/0', 'storefront (demo)', iso(nowMs, 60 * 24 * 75))],
      sshKeys: [keyB],
      rdp: null,
    },
    {
      id: 'srv_erp_fra_04',
      name: 'erp-fra-04',
      planId: 'scale',
      regionId: 'fra',
      osId: 'rocky-9',
      status: 'running',
      ipv4: '203.0.113.15',
      ipv6: '2001:db8:11::15',
      createdMinutesAgo: 60 * 24 * 204,
      rebootedMinutesAgo: 60 * 24 * 27,
      snapshots: [snapshot('snap_e1', 'erp-monthly', 58, iso(nowMs, 60 * 24 * 14))],
      firewall: [
        rule('fw_e2', 'inbound', 'tcp', '443', '203.0.113.0/24', 'office erp (demo)', iso(nowMs, 60 * 24 * 200)),
        rule('fw_e3', 'inbound', 'tcp', '22', '203.0.113.0/24', 'admin ssh (demo)', iso(nowMs, 60 * 24 * 200)),
      ],
      sshKeys: [keyA],
      rdp: null,
    },
    {
      id: 'srv_dev_dxb_03',
      name: 'dev-dxb-03',
      planId: 'rdp',
      regionId: 'dxb',
      osId: 'windows-2025',
      status: 'running',
      ipv4: '203.0.113.43',
      ipv6: '2001:db8:43::43',
      createdMinutesAgo: 60 * 24 * 21,
      rebootedMinutesAgo: 60 * 24 * 4,
      snapshots: [snapshot('snap_dv1', 'dev-tools', 24, iso(nowMs, 60 * 24 * 10))],
      firewall: [rule('fw_d3', 'inbound', 'tcp', '3389', '203.0.113.0/24', 'restricted rdp (demo)', iso(nowMs, 60 * 24 * 20))],
      sshKeys: [],
      rdp: { enabled: true, port: 3389, username: 'dev-admin' },
    },
  ];

  const servers: Server[] = seeds.map((seed) => {
    const plan = getPlan(seed.planId);
    const os = getOs(seed.osId);
    return {
      id: seed.id,
      name: seed.name,
      hostname: seed.name,
      planId: seed.planId,
      regionId: seed.regionId,
      osId: seed.osId,
      status: seed.status,
      ipv4: seed.ipv4,
      ipv6: seed.ipv6,
      cpuCores: plan.vcpu,
      ramGb: plan.ramGb,
      diskGb: plan.diskGb,
      bandwidthTb: plan.bandwidthTb,
      createdAt: iso(nowMs, seed.createdMinutesAgo),
      rebootedAt: seed.rebootedMinutesAgo === null ? null : iso(nowMs, seed.rebootedMinutesAgo),
      transientUntil:
        seed.transientInMinutes === undefined ? null : inMinutes(nowMs, seed.transientInMinutes),
      snapshots: seed.snapshots,
      firewall: seed.firewall,
      sshKeys: seed.sshKeys,
      rdp: seed.rdp ?? (os.rdp ? { enabled: true, port: 3389, username: 'Administrator' } : null),
    };
  });

  const activity: ActivityEntry[] = [
    {
      id: 'act_01',
      at: iso(nowMs, 4),
      serverId: 'srv_web_fra_01',
      serverName: 'web-fra-01',
      action: { type: 'power', action: 'reboot' },
    },
    {
      id: 'act_02',
      at: iso(nowMs, 31),
      serverId: 'srv_db_dxb_01',
      serverName: 'db-dxb-01',
      action: { type: 'snapshot.create', label: 'before-minor-upgrade' },
    },
    {
      id: 'act_03',
      at: iso(nowMs, 93),
      serverId: 'srv_stage_ams_01',
      serverName: 'stage-ams-01',
      action: { type: 'power', action: 'stop' },
    },
    {
      id: 'act_04',
      at: iso(nowMs, 60 * 5),
      serverId: 'srv_win_dxb_01',
      serverName: 'win-dxb-rdp-01',
      action: { type: 'firewall.add', ports: '3389' },
    },
    {
      id: 'act_05',
      at: iso(nowMs, 60 * 9),
      serverId: 'srv_mail_fra_03',
      serverName: 'mail-fra-03',
      action: { type: 'ssh.add', keyName: 'ops-yubikey' },
    },
    {
      id: 'act_06',
      at: iso(nowMs, 60 * 26),
      serverId: 'srv_build_iad_01',
      serverName: 'build-iad-01',
      action: { type: 'server.create' },
    },
    {
      id: 'act_07',
      at: iso(nowMs, 60 * 50),
      action: { type: 'billing.plan', planId: 'business' },
    },
    {
      id: 'act_08',
      at: iso(nowMs, 60 * 24 * 3),
      action: { type: 'auth.login' },
    },
    {
      id: 'act_09',
      at: iso(nowMs, 60 * 24 * 3 + 120),
      serverId: 'srv_cache_fra_02',
      serverName: 'cache-fra-02',
      action: { type: 'snapshot.create', label: 'redis-baseline' },
    },
    {
      id: 'act_10',
      at: iso(nowMs, 60 * 24 * 4),
      serverId: 'srv_crm_dxb_02',
      serverName: 'crm-dxb-02',
      action: { type: 'firewall.add', ports: '443' },
    },
    {
      id: 'act_11',
      at: iso(nowMs, 60 * 24 * 6),
      serverId: 'srv_logs_ams_02',
      serverName: 'logs-ams-02',
      action: { type: 'power', action: 'reboot' },
    },
    {
      id: 'act_12',
      at: iso(nowMs, 60 * 24 * 9),
      serverId: 'srv_video_iad_02',
      serverName: 'video-iad-02',
      action: { type: 'ssh.add', keyName: 'ops-yubikey' },
    },
    {
      id: 'act_13',
      at: iso(nowMs, 60 * 24 * 14),
      serverId: 'srv_shop_sin_02',
      serverName: 'shop-sin-02',
      action: { type: 'power', action: 'start' },
    },
    {
      id: 'act_14',
      at: iso(nowMs, 60 * 24 * 24),
      action: { type: 'billing.plan', planId: 'business' },
    },
    {
      id: 'act_15',
      at: iso(nowMs, 60 * 24 * 33),
      serverId: 'srv_erp_fra_04',
      serverName: 'erp-fra-04',
      action: { type: 'snapshot.create', label: 'erp-monthly' },
    },
  ];

  const alerts: Alert[] = [
    {
      id: 'alert_01',
      code: 'high_cpu',
      severity: 'warning',
      serverId: 'srv_web_fra_01',
      at: iso(nowMs, 8),
      read: false,
    },
    {
      id: 'alert_02',
      code: 'backup_done',
      severity: 'info',
      serverId: 'srv_db_dxb_01',
      at: iso(nowMs, 34),
      read: false,
    },
    {
      id: 'alert_03',
      code: 'invoice_due',
      severity: 'warning',
      at: iso(nowMs, 60 * 3),
      read: false,
    },
    {
      id: 'alert_04',
      code: 'rdp_blocked',
      severity: 'critical',
      serverId: 'srv_win_dxb_01',
      at: iso(nowMs, 60 * 7),
      read: false,
    },
    {
      id: 'alert_05',
      code: 'snapshot_cleanup',
      severity: 'info',
      serverId: 'srv_mail_fra_03',
      at: iso(nowMs, 60 * 22),
      read: true,
    },
    {
      id: 'alert_06',
      code: 'high_cpu',
      severity: 'warning',
      serverId: 'srv_logs_ams_02',
      at: iso(nowMs, 60 * 13),
      read: false,
    },
    {
      id: 'alert_07',
      code: 'backup_done',
      severity: 'info',
      serverId: 'srv_cache_fra_02',
      at: iso(nowMs, 60 * 26),
      read: false,
    },
    {
      id: 'alert_08',
      code: 'rdp_blocked',
      severity: 'warning',
      serverId: 'srv_dev_dxb_03',
      at: iso(nowMs, 60 * 31),
      read: true,
    },
  ];

  const invoices: Invoice[] = [
    {
      id: 'inv_011',
      number: 'INV-2026-011',
      issuedAt: iso(nowMs, 60 * 24 * 22),
      amountUsd: 24,
      status: 'pending',
      planId: 'business',
    },
    {
      id: 'inv_010',
      number: 'INV-2026-010',
      issuedAt: iso(nowMs, 60 * 24 * 53),
      amountUsd: 24,
      status: 'paid',
      planId: 'business',
    },
    {
      id: 'inv_009',
      number: 'INV-2026-009',
      issuedAt: iso(nowMs, 60 * 24 * 83),
      amountUsd: 48,
      status: 'paid',
      planId: 'scale',
    },
    {
      id: 'inv_008',
      number: 'INV-2026-008',
      issuedAt: iso(nowMs, 60 * 24 * 114),
      amountUsd: 24,
      status: 'paid',
      planId: 'business',
    },
    {
      id: 'inv_007',
      number: 'INV-2026-007',
      issuedAt: iso(nowMs, 60 * 24 * 144),
      amountUsd: 24,
      status: 'overdue',
      planId: 'business',
    },
    {
      id: 'inv_006',
      number: 'INV-2026-006',
      issuedAt: iso(nowMs, 60 * 24 * 175),
      amountUsd: 12,
      status: 'paid',
      planId: 'starter',
    },
    {
      id: 'inv_005',
      number: 'INV-2026-005',
      issuedAt: iso(nowMs, 60 * 24 * 205),
      amountUsd: 24,
      status: 'paid',
      planId: 'business',
    },
    {
      id: 'inv_004',
      number: 'INV-2026-004',
      issuedAt: iso(nowMs, 60 * 24 * 236),
      amountUsd: 24,
      status: 'paid',
      planId: 'business',
    },
    {
      id: 'inv_003',
      number: 'INV-2026-003',
      issuedAt: iso(nowMs, 60 * 24 * 266),
      amountUsd: 12,
      status: 'paid',
      planId: 'starter',
    },
    {
      id: 'inv_002',
      number: 'INV-2026-002',
      issuedAt: iso(nowMs, 60 * 24 * 297),
      amountUsd: 12,
      status: 'paid',
      planId: 'starter',
    },
    {
      id: 'inv_001',
      number: 'INV-2026-001',
      issuedAt: iso(nowMs, 60 * 24 * 327),
      amountUsd: 24,
      status: 'paid',
      planId: 'business',
    },
    {
      id: 'inv_2025_012',
      number: 'INV-2025-012',
      issuedAt: iso(nowMs, 60 * 24 * 358),
      amountUsd: 12,
      status: 'paid',
      planId: 'starter',
    },
  ];

  return {
    version: STATE_VERSION,
    servers,
    activity,
    alerts,
    invoices,
    planId: 'business',
    sample: 0,
    settings: {
      lang: 'ar',
      theme: 'dark',
      profile: {
        name: 'Omar El-Sayed',
        email: 'ops@nilegrid.example',
        company: 'NileGrid Digital — demo tenant',
      },
      notifications: {
        email: true,
        maintenance: true,
        security: true,
        product: false,
      },
    },
    session: null,
    demoResetAt: new Date(nowMs).toISOString(),
    demoEpoch: 'seed',
  };
}

/** All SSH keys reachable from the demo fleet, deduplicated by id. */
export function collectSshKeys(servers: readonly Server[]): SshKey[] {
  const map = new Map<string, SshKey>();
  for (const server of servers) {
    for (const key of server.sshKeys) {
      if (!map.has(key.id)) map.set(key.id, key);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { t, tm } from '../i18n';
import type { ActivityEntry, Alert, AppState, OsId, PlanId, RegionId } from '../lib/types';
import { getPlan } from '../data/catalog';
import { formatMoney } from '../lib/format';
import type { IconName } from './icons';

const OS_LABEL_KEYS: Record<OsId, string> = {
  'ubuntu-2404': 'images.ubuntu',
  'debian-12': 'images.debian',
  'rocky-9': 'images.rocky',
  'windows-2022': 'images.windows2022',
  'windows-2025': 'images.windows2025',
};

export function planName(id: PlanId): string {
  return tm(`plans.${id}`);
}

export function planDescription(id: PlanId): string {
  return tm(`plans.${id}Text`);
}

export function regionName(id: RegionId): string {
  return tm(`regions.${id}`);
}

export function regionZone(id: RegionId): string {
  const zones: Record<RegionId, string> = {
    fra: 'regions.zoneEu',
    dxb: 'regions.zoneMe',
    ruh: 'regions.zoneMe',
    ams: 'regions.zoneEu',
    iad: 'regions.zoneUs',
    sin: 'regions.zoneApac',
  };
  return tm(zones[id]);
}

export function osName(id: OsId): string {
  return tm(OS_LABEL_KEYS[id]);
}

export function osFamily(id: OsId): string {
  return tm(id.startsWith('windows') ? 'images.windows' : 'images.linux');
}

export function planPriceLabel(id: PlanId): string {
  const plan = getPlan(id);
  return `${formatMoney(plan.priceUsd, 'en')}${t('common.perMonth')}`;
}

export function serverName(servers: readonly { id: string; name: string }[], id: string | undefined): string {
  if (!id) return '—';
  const found = servers.find((server) => server.id === id);
  return found ? found.name : '—';
}

export function alertContent(alert: Alert, state: Readonly<AppState>): { title: string; text: string; href: string } {
  const name = serverName(state.servers, alert.serverId);
  const pending = state.invoices.find((invoice) => invoice.status === 'pending' || invoice.status === 'overdue');
  const params: Record<string, string> = { name, number: pending?.number ?? 'INV-DEMO' };

  let href = '/dashboard';
  if (alert.serverId) href = `/servers/${alert.serverId}?tab=overview`;
  else if (alert.code === 'invoice_due') href = '/billing';

  switch (alert.code) {
    case 'high_cpu':
      return { title: t('alerts.high_cpu.title', params), text: t('alerts.high_cpu.text'), href };
    case 'backup_done':
      return { title: t('alerts.backup_done.title'), text: t('alerts.backup_done.text', params), href };
    case 'invoice_due':
      return { title: t('alerts.invoice_due.title'), text: t('alerts.invoice_due.text', params), href };
    case 'rdp_blocked':
      return { title: t('alerts.rdp_blocked.title'), text: t('alerts.rdp_blocked.text'), href };
    case 'snapshot_cleanup':
      return { title: t('alerts.snapshot_cleanup.title', params), text: t('alerts.snapshot_cleanup.text', params), href };
  }
}

export function severityLabel(severity: Alert['severity']): string {
  return t(`alerts.severity.${severity}`);
}

export function activityText(entry: ActivityEntry): string {
  const name = entry.serverName ?? '—';
  const action = entry.action;
  switch (action.type) {
    case 'power':
      if (action.action === 'start') return t('activity.powerStart', { name });
      if (action.action === 'stop') return t('activity.powerStop', { name });
      return t('activity.powerReboot', { name });
    case 'server.create':
      return t('activity.create', { name });
    case 'snapshot.create':
      return t('activity.snapshotCreate', { label: action.label, name });
    case 'snapshot.delete':
      return t('activity.snapshotDelete', { name });
    case 'firewall.add':
      return t('activity.firewallAdd', { ports: action.ports, name });
    case 'firewall.delete':
      return t('activity.firewallDelete', { name });
    case 'ssh.add':
      return t('activity.sshAdd', { key: action.keyName, name });
    case 'ssh.delete':
      return t('activity.sshDelete', { name });
    case 'billing.plan':
      return t('activity.planChange', { plan: planName(action.planId) });
    case 'auth.login':
      return t('activity.login');
    case 'auth.guest':
      return t('activity.guest');
    case 'settings.update':
      return t('activity.settingsUpdate');
  }
}

const ACTIVITY_ICONS: Record<ActivityEntry['action']['type'], IconName> = {
  power: 'zap',
  'server.create': 'plus',
  'snapshot.create': 'camera',
  'snapshot.delete': 'trash',
  'firewall.add': 'shield',
  'firewall.delete': 'trash',
  'ssh.add': 'key',
  'ssh.delete': 'trash',
  'billing.plan': 'creditCard',
  'auth.login': 'user',
  'auth.guest': 'user',
  'settings.update': 'settings',
};

export function activityIcon(entry: ActivityEntry): IconName {
  return ACTIVITY_ICONS[entry.action.type];
}

export function alertIcon(code: Alert['code']): IconName {
  switch (code) {
    case 'high_cpu':
      return 'activity';
    case 'backup_done':
      return 'camera';
    case 'invoice_due':
      return 'creditCard';
    case 'rdp_blocked':
      return 'shield';
    case 'snapshot_cleanup':
      return 'camera';
  }
}

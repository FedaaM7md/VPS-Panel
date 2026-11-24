/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { t, tm } from '../i18n';
import { getStore } from '../state/store';
import { getCsrfToken } from '../lib/csrf';
import { getPlan } from '../data/catalog';
import type { FirewallDirection, FirewallProtocol, Server } from '../lib/types';
import { average, formatDate, formatDateTime, formatMoney, formatNumber, formatPercent, formatStorage, formatUptime } from '../lib/format';
import { computeServerMetrics } from '../lib/simulator';
import { currentSample, onClock } from '../lib/clock';
import { isPowerAllowed, simulatedUptimeMinutes } from '../lib/power';
import { validateSnapshotLabel } from '../lib/validation';
import { validateFirewallDraft, MAX_NOTE_LENGTH } from '../lib/firewall';
import { parseSshPublicKey, validateKeyName, validateSshPublicKey } from '../lib/validation';
import { h, replaceChildren, copyText } from '../ui/dom';
import { icon } from '../ui/icons';
import { areaChart, gauge } from '../ui/charts';
import { emptyState, infoItem, notice, sectionCard } from '../ui/components';
import { demoBadge, rdpBadge, simulatedBadge, statusBadge } from '../ui/badges';
import { osName, planName, regionName } from '../ui/labels';
import { openDialog } from '../ui/dialog';
import { toast } from '../ui/toast';
import type { PageContext, PageInstance } from './types';

type TabId = 'overview' | 'monitoring' | 'snapshots' | 'firewall' | 'access' | 'rdp' | 'console';

const TABS: TabId[] = ['overview', 'monitoring', 'snapshots', 'firewall', 'access', 'rdp', 'console'];
const TAB_LABEL_KEYS: Record<TabId, string> = {
  overview: 'server.tabs.overview',
  monitoring: 'server.tabs.monitoring',
  snapshots: 'server.tabs.snapshots',
  firewall: 'server.tabs.firewall',
  access: 'server.tabs.access',
  rdp: 'server.tabs.rdp',
  console: 'server.tabs.console',
};

function isTab(value: string | null): value is TabId {
  return value !== null && (TABS as readonly string[]).includes(value);
}

function labeledField(label: string, control: HTMLElement, hint?: string, error?: HTMLElement, id?: string): HTMLElement {
  return h(
    'div',
    null,
    h('label', { class: 'label', for: id }, label),
    control,
    hint ? h('p', { class: 'hint' }, hint) : null,
    error ?? null,
  );
}

function makeError(id: string): HTMLParagraphElement {
  return h('p', { id, class: 'error-text', hidden: true });
}

function showError(node: HTMLElement, message: string | null): void {
  if (message) {
    node.textContent = message;
    node.hidden = false;
  } else {
    node.textContent = '';
    node.hidden = true;
  }
}

export function renderServerDetail(ctx: PageContext): PageInstance {
  const store = getStore();
  const serverId = ctx.params.id ?? '';
  const state = store.getState();
  const lang = state.settings.lang;
  let activeTab: TabId = isTab(ctx.query.get('tab')) ? (ctx.query.get('tab') as TabId) : 'overview';
  let consoleCleanup: (() => void) | null = null;

  const initial = store.getState().servers.find((server) => server.id === serverId);
  if (!initial) {
    const root = h(
      'div',
      null,
      h(
        'a',
        { href: '#/servers', class: 'muted mb-4 inline-flex items-center gap-1.5 text-xs font-semibold hover:text-brand-600' },
        icon('arrowStart', 'size-3.5 flip-rtl'),
        t('server.back'),
      ),
      h('div', { class: 'card' }, emptyState({ icon: 'serverOff', title: t('server.notFound'), text: t('server.notFoundText'), action: h('a', { href: '#/servers', class: 'btn btn-primary' }, t('server.back')) })),
    );
    return { el: root, titleKey: 'server.notFound' };
  }

  const headerHost = h('div', { class: 'mb-5' });
  const fallbackServer: Server = initial;
  const tabNav = h('div', { class: 'tabs mb-4', role: 'tablist', 'aria-label': t('server.tabs.overview') });
  const tabHost = h('div', { class: 'animate-fade', role: 'tabpanel', id: 'server-tabpanel', 'aria-labelledby': 'tab-overview', tabindex: '0' });

  function server(): Server {
    return store.getState().servers.find((item) => item.id === serverId) ?? fallbackServer;
  }

  async function handlePower(action: 'start' | 'stop' | 'reboot'): Promise<void> {
    const current = server();
    const actionLabel = t(action === 'start' ? 'server.actionStart' : action === 'stop' ? 'server.actionStop' : 'server.actionReboot');
    const confirmed = await openDialog({
      title: t('server.powerConfirmTitle', { action: actionLabel }),
      description: t('server.powerConfirmText', { action: actionLabel, name: current.name }),
      confirmLabel: t('server.powerConfirm'),
      cancelLabel: t('common.cancel'),
      danger: action === 'stop',
    });
    if (!confirmed) return;

    const result = store.power(serverId, action, getCsrfToken());
    if (!result.ok) {
      if (result.code === 'invalid_transition' || result.code === 'already_in_state') {
        toast('error', t('server.powerDenied', { status: t(`status.${server().status}`), action: actionLabel }));
      } else if (result.code === 'csrf' || result.code === 'unauthorized') {
        toast('error', t('errors.sessionExpired'));
      } else {
        toast('error', t('errors.notFound'));
      }
      return;
    }
    toast('success', t('server.powerDone', { action: actionLabel, name: current.name }));
    renderHeader();
    if (activeTab === 'overview' || activeTab === 'monitoring') renderTab();
  }

  function powerButton(label: string, action: 'start' | 'stop' | 'reboot', iconName: 'play' | 'stop' | 'restart', className: string): HTMLButtonElement {
    const current = server();
    const allowed = isPowerAllowed(current, action);
    return h(
      'button',
      {
        type: 'button',
        class: `btn btn-sm ${className}`,
        disabled: !allowed,
        title: allowed ? t('server.powerText') : t('server.statusHint'),
        onClick: () => {
          void handlePower(action);
        },
      },
      icon(iconName, 'size-3.5'),
      label,
    );
  }

  function renderHeader(): void {
    const current = server();
    const plan = getPlan(current.planId);
    replaceChildren(
      headerHost,
      h(
        'a',
        { href: '#/servers', class: 'muted mb-3 inline-flex items-center gap-1.5 text-xs font-semibold hover:text-brand-600' },
        icon('arrowStart', 'size-3.5 flip-rtl'),
        t('server.back'),
      ),
      h(
        'div',
        { class: 'flex flex-wrap items-start justify-between gap-4' },
        h(
          'div',
          { class: 'min-w-0' },
          h(
            'div',
            { class: 'flex flex-wrap items-center gap-2' },
            h('h1', { class: 'text-2xl font-extrabold tracking-tight sm:text-3xl' }, current.name),
            statusBadge(current.status),
            current.rdp ? rdpBadge() : null,
            demoBadge(),
          ),
          h(
            'p',
            { class: 'muted mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px]' },
            h('span', null, current.hostname),
            h('span', { class: 'opacity-40' }, '·'),
            h('span', null, current.ipv4),
            h('span', { class: 'opacity-40' }, '·'),
            h('span', { class: 'font-sans' }, `${regionName(current.regionId)} · ${osName(current.osId)}`),
          ),
        ),
        h(
          'div',
          { class: 'flex flex-wrap items-center gap-2' },
          powerButton(t('server.powerStart'), 'start', 'play', 'btn-accent'),
          powerButton(t('server.powerStop'), 'stop', 'stop', 'btn-secondary'),
          powerButton(t('server.powerReboot'), 'reboot', 'restart', 'btn-secondary'),
        ),
      ),
      h(
        'div',
        { class: 'mt-3 flex flex-wrap items-center gap-3 text-[10px]' },
        h('span', { class: 'soft' }, t('server.statusHint')),
        h('span', { class: 'soft inline-flex items-center gap-1' }, icon('creditCard', 'size-3'), `${formatMoney(plan.priceUsd, lang)}${t('common.perMonth')}`),
        current.status === 'rebooting' || current.status === 'provisioning'
          ? h('span', { class: 'inline-flex items-center gap-1 text-amber-700 dark:text-amber-300' }, icon('clock', 'size-3'), t('server.settling'))
          : null,
      ),
    );
  }

  function renderTabNav(): void {
    replaceChildren(
      tabNav,
      ...TABS.map((tab) =>
        h(
          'button',
          {
            type: 'button',
            class: 'tab',
            role: 'tab',
            id: `tab-${tab}`,
            'aria-selected': String(activeTab === tab),
            'aria-controls': 'server-tabpanel',
            tabindex: activeTab === tab ? '0' : '-1',
            onClick: () => {
              if (activeTab === tab) return;
              activeTab = tab;
              const url = `#/servers/${serverId}?tab=${tab}`;
              window.history.replaceState(null, '', url);
              renderTabNav();
              renderTab();
              tabHost.setAttribute('aria-labelledby', `tab-${tab}`);
            },
          },
          tabLabel(tab),
        ),
      ),
    );
  }

  function tabLabel(tab: TabId): string {
    return tm(TAB_LABEL_KEYS[tab]);
  }

  function buildOverview(current: Server): HTMLElement {
    const plan = getPlan(current.planId);
    const metrics = computeServerMetrics(current, currentSample());
    const uptime = formatUptime(simulatedUptimeMinutes(current, Date.now()), lang);

    return h(
      'div',
      { class: 'grid gap-5 xl:grid-cols-3' },
      h(
        'div',
        { class: 'space-y-5 xl:col-span-2' },
        sectionCard({
          title: t('server.specs'),
          subtitle: `${planName(current.planId)} · ${formatMoney(plan.priceUsd, lang)}${t('common.perMonth')}`,
          body: [
            h(
              'div',
              { class: 'grid grid-cols-2 gap-3 sm:grid-cols-4' },
              ...[
                { label: t('server.cpuCores'), value: formatNumber(current.cpuCores, lang), iconName: 'cpu' as const },
                { label: t('server.ram'), value: formatStorage(current.ramGb, lang), iconName: 'memory' as const },
                { label: t('server.disk'), value: formatStorage(current.diskGb, lang), iconName: 'disk' as const },
                { label: t('server.bandwidth'), value: `${formatNumber(current.bandwidthTb, lang)} TB`, iconName: 'network' as const },
              ].map((spec) =>
                h(
                  'div',
                  { class: 'rounded-xl border p-3', style: 'border-color: var(--line); background-color: var(--surface-2);' },
                  h('span', { class: 'text-brand-600' }, icon(spec.iconName, 'size-4')),
                  h('p', { class: 'soft mt-2 text-[10px] font-semibold uppercase' }, spec.label),
                  h('p', { class: 'mt-0.5 text-sm font-bold' }, spec.value),
                ),
              ),
            ),
            h(
              'dl',
              { class: 'mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3' },
              infoItem(t('server.hostname'), current.hostname, true),
              infoItem(t('server.ipv4'), current.ipv4, true),
              infoItem(t('server.ipv6'), current.ipv6, true),
              infoItem(t('server.region'), regionName(current.regionId)),
              infoItem(t('server.image'), osName(current.osId)),
              infoItem(t('server.plan'), planName(current.planId)),
              infoItem(t('server.created'), formatDateTime(current.createdAt, lang)),
              infoItem(t('server.rebooted'), current.rebootedAt ? formatDateTime(current.rebootedAt, lang) : t('common.notAvailable')),
              infoItem(t('server.uptime'), uptime),
            ),
          ],
        }),
        sectionCard({
          title: t('server.metricsTitle'),
          subtitle: t('server.metricsText'),
          action: simulatedBadge(),
          body: [
            h(
              'div',
              { class: 'grid grid-cols-1 gap-4 sm:grid-cols-3' },
              gauge(metrics.cpu, { label: t('server.metricsCpu'), lang, detail: `${formatNumber(current.cpuCores, lang)} vCPU` }),
              gauge(metrics.memory, { label: t('server.metricsMemory'), lang, detail: formatStorage(current.ramGb, lang) }),
              gauge(metrics.disk, { label: t('server.metricsDisk'), lang, detail: formatStorage(current.diskGb, lang) }),
            ),
          ],
        }),
      ),
      h(
        'div',
        { class: 'space-y-5' },
        sectionCard({
          title: t('server.powerTitle'),
          subtitle: t('server.powerText'),
          body: [
            h(
              'div',
              { class: 'flex flex-wrap gap-2' },
              powerButton(t('server.powerStart'), 'start', 'play', 'btn-accent'),
              powerButton(t('server.powerStop'), 'stop', 'stop', 'btn-secondary'),
              powerButton(t('server.powerReboot'), 'reboot', 'restart', 'btn-secondary'),
            ),
            h('div', { class: 'mt-3' }, statusBadge(current.status)),
          ],
        }),
        current.rdp
          ? sectionCard({
              title: t('server.rdpTitle'),
              action: demoBadge(t('server.rdpEndpointDemo')),
              body: [
                h('p', { class: 'muted text-xs leading-6' }, t('server.rdpNotice')),
                h(
                  'dl',
                  { class: 'mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs' },
                  h('dt', { class: 'soft' }, t('server.rdpHost')),
                  h('dd', { class: 'font-mono font-semibold' }, current.ipv4),
                  h('dt', { class: 'soft' }, t('server.rdpPort')),
                  h('dd', { class: 'font-mono font-semibold' }, String(current.rdp.port)),
                  h('dt', { class: 'soft' }, t('server.rdpUser')),
                  h('dd', { class: 'font-mono font-semibold' }, current.rdp.username),
                ),
                h('button', { type: 'button', class: 'btn btn-secondary btn-sm mt-3 w-full', onClick: () => tabTo('rdp') }, icon('monitor', 'size-3.5'), t('server.rdpTitle')),
              ],
            })
          : sectionCard({
              title: t('server.consoleTitle'),
              subtitle: t('server.consoleText'),
              body: [h('button', { type: 'button', class: 'btn btn-secondary btn-sm', onClick: () => tabTo('console') }, icon('terminal', 'size-3.5'), t('server.consoleTitle'))],
            }),
        sectionCard({
          title: t('server.snapshotTitle'),
          subtitle: t('server.snapshotCount', { count: formatNumber(current.snapshots.length, lang) }),
          body: [
            current.snapshots.length === 0
              ? h('p', { class: 'muted text-xs leading-6' }, t('server.snapshotEmpty'))
              : h(
                  'ul',
                  { class: 'space-y-2' },
                  ...current.snapshots.slice(0, 3).map((snapshot) =>
                    h(
                      'li',
                      { class: 'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs', style: 'border-color: var(--line);' },
                      h('span', { class: 'truncate font-semibold' }, snapshot.label),
                      h('span', { class: 'soft shrink-0 text-[10px]' }, `${formatNumber(snapshot.sizeGb, lang)} GB`),
                    ),
                  ),
                ),
            h('button', { type: 'button', class: 'btn btn-secondary btn-sm mt-3', onClick: () => tabTo('snapshots') }, icon('camera', 'size-3.5'), t('server.snapshotTitle')),
          ],
        }),
      ),
    );
  }

  function tabTo(tab: TabId): void {
    activeTab = tab;
    window.history.replaceState(null, '', `#/servers/${serverId}?tab=${tab}`);
    renderTabNav();
    renderTab();
    tabHost.setAttribute('aria-labelledby', `tab-${tab}`);
    tabHost.focus();
  }

  function buildMonitoring(current: Server): HTMLElement {
    const metrics = computeServerMetrics(current, currentSample(), 40);
    const cpuAvg = average(metrics.series.cpu);
    const memAvg = average(metrics.series.memory);
    const netAvg = average(metrics.series.network);

    const chartCard = (title: string, value: string, series: readonly number[], color: string, avgLabel: string): HTMLElement =>
      sectionCard({
        title,
        action: simulatedBadge(),
        body: [
          h(
            'div',
            { class: 'flex items-end justify-between gap-3' },
            h('p', { class: 'text-2xl font-extrabold tabular-nums' }, value),
            h(
              'div',
              { class: 'text-end text-[10px]' },
              h('p', { class: 'soft' }, `${t('server.avgLabel')}: ${avgLabel}`),
              h('p', { class: 'soft' }, `${t('server.peakLabel')}: ${formatPercent(Math.max(...series), lang, 1)}`),
            ),
          ),
          h('div', { class: 'mt-2' }, areaChart(series, { label: `${title} (${t('demo.simulated')})`, color, height: 150 })),
          h('div', { class: 'mt-1 flex items-center justify-between text-[10px] soft' }, h('span', null, t('time.sample', { count: '1' })), h('span', null, t('time.sample', { count: '40' }))),
        ],
      });

    return h(
      'div',
      { class: 'space-y-4' },
      h(
        'div',
        { class: 'flex flex-wrap items-center justify-between gap-2' },
        h('div', null, h('h2', { class: 'text-lg font-bold' }, t('server.metricsTitle')), h('p', { class: 'muted mt-1 text-sm' }, t('server.metricsText'))),
        h('div', { class: 'flex items-center gap-2' }, simulatedBadge(), h('span', { class: 'soft text-[10px]' }, t('server.lastSamples'))),
      ),
      h(
        'div',
        { class: 'grid gap-4 md:grid-cols-2' },
        chartCard(t('server.metricsCpu'), formatPercent(metrics.cpu, lang, 1), metrics.series.cpu, 'var(--color-accent-500)', formatPercent(cpuAvg, lang, 1)),
        chartCard(t('server.metricsMemory'), formatPercent(metrics.memory, lang, 1), metrics.series.memory, 'var(--color-brand-500)', formatPercent(memAvg, lang, 1)),
        chartCard(t('server.metricsDisk'), formatPercent(metrics.disk, lang, 1), metrics.series.disk, 'var(--color-amber-500)', formatPercent(average(metrics.series.disk), lang, 1)),
        sectionCard({
          title: t('server.metricsNetwork'),
          action: simulatedBadge(),
          body: [
            h(
              'div',
              { class: 'flex items-end justify-between gap-3' },
              h('p', { class: 'text-2xl font-extrabold tabular-nums' }, `${formatNumber(metrics.netIn, lang)} Mbps`),
              h('p', { class: 'soft text-[10px]' }, `${t('server.avgLabel')}: ${formatNumber(netAvg, lang, { maximumFractionDigits: 1 })} Mbps`),
            ),
            h('div', { class: 'mt-2' }, areaChart(metrics.series.network, { label: `${t('server.metricsNetwork')} (${t('demo.simulated')})`, color: 'var(--color-accent-500)', height: 150 })),
            h(
              'div',
              { class: 'mt-2 flex flex-wrap items-center gap-4 text-[10px]' },
              h('span', { class: 'inline-flex items-center gap-1.5' }, h('span', { class: 'size-2 rounded-full bg-accent-500' }), t('dashboard.inbound'), h('span', { class: 'font-bold' }, `${formatNumber(metrics.netIn, lang)} Mbps`)),
              h('span', { class: 'inline-flex items-center gap-1.5' }, h('span', { class: 'size-2 rounded-full bg-brand-500' }), t('dashboard.outbound'), h('span', { class: 'font-bold' }, `${formatNumber(metrics.netOut, lang)} Mbps`)),
            ),
          ],
        }),
      ),
      h(
        'p',
        { class: 'soft flex items-center gap-1.5 text-[10px]' },
        icon('info', 'size-3.5'),
        t('dashboard.simulatorText'),
      ),
    );
  }

  function buildSnapshots(current: Server): HTMLElement {
    const canCreate = current.snapshots.length < 8;
    const createButton = h(
      'button',
      {
        type: 'button',
        class: 'btn btn-primary btn-sm',
        disabled: !canCreate,
        title: canCreate ? t('server.snapshotCreateHint') : t('server.snapshotLimit'),
        onClick: () => openSnapshotDialog(current),
      },
      icon('camera', 'size-3.5'),
      t('server.snapshotCreate'),
    );

    return h(
      'div',
      { class: 'space-y-4' },
      sectionCard({
        title: t('server.snapshotTitle'),
        subtitle: t('server.snapshotText'),
        action: createButton,
        padded: false,
        body: [
          current.snapshots.length === 0
            ? emptyState({ icon: 'camera', title: t('server.snapshotEmpty'), text: t('server.snapshotEmptyHint'), action: h('button', { type: 'button', class: 'btn btn-primary btn-sm', onClick: () => openSnapshotDialog(current) }, t('server.snapshotCreate')) })
            : h(
                'div',
                null,
                h(
                  'div',
                  { class: 'hidden overflow-x-auto md:block' },
                  h(
                    'table',
                    { class: 'table min-w-[620px]' },
                    h('thead', null, h('tr', null, h('th', null, t('server.snapshotLabel')), h('th', null, t('server.snapshotSize')), h('th', null, t('server.snapshotDate')), h('th', null, t('server.snapshotState')), h('th', { class: 'text-end' }, t('common.actions')))),
                    h(
                      'tbody',
                      null,
                      ...current.snapshots.map((snapshot) =>
                        h(
                          'tr',
                          null,
                          h('td', { class: 'font-semibold' }, snapshot.label),
                          h('td', { class: 'text-xs tabular-nums' }, `${formatNumber(snapshot.sizeGb, lang)} GB`),
                          h('td', { class: 'text-xs' }, formatDateTime(snapshot.createdAt, lang)),
                          h('td', null, h('span', { class: 'badge border-accent-500/25 bg-accent-500/10 text-accent-700 dark:text-accent-300' }, icon('check', 'size-3'), t('server.snapshotAvailable'))),
                          h(
                            'td',
                            { class: 'text-end' },
                            h(
                              'button',
                              {
                                type: 'button',
                                class: 'icon-btn text-red-600',
                                'aria-label': t('common.delete'),
                                title: t('server.snapshotDeleteTitle'),
                                onClick: () => {
                                  void deleteSnapshot(current, snapshot.id, snapshot.label);
                                },
                              },
                              icon('trash', 'size-4'),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                h(
                  'ul',
                  { class: 'divide-y md:hidden', style: 'border-color: var(--line);' },
                  ...current.snapshots.map((snapshot) =>
                    h(
                      'li',
                      { class: 'flex items-start gap-3 p-4' },
                      h('span', { class: 'flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600' }, icon('camera', 'size-4')),
                      h(
                        'div',
                        { class: 'min-w-0 flex-1' },
                        h('p', { class: 'truncate text-sm font-bold' }, snapshot.label),
                        h('p', { class: 'soft mt-0.5 text-[10px]' }, `${formatNumber(snapshot.sizeGb, lang)} GB · ${formatDateTime(snapshot.createdAt, lang)}`),
                        h('div', { class: 'mt-1.5' }, h('span', { class: 'badge border-accent-500/25 bg-accent-500/10 text-accent-700 dark:text-accent-300' }, icon('check', 'size-3'), t('server.snapshotAvailable'))),
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          class: 'icon-btn shrink-0 text-red-600',
                          'aria-label': t('common.delete'),
                          onClick: () => {
                            void deleteSnapshot(current, snapshot.id, snapshot.label);
                          },
                        },
                        icon('trash', 'size-4'),
                      ),
                    ),
                  ),
                ),
              ),
        ],
      }),
      h('p', { class: 'soft text-[10px]' }, t('server.snapshotCount', { count: formatNumber(current.snapshots.length, lang) }), ' · ', t('server.snapshotLimit')),
    );
  }

  async function openSnapshotDialog(current: Server): Promise<void> {
    if (current.snapshots.length >= 8) {
      toast('error', t('server.snapshotLimit'));
      return;
    }
    const input = h('input', { id: 'snapshot-label', class: 'input', maxlength: '40', placeholder: t('server.snapshotLabelPlaceholder') });
    const error = makeError('snapshot-label-error');
    const body = h('div', { class: 'space-y-1' }, labeledField(t('server.snapshotLabel'), input, t('server.snapshotCreateHint'), error, 'snapshot-label'));

    await openDialog({
      title: t('server.snapshotCreate'),
      description: t('server.snapshotText'),
      body,
      confirmLabel: t('server.snapshotCreate'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => {
        const problem = validateSnapshotLabel(input.value);
        if (problem) {
          showError(error, tm(problem));
          input.focus();
          return false;
        }
        const result = store.createSnapshot(serverId, input.value, getCsrfToken());
        if (!result.ok) {
          showError(error, result.code === 'limit' ? t('server.snapshotLimit') : t('errors.generic'));
          return false;
        }
        toast('success', t('server.snapshotCreated', { label: result.value.label }));
        renderTab();
        return true;
      },
    });
  }
  async function deleteSnapshot(current: Server, snapshotId: string, label: string): Promise<void> {
    const confirmed = await openDialog({
      title: t('server.snapshotDeleteTitle'),
      description: t('server.snapshotDeleteText', { label }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      danger: true,
    });
    if (!confirmed) return;
    const result = store.deleteSnapshot(current.id, snapshotId, getCsrfToken());
    if (result.ok) {
      toast('success', t('server.snapshotDeleteDone'), {
        actionLabel: t('common.undo'),
        onAction: () => {
          if (store.createSnapshot(current.id, label, getCsrfToken()).ok) {
            toast('success', t('server.snapshotUndone'));
            renderTab();
          }
        },
      });
      renderTab();
    } else {
      toast('error', t('errors.notFound'));
    }
  }

  function buildFirewall(current: Server): HTMLElement {
    const addButton = h(
      'button',
      { type: 'button', class: 'btn btn-primary btn-sm', disabled: current.firewall.length >= 25, onClick: () => openFirewallDialog() },
      icon('plus', 'size-3.5'),
      t('server.firewallAdd'),
    );

    return h(
      'div',
      { class: 'space-y-4' },
      sectionCard({
        title: t('server.firewallTitle'),
        subtitle: t('server.firewallText'),
        action: addButton,
        padded: false,
        body: [
          current.firewall.length === 0
            ? emptyState({ icon: 'shield', title: t('server.firewallEmpty'), text: t('server.firewallEmptyHint'), action: h('button', { type: 'button', class: 'btn btn-primary btn-sm', onClick: () => openFirewallDialog() }, t('server.firewallAdd')) })
            : h(
                'div',
                null,
                h(
                  'div',
                  { class: 'hidden overflow-x-auto md:block' },
                  h(
                    'table',
                    { class: 'table min-w-[760px]' },
                    h(
                      'thead',
                      null,
                      h(
                        'tr',
                        null,
                        h('th', null, t('server.firewallDirection')),
                        h('th', null, t('server.firewallProtocol')),
                        h('th', null, t('server.firewallPorts')),
                        h('th', null, t('server.firewallSource')),
                        h('th', null, t('server.firewallNote')),
                        h('th', null, t('common.date')),
                        h('th', { class: 'text-end' }, t('common.actions')),
                      ),
                    ),
                    h(
                      'tbody',
                      null,
                      ...current.firewall.map((rule) =>
                        h(
                          'tr',
                          null,
                          h(
                            'td',
                            null,
                            h(
                              'span',
                              { class: rule.direction === 'inbound' ? 'badge border-brand-500/25 bg-brand-500/10 text-brand-700 dark:text-brand-300' : 'badge border-slate-400/30 bg-slate-500/10 text-slate-600 dark:text-slate-300' },
                              icon(rule.direction === 'inbound' ? 'arrowEnd' : 'arrowStart', 'size-3 flip-rtl'),
                              t(`directions.${rule.direction}`),
                            ),
                          ),
                          h('td', { class: 'font-mono text-xs font-semibold' }, rule.protocol.toUpperCase()),
                          h('td', { class: 'font-mono text-xs' }, rule.ports),
                          h('td', { class: 'font-mono text-xs' }, rule.source),
                          h('td', { class: 'max-w-[180px] truncate text-xs' }, rule.note || '—'),
                          h('td', { class: 'soft text-[10px]' }, formatDate(rule.createdAt, lang)),
                          h(
                            'td',
                            { class: 'text-end' },
                            h(
                              'button',
                              {
                                type: 'button',
                                class: 'icon-btn text-red-600',
                                'aria-label': t('common.delete'),
                                title: t('server.firewallDeleteTitle'),
                                onClick: () => {
                                  void deleteFirewallRule(current, rule.id, rule.protocol, rule.ports);
                                },
                              },
                              icon('trash', 'size-4'),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                h(
                  'ul',
                  { class: 'divide-y md:hidden', style: 'border-color: var(--line);' },
                  ...current.firewall.map((rule) =>
                    h(
                      'li',
                      { class: 'p-4' },
                      h(
                        'div',
                        { class: 'flex flex-wrap items-center gap-2' },
                        h(
                          'span',
                          { class: rule.direction === 'inbound' ? 'badge border-brand-500/25 bg-brand-500/10 text-brand-700 dark:text-brand-300' : 'badge border-slate-400/30 bg-slate-500/10 text-slate-600 dark:text-slate-300' },
                          icon(rule.direction === 'inbound' ? 'arrowEnd' : 'arrowStart', 'size-3 flip-rtl'),
                          t(`directions.${rule.direction}`),
                        ),
                        h('span', { class: 'chip font-mono' }, rule.protocol.toUpperCase()),
                        h('span', { class: 'soft ms-auto text-[10px]' }, formatDate(rule.createdAt, lang)),
                        h(
                          'button',
                          {
                            type: 'button',
                            class: 'icon-btn size-8 text-red-600',
                            'aria-label': t('common.delete'),
                            onClick: () => {
                              void deleteFirewallRule(current, rule.id, rule.protocol, rule.ports);
                            },
                          },
                          icon('trash', 'size-4'),
                        ),
                      ),
                      h('p', { class: 'mt-2 font-mono text-sm font-bold' }, rule.ports),
                      h('p', { class: 'soft mt-0.5 break-all font-mono text-[10px]' }, rule.source),
                      rule.note ? h('p', { class: 'muted mt-1 text-[11px]' }, rule.note) : null,
                    ),
                  ),
                ),
              ),
        ],
      }),
      h('p', { class: 'soft text-[10px]' }, t('server.firewallCount', { count: formatNumber(current.firewall.length, lang) })),
    );
  }

  async function openFirewallDialog(): Promise<void> {
    const direction = h('select', { id: 'fw-direction', class: 'select' }, h('option', { value: 'inbound' }, t('directions.inbound')), h('option', { value: 'outbound' }, t('directions.outbound')));
    const protocol = h('select', { id: 'fw-protocol', class: 'select' }, h('option', { value: 'tcp' }, 'TCP'), h('option', { value: 'udp' }, 'UDP'), h('option', { value: 'icmp' }, 'ICMP'));
    const ports = h('input', { id: 'fw-ports', class: 'input font-mono', placeholder: '22, 80,443, 8000-8100', autocomplete: 'off' });
    const source = h('input', { id: 'fw-source', class: 'input font-mono', placeholder: '203.0.113.0/24', autocomplete: 'off' });
    const note = h('input', { id: 'fw-note', class: 'input', maxlength: String(MAX_NOTE_LENGTH), placeholder: t('server.firewallNoteHint') });
    const portsError = makeError('fw-ports-error');
    const sourceError = makeError('fw-source-error');
    const noteError = makeError('fw-note-error');

    const body = h(
      'div',
      { class: 'space-y-3' },
      h('div', { class: 'grid grid-cols-2 gap-3' }, labeledField(t('server.firewallDirection'), direction, undefined, undefined, 'fw-direction'), labeledField(t('server.firewallProtocol'), protocol, undefined, undefined, 'fw-protocol')),
      labeledField(t('server.firewallPorts'), ports, t('server.firewallPortsHint'), portsError, 'fw-ports'),
      labeledField(t('server.firewallSource'), source, t('server.firewallSourceHint'), sourceError, 'fw-source'),
      labeledField(t('server.firewallNote'), note, t('server.firewallNoteHint'), noteError, 'fw-note'),
      notice({ tone: 'info', title: t('demo.simulated'), text: t('server.firewallText') }),
    );

    await openDialog({
      title: t('server.firewallAdd'),
      description: t('server.firewallText'),
      body,
      confirmLabel: t('server.firewallAddBtn'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => {
        showError(portsError, null);
        showError(sourceError, null);
        showError(noteError, null);
        const draft = {
          direction: direction.value as FirewallDirection,
          protocol: protocol.value as FirewallProtocol,
          ports: ports.value,
          source: source.value,
          note: note.value,
        };
        const localErrors = validateFirewallDraft(draft);
        if (localErrors.ports) showError(portsError, tm(localErrors.ports));
        if (localErrors.source) showError(sourceError, tm(localErrors.source));
        if (localErrors.note) showError(noteError, tm(localErrors.note));
        if (Object.keys(localErrors).length > 0) return false;

        const result = store.addFirewallRule(serverId, draft, getCsrfToken());
        if (!result.ok) {
          if (result.errors) {
            if (result.errors.ports) showError(portsError, tm(result.errors.ports));
            if (result.errors.source) showError(sourceError, tm(result.errors.source));
            if (result.errors.note) showError(noteError, tm(result.errors.note));
          } else {
            toast('error', t('errors.generic'));
          }
          return false;
        }
        toast('success', t('server.firewallAdded'));
        renderTab();
        return true;
      },
    });
  }

  async function deleteFirewallRule(current: Server, ruleId: string, protocol: string, ports: string): Promise<void> {
    const confirmed = await openDialog({
      title: t('server.firewallDeleteTitle'),
      description: t('server.firewallDeleteText', { protocol: protocol.toUpperCase(), ports }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      danger: true,
    });
    if (!confirmed) return;
    const rule = current.firewall.find((item) => item.id === ruleId);
    const result = store.deleteFirewallRule(current.id, ruleId, getCsrfToken());
    if (result.ok) {
      toast('success', t('server.firewallDeleted'), {
        actionLabel: t('common.undo'),
        onAction: () => {
          if (!rule) return;
          const restored = store.addFirewallRule(
            current.id,
            { direction: rule.direction, protocol: rule.protocol, ports: rule.ports, source: rule.source, note: rule.note },
            getCsrfToken(),
          );
          if (restored.ok) {
            toast('success', t('server.firewallUndone'));
            renderTab();
          }
        },
      });
      renderTab();
    } else {
      toast('error', t('errors.notFound'));
    }
  }

  function buildSsh(current: Server): HTMLElement {
    const addButton = h('button', { type: 'button', class: 'btn btn-primary btn-sm', disabled: current.sshKeys.length >= 10, onClick: () => openSshDialog(current) }, icon('key', 'size-3.5'), t('server.sshAdd'));

    return h(
      'div',
      { class: 'space-y-4' },
      notice({ tone: 'warning', title: t('server.sshFakeNotice'), text: t('server.sshPrivateNotice'), iconName: 'key' }),
      sectionCard({
        title: t('server.sshTitle'),
        subtitle: t('server.sshText'),
        action: addButton,
        padded: false,
        body: [
          current.sshKeys.length === 0
            ? emptyState({ icon: 'key', title: t('server.sshEmpty'), text: t('server.sshEmptyHint'), action: h('button', { type: 'button', class: 'btn btn-primary btn-sm', onClick: () => openSshDialog(current) }, t('server.sshAdd')) })
            : h(
                'ul',
                { class: 'divide-y', style: 'border-color: var(--line);' },
                ...current.sshKeys.map((key) =>
                  h(
                    'li',
                    { class: 'flex flex-wrap items-start gap-3 p-4 sm:flex-nowrap' },
                    h('span', { class: 'flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600' }, icon('key', 'size-4')),
                    h(
                      'div',
                      { class: 'min-w-0 flex-1' },
                      h('div', { class: 'flex flex-wrap items-center gap-2' }, h('p', { class: 'text-sm font-bold' }, key.name), demoBadge(), h('span', { class: 'soft text-[10px]' }, `${t('server.sshAddedAt')} ${formatDate(key.addedAt, lang)}`)),
                      h('p', { class: 'soft mt-1 break-all font-mono text-[10px]' }, key.publicKey),
                      h('p', { class: 'soft mt-1 text-[10px]' }, `${t('server.sshFingerprint')}: `, h('span', { class: 'font-mono' }, key.fingerprint)),
                    ),
                    h(
                      'div',
                      { class: 'flex shrink-0 gap-1' },
                      h(
                        'button',
                        {
                          type: 'button',
                          class: 'icon-btn',
                          'aria-label': t('server.sshCopy'),
                          title: t('server.sshCopy'),
                          onClick: () => {
                            void copyText(key.publicKey).then((ok) => toast(ok ? 'success' : 'error', ok ? t('common.copied') : t('errors.generic')));
                          },
                        },
                        icon('copy', 'size-4'),
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          class: 'icon-btn text-red-600',
                          'aria-label': t('common.delete'),
                          title: t('server.sshDeleteTitle'),
                          onClick: () => {
                            void removeSshKey(current, key.id, key.name);
                          },
                        },
                        icon('trash', 'size-4'),
                      ),
                    ),
                  ),
                ),
              ),
        ],
      }),
    );
  }

  async function openSshDialog(current: Server): Promise<void> {
    const name = h('input', { id: 'ssh-name', class: 'input', maxlength: '32', placeholder: t('server.sshKeyNamePlaceholder'), autocomplete: 'off' });
    const publicKey = h('textarea', { id: 'ssh-public-key', class: 'textarea font-mono text-xs', rows: '4', placeholder: t('server.sshPublicKeyPlaceholder') });
    const nameError = makeError('ssh-name-error');
    const keyError = makeError('ssh-key-error');

    const body = h(
      'div',
      { class: 'space-y-3' },
      labeledField(t('server.sshKeyName'), name, t('server.sshNameFormat'), nameError, 'ssh-name'),
      labeledField(t('server.sshPublicKey'), publicKey, t('server.sshPublicKeyHint'), keyError, 'ssh-public-key'),
      notice({ tone: 'warning', title: t('server.sshFakeNotice'), text: t('server.sshPrivateNotice') }),
    );

    await openDialog({
      title: t('server.sshAdd'),
      description: t('server.sshText'),
      body,
      confirmLabel: t('common.add'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => {
        showError(nameError, null);
        showError(keyError, null);
        const nameProblem = validateKeyName(name.value);
        const keyProblem = validateSshPublicKey(publicKey.value);
        if (nameProblem) showError(nameError, tm(nameProblem));
        if (keyProblem) showError(keyError, tm(keyProblem));
        if (nameProblem || keyProblem) return false;

        const parsed = parseSshPublicKey(publicKey.value);
        if (!parsed) {
          showError(keyError, t('server.sshKeyFormat'));
          return false;
        }
        if (current.sshKeys.some((key) => key.publicKey.includes(parsed.payload))) {
          showError(keyError, t('server.sshDuplicate'));
          return false;
        }

        const result = store.addSshKey(serverId, { name: name.value, publicKey: publicKey.value }, getCsrfToken());
        if (!result.ok) {
          if (result.errors?.publicKey) showError(keyError, tm(result.errors.publicKey));
          if (result.errors?.name) showError(nameError, tm(result.errors.name));
          if (!result.errors) toast('error', t('errors.generic'));
          return false;
        }
        toast('success', t('server.sshAdded', { name: result.value.name }));
        renderTab();
        return true;
      },
    });
  }

  async function removeSshKey(current: Server, keyId: string, keyName: string): Promise<void> {
    const confirmed = await openDialog({
      title: t('server.sshDeleteTitle'),
      description: t('server.sshDeleteText', { name: keyName }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      danger: true,
    });
    if (!confirmed) return;
    const key = current.sshKeys.find((item) => item.id === keyId);
    const result = store.deleteSshKey(current.id, keyId, getCsrfToken());
    if (result.ok) {
      toast('success', t('server.sshDeleted'), {
        actionLabel: t('common.undo'),
        onAction: () => {
          if (!key) return;
          if (store.addSshKey(current.id, { name: key.name, publicKey: key.publicKey }, getCsrfToken()).ok) {
            toast('success', t('server.sshUndone'));
            renderTab();
          }
        },
      });
      renderTab();
    } else {
      toast('error', t('errors.notFound'));
    }
  }

  function buildRdp(current: Server): HTMLElement {
    if (!current.rdp) {
      return h('div', { class: 'card' }, emptyState({ icon: 'monitor', title: t('server.rdpNoServer'), text: t('server.rdpNoServerText'), action: h('button', { type: 'button', class: 'btn btn-secondary btn-sm', onClick: () => tabTo('overview') }, t('server.tabs.overview')) }));
    }
    const endpoint = `${current.ipv4}:${current.rdp.port}`;

    return h(
      'div',
      { class: 'grid gap-5 xl:grid-cols-3' },
      h(
        'div',
        { class: 'space-y-5 xl:col-span-2' },
        notice({ tone: 'warning', title: t('server.rdpNotice'), text: t('demo.noNetwork'), iconName: 'shieldCheck' }),
        sectionCard({
          title: t('server.rdpTitle'),
          subtitle: osName(current.osId),
          action: demoBadge(t('server.rdpEndpointDemo')),
          body: [
            h(
              'dl',
              { class: 'grid grid-cols-1 gap-3 sm:grid-cols-2' },
              ...[
                { label: t('server.rdpHost'), value: current.ipv4, hint: t('server.rdpEndpointDemo') },
                { label: t('server.rdpPort'), value: String(current.rdp.port), hint: 'TCP' },
                { label: t('server.rdpUser'), value: current.rdp.username, hint: t('server.rdpSessionHint', { user: current.rdp.username }) },
                { label: t('server.rdpPassword'), value: '••••••••', hint: t('server.rdpPasswordHint') },
              ].map((entry) =>
                h(
                  'div',
                  { class: 'rounded-xl border p-3', style: 'border-color: var(--line); background-color: var(--surface-2);' },
                  h('p', { class: 'soft text-[10px] font-semibold uppercase' }, entry.label),
                  h('p', { class: 'mt-1 break-all font-mono text-sm font-bold' }, entry.value),
                  h('p', { class: 'soft mt-1 text-[10px] leading-5' }, entry.hint),
                ),
              ),
            ),
            h(
              'div',
              { class: 'mt-4 flex flex-wrap gap-2' },
              h(
                'button',
                {
                  type: 'button',
                  class: 'btn btn-primary btn-sm',
                  onClick: () => {
                    const details = `${t('server.rdpHost')}: ${endpoint}\n${t('server.rdpUser')}: ${current.rdp?.username ?? ''}\n${t('server.rdpPassword')}: demo-only`;
                    void copyText(details).then((ok) => toast(ok ? 'success' : 'error', ok ? t('server.rdpCopied') : t('errors.generic')));
                  },
                },
                icon('copy', 'size-3.5'),
                t('server.rdpCopy'),
              ),
              h('span', { class: 'badge border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300' }, icon('lock', 'size-3.5'), t('server.rdpEndpointDemo')),
            ),
            h('p', { class: 'soft mt-3 text-[10px]' }, t('server.rdpPasswordHint')),
          ],
        }),
      ),
      h(
        'div',
        { class: 'space-y-5' },
        sectionCard({
          title: t('server.rdpGuide'),
          subtitle: t('server.rdpGuideText'),
          body: [
            h(
              'ol',
              { class: 'space-y-3' },
              ...[t('server.rdpStep1'), t('server.rdpStep2'), t('server.rdpStep3')].map((step, index) =>
                h(
                  'li',
                  { class: 'flex gap-2.5' },
                  h('span', { class: 'flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-[10px] font-bold text-brand-600' }, String(index + 1)),
                  h('span', { class: 'muted text-xs leading-6' }, step),
                ),
              ),
            ),
          ],
        }),
        sectionCard({
          title: t('server.rdpSecurity'),
          body: [h('p', { class: 'muted text-xs leading-6' }, t('server.rdpSecurityText'))],
        }),
      ),
    );
  }

  function buildConsole(current: Server): HTMLElement {
    const log = h('pre', {
      class: 'h-72 overflow-y-auto rounded-xl p-3 font-mono text-[11px] leading-5',
      style: 'background-color:#06101f; color:#9fe8d8; border:1px solid #16324a;',
      role: 'log',
      'aria-live': 'off',
      'aria-label': t('server.consoleTitle'),
      tabindex: '0',
    });

    let paused = false;
    let autoScroll = true;
    let timer: number | null = null;

    const append = (line: string): void => {
      const time = new Date().toISOString().slice(11, 19);
      const row = h('div', null, h('span', { style: 'color:#5b7f97;' }, `[${time}] `), line);
      log.appendChild(row);
      while (log.childElementCount > 200) log.firstElementChild?.remove();
      if (autoScroll) log.scrollTop = log.scrollHeight;
    };

    const bootLines = [
      `[boot] vps-panel-console · ${current.name}`,
      `[boot] image=${osName(current.osId)} region=${current.regionId}`,
      '[warn] SCRIPTED OUTPUT — no shell is attached and no command is executed',
      '[ok] systemd: simulated multi-user target reached',
      '[ok] ssh: simulated listener ready',
    ];
    for (const line of bootLines) append(line);

    const streamLines = [
      '[info] healthcheck: simulated services nominal',
      `[info] memory: ${formatNumber(computeServerMetrics(current, currentSample()).memory, lang)}% (simulated)`,
      '[ok] backup agent: idle (demo)',
      '[info] firewall: demo rules loaded',
      `[info] network: ${formatNumber(computeServerMetrics(current, currentSample()).netIn, lang)} Mbps inbound (simulated)`,
      '[ok] heartbeat acknowledged by demo orchestrator',
    ];
    let streamIndex = 0;

    const startStream = (): void => {
      timer = window.setInterval(() => {
        if (paused) return;
        append(streamLines[streamIndex % streamLines.length] ?? '[info] demo tick');
        streamIndex += 1;
      }, 1700);
    };
    startStream();

    const pauseButton = h(
      'button',
      {
        type: 'button',
        class: 'btn btn-secondary btn-sm',
        onClick: () => {
          paused = !paused;
          replaceChildren(pauseButton, icon(paused ? 'play' : 'stop', 'size-3.5'), paused ? t('server.consoleResume') : t('server.consolePause'));
          pauseButton.setAttribute('aria-pressed', String(paused));
          append(paused ? '[info] stream paused by user' : '[info] stream resumed by user');
        },
      },
      icon('stop', 'size-3.5'),
      t('server.consolePause'),
    );

    const followInput = h('input', {
      type: 'checkbox',
      class: 'size-4 accent-teal-600',
      checked: true,
      onChange: (event: Event) => {
        autoScroll = (event.target as HTMLInputElement).checked;
        if (autoScroll) log.scrollTop = log.scrollHeight;
      },
    });

    const commandInput = h('input', {
      type: 'text',
      class: 'input h-9 font-mono text-xs',
      placeholder: t('server.consolePlaceholder'),
      'aria-label': t('server.consoleCommandHint'),
      autocomplete: 'off',
    });

    const commandForm = h(
      'form',
      {
        class: 'mt-3 flex gap-2',
        onSubmit: (event: Event) => {
          event.preventDefault();
          const raw = commandInput.value.trim();
          if (!raw) return;
          commandInput.value = '';
          append(`demo@${current.name}:~$ ${raw}`);
          const command = raw.toLowerCase();
          if (command === 'help') append(t('server.consoleHelp'));
          else if (command === 'status') append(t('server.consoleStatus'));
          else if (command === 'uptime') append(t('server.consoleUptime', { uptime: formatUptime(simulatedUptimeMinutes(current, Date.now()), lang) }));
          else if (command === 'whoami') append(t('server.consoleWhoami'));
          else if (command === 'clear') {
            replaceChildren(log);
          } else append(t('server.consoleUnknown'));
        },
      },
      commandInput,
      h('button', { type: 'submit', class: 'btn btn-secondary btn-sm h-9' }, icon('terminal', 'size-3.5'), t('server.consoleSend')),
    );

    consoleCleanup = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    };

    return h(
      'div',
      { class: 'space-y-4' },
      sectionCard({
        title: t('server.consoleTitle'),
        subtitle: t('server.consoleText'),
        action: h('span', { class: 'badge border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300' }, t('server.consoleSimulated')),
        body: [
          h(
            'div',
            { class: 'mb-3 flex flex-wrap items-center gap-2' },
            pauseButton,
            h('button', { type: 'button', class: 'btn btn-secondary btn-sm', onClick: () => replaceChildren(log) }, icon('trash', 'size-3.5'), t('server.consoleClear')),
            h('label', { class: 'ms-auto inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold' }, followInput, t('server.consoleFollow')),
          ),
          log,
          commandForm,
          h('p', { class: 'soft mt-2 text-[10px]' }, t('server.consoleCommandHint')),
        ],
      }),
    );
  }

  function renderTab(): void {
    if (consoleCleanup) {
      consoleCleanup();
      consoleCleanup = null;
    }
    const current = server();

    switch (activeTab) {
      case 'overview':
        replaceChildren(tabHost, buildOverview(current));
        break;
      case 'monitoring':
        replaceChildren(tabHost, buildMonitoring(current));
        break;
      case 'snapshots':
        replaceChildren(tabHost, buildSnapshots(current));
        break;
      case 'firewall':
        replaceChildren(tabHost, buildFirewall(current));
        break;
      case 'access':
        replaceChildren(tabHost, buildSsh(current));
        break;
      case 'rdp':
        replaceChildren(tabHost, buildRdp(current));
        break;
      case 'console':
        replaceChildren(tabHost, buildConsole(current));
        break;
    }
  }

  function signature(): string {
    const current = server();
    return `${current.status}|${current.snapshots.length}|${current.firewall.length}|${current.sshKeys.length}|${current.name}|${current.rdp?.username ?? ''}`;
  }

  tabNav.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.getAttribute('role') !== 'tab') return;
    const currentIndex = TABS.indexOf(activeTab);
    const rtl = document.documentElement.dir === 'rtl';
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = currentIndex + (rtl ? -1 : 1);
        break;
      case 'ArrowLeft':
        nextIndex = currentIndex + (rtl ? 1 : -1);
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = TABS.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const nextTab = TABS[(nextIndex + TABS.length) % TABS.length];
    if (!nextTab) return;
    activeTab = nextTab;
    window.history.replaceState(null, '', `#/servers/${serverId}?tab=${nextTab}`);
    renderTabNav();
    renderTab();
    tabHost.setAttribute('aria-labelledby', `tab-${nextTab}`);
    document.getElementById(`tab-${nextTab}`)?.focus();
  });

  let lastSignature = signature();

  const root = h('div', null, headerHost, tabNav, tabHost);
  renderHeader();
  renderTabNav();
  renderTab();

  const unsubscribeStore = store.subscribe(() => {
    if (signature() === lastSignature) return;
    lastSignature = signature();
    renderHeader();
    renderTabNav();
    renderTab();
  });

  const unsubscribeClock = onClock(() => {
    if (activeTab === 'monitoring') renderTab();
  });

  return {
    el: root,
    titleKey: 'servers.title',
    destroy: () => {
      unsubscribeStore();
      unsubscribeClock();
      if (consoleCleanup) consoleCleanup();
    },
  };
}

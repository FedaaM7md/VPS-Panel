/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { t } from '../i18n';
import { getStore } from '../state/store';
import { getCsrfToken } from '../lib/csrf';
import { refreshRoute } from '../lib/navigation';
import { currentSample, onClock } from '../lib/clock';
import { fleetSeries, fleetTotals, buildSeries } from '../lib/simulator';
import { formatNumber, formatPercent, formatRelative, formatStorage } from '../lib/format';
import { REGIONS } from '../data/catalog';
import type { Server } from '../lib/types';
import { h, replaceChildren } from '../ui/dom';
import { icon } from '../ui/icons';
import { areaChart, donut, gauge, sparkline, statusColor } from '../ui/charts';
import { pageHeader, sectionCard, emptyState, notice, statTile } from '../ui/components';
import { demoBadge, simulatedBadge } from '../ui/badges';
import { activityIcon, activityText, alertContent, alertIcon } from '../ui/labels';
import { toast } from '../ui/toast';
import type { PageInstance } from './types';

export function renderDashboard(): PageInstance {
  const store = getStore();
  const state = store.getState();
  const lang = state.settings.lang;
  const session = state.session;

  let sample = currentSample();

  const kpiHost = h('div', { id: 'kpi-probe' });
  const rackHost = h('div');
  const networkHost = h('div');
  const gaugesHost = h('div');
  const alertsHost = h('div');
  const statusHost = h('div');
  const regionsHost = h('div');
  const activityHost = h('div');
  const quickHost = h('div');

  function buildKpis(current: number): HTMLElement {
    const servers = store.getState().servers;
    const totals = fleetTotals(servers, current);
    const cpuSeries = fleetSeries(servers, 'cpu', current, 24);
    const memorySeries = fleetSeries(servers, 'memory', current, 24);
    const diskSeries = fleetSeries(servers, 'disk', current, 24);
    const total = Math.max(1, totals.total);
    const statusBar = h(
      'div',
      { class: 'flex h-10 items-center' },
      h(
        'div',
        { class: 'flex h-2.5 w-full overflow-hidden rounded-full', role: 'img', 'aria-label': `${totals.running} ${t('status.running')}, ${totals.stopped} ${t('status.stopped')}, ${totals.transient} ${t('dashboard.transitioning')}` },
        h('span', { style: `width:${(totals.running / total) * 100}%; background-color:var(--color-accent-500);` }),
        h('span', { style: `width:${(totals.stopped / total) * 100}%; background-color:var(--color-slate-400);` }),
        h('span', { style: `width:${(totals.transient / total) * 100}%; background-color:var(--color-amber-500);` }),
      ),
    );

    return h(
      'div',
      { class: 'grid gap-3 sm:grid-cols-2 xl:grid-cols-4' },
      statTile({
        label: t('dashboard.serversTotal'),
        value: formatNumber(totals.total, lang),
        hint: `${formatNumber(totals.running, lang)} ${t('status.running')} · ${formatNumber(totals.transient, lang)} ${t('dashboard.transitioning')}`,
        iconName: 'server',
        accent: 'brand',
        chart: statusBar,
      }),
      statTile({
        label: t('dashboard.cpuLoad'),
        value: formatPercent(totals.avgCpu, lang, 1),
        hint: `${t('dashboard.vcpuTotal')}: ${formatNumber(totals.vcpu, lang)}`,
        iconName: 'cpu',
        accent: 'accent',
        chart: sparkline(cpuSeries, { color: 'var(--color-accent-500)', label: t('dashboard.cpuLoad') }),
      }),
      statTile({
        label: t('dashboard.memoryLoad'),
        value: formatPercent(totals.avgMemory, lang, 1),
        hint: `${t('dashboard.ramTotal')}: ${formatStorage(totals.ramGb, lang)}`,
        iconName: 'memory',
        accent: 'brand',
        chart: sparkline(memorySeries, { color: 'var(--color-brand-500)', label: t('dashboard.memoryLoad') }),
      }),
      statTile({
        label: t('dashboard.diskUse'),
        value: formatPercent(totals.avgDisk, lang, 1),
        hint: `${t('dashboard.diskTotal')}: ${formatStorage(totals.diskGb, lang)}`,
        iconName: 'disk',
        accent: 'amber',
        chart: sparkline(diskSeries, { color: 'var(--color-amber-500)', label: t('dashboard.diskUse') }),
      }),
    );
  }

  function buildRack(): HTMLElement {
    const servers = store.getState().servers;
    const units = servers.slice(0, 6).map((server) => {
      const color = statusColor(server.status);
      return h(
        'a',
        {
          href: `#/servers/${server.id}`,
          class: 'rack-unit transition-colors hover:border-[color:var(--line-strong)]',
          'aria-label': `${t('servers.open')}: ${server.name}`,
        },
        h('span', { class: 'rack-ear' }),
        h('span', { class: 'rack-led', style: `color:${color}; background-color:${color};` }),
        h(
          'span',
          { class: 'min-w-0 flex-1' },
          h(
            'span',
            { class: 'flex min-w-0 items-center gap-2' },
            h('span', { class: 'truncate text-xs font-semibold' }, server.name),
            h('span', { class: 'chip hidden shrink-0 px-1.5 py-0.5 text-[9px] sm:inline-flex' }, t(`regions.${server.regionId}`)),
          ),
          h('span', { class: 'soft block truncate font-mono text-[10px]' }, `${server.ipv4} · ${server.cpuCores} vCPU · ${formatStorage(server.ramGb, lang)}`),
        ),
        h('span', { class: 'rack-vents hidden md:block' }),
        h('span', { class: 'shrink-0 text-[9px] font-semibold uppercase', style: `color:${color};` }, t(`status.${server.status}`)),
        h('span', { class: 'rack-ear' }),
      );
    });

    return sectionCard({
      title: t('dashboard.rackTitle'),
      subtitle: t('dashboard.rackText'),
      action: h('a', { href: '#/servers', class: 'text-xs font-semibold text-brand-600 hover:underline' }, t('dashboard.viewAll')),
      padded: false,
      body: [
        h(
          'div',
          { class: 'rack m-4 sm:m-5', 'aria-label': t('dashboard.rackTitle') },
          ...units,
          servers.length > units.length
            ? h(
                'a',
                { href: '#/servers', class: 'mt-2 flex items-center justify-center gap-1.5 py-1 text-[10px] font-semibold text-brand-600 hover:underline' },
                `+${formatNumber(servers.length - units.length, lang)} ${t('nav.servers')}`,
              )
            : null,
        ),
      ],
    });
  }

  function buildNetwork(current: number): HTMLElement {
    const servers = store.getState().servers;
    const inboundSeries = fleetSeries(servers, 'network', current, 40);
    const lastIn = inboundSeries[inboundSeries.length - 1] ?? 0;
    const outboundSeed = Math.max(8, lastIn * 0.58);
    const outboundSeries = buildSeries('fleet-net-out', {
      base: outboundSeed,
      amplitude: Math.max(4, outboundSeed * 0.24),
      noise: Math.max(2, outboundSeed * 0.14),
      count: 40,
      sample: current,
      min: 0,
      max: 520,
    });
    const lastOut = outboundSeries[outboundSeries.length - 1] ?? 0;

    return sectionCard({
      title: t('dashboard.networkTitle'),
      subtitle: t('dashboard.networkText'),
      action: simulatedBadge(),
      body: [
        h(
          'div',
          { class: 'flex flex-wrap items-end gap-x-8 gap-y-3' },
          h(
            'div',
            null,
            h('p', { class: 'soft text-[11px] font-semibold uppercase' }, t('dashboard.inbound')),
            h('p', { class: 'mt-0.5 text-2xl font-extrabold tabular-nums' }, `${formatNumber(lastIn, lang)} `, h('span', { class: 'text-xs font-semibold muted' }, t('common.mbps'))),
          ),
          h(
            'div',
            null,
            h('p', { class: 'soft text-[11px] font-semibold uppercase' }, t('dashboard.outbound')),
            h('p', { class: 'mt-0.5 text-2xl font-extrabold tabular-nums' }, `${formatNumber(lastOut, lang)} `, h('span', { class: 'text-xs font-semibold muted' }, t('common.mbps'))),
          ),
          h(
            'div',
            { class: 'ms-auto hidden items-center gap-3 text-[10px] sm:flex' },
            h('span', { class: 'inline-flex items-center gap-1.5' }, h('span', { class: 'h-0.5 w-5 rounded', style: 'background-color: var(--color-accent-500);' }), t('dashboard.inbound')),
            h('span', { class: 'inline-flex items-center gap-1.5' }, h('span', { class: 'h-0.5 w-5 rounded border-t border-dashed', style: 'border-color: var(--color-brand-500);' }), t('dashboard.outbound')),
          ),
        ),
        h(
          'div',
          { class: 'mt-3' },
          areaChart(inboundSeries, {
            label: t('dashboard.networkTitle'),
            color: 'var(--color-accent-500)',
            secondaryValues: outboundSeries,
            secondaryColor: 'var(--color-brand-500)',
            height: 200,
          }),
        ),
        h('p', { class: 'soft mt-2 text-[10px]' }, t('dashboard.updated', { when: formatRelative(new Date().toISOString(), lang) })),
      ],
    });
  }

  function buildGauges(current: number): HTMLElement {
    const totals = fleetTotals(store.getState().servers, current);
    return h(
      'div',
      { class: 'card p-5' },
      h(
        'div',
        { class: 'flex flex-wrap items-start justify-between gap-2' },
        h('div', null, h('h2', { class: 'text-base font-bold' }, t('server.metricsTitle')), h('p', { class: 'muted mt-1 text-sm' }, t('server.metricsText'))),
        simulatedBadge(),
      ),
      h(
        'div',
        { class: 'mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3' },
        gauge(totals.avgCpu, { label: t('dashboard.cpuLoad'), lang, detail: `${t('dashboard.vcpuTotal')} ${formatNumber(totals.vcpu, lang)}` }),
        gauge(totals.avgMemory, { label: t('dashboard.memoryLoad'), lang, detail: formatStorage(totals.ramGb, lang) }),
        gauge(totals.avgDisk, { label: t('dashboard.diskUse'), lang, detail: formatStorage(totals.diskGb, lang) }),
      ),
      h('p', { class: 'soft mt-4 text-[10px]' }, t('dashboard.storageHint')),
    );
  }

  function allServers(): readonly Server[] {
    return store.getState().servers;
  }

  function buildAlerts(): HTMLElement {
    const current = store.getState();
    const unread = current.alerts.filter((alert) => !alert.read);
    const list =
      unread.length === 0
        ? [emptyState({ icon: 'checkCircle', title: t('dashboard.noAlerts'), text: t('alerts.empty') })]
        : unread.slice(0, 4).map((alert) => {
            const content = alertContent(alert, current);
            return h(
              'li',
              { class: 'flex items-start gap-2.5 py-3' },
              h(
                'span',
                {
                  class:
                    alert.severity === 'critical'
                      ? 'mt-0.5 text-red-500'
                      : alert.severity === 'warning'
                        ? 'mt-0.5 text-amber-500'
                        : 'mt-0.5 text-brand-500',
                },
                icon(alertIcon(alert.code), 'size-4'),
              ),
              h(
                'div',
                { class: 'min-w-0 flex-1' },
                h('a', { href: `#${content.href}`, class: 'block text-xs font-semibold leading-5 hover:text-brand-600' }, content.title),
                h('p', { class: 'soft mt-0.5 text-[10px]' }, formatRelative(alert.at, current.settings.lang)),
              ),
              h(
                'button',
                {
                  type: 'button',
                  class: 'icon-btn size-7 shrink-0',
                  'aria-label': t('alerts.markRead'),
                  title: t('alerts.markRead'),
                  onClick: () => {
                    store.markAlertRead(alert.id, getCsrfToken());
                    refreshRoute();
                    toast('success', t('alerts.read'));
                  },
                },
                icon('check', 'size-3.5'),
              ),
            );
          });

    return sectionCard({
      title: t('dashboard.alertsTitle'),
      subtitle: t('alerts.panelText'),
      action: unread.length > 0
        ? h(
            'button',
            {
              type: 'button',
              class: 'btn btn-ghost btn-sm',
              onClick: () => {
                store.markAllAlertsRead(getCsrfToken());
                refreshRoute();
                toast('success', t('alerts.allRead'));
              },
            },
            t('alerts.markAllRead'),
          )
        : null,
      padded: false,
      body: [h('ul', { class: 'divide-y px-5 pb-2', style: 'border-color: var(--line);' }, ...list)],
    });
  }

  function buildStatus(): HTMLElement {
    const servers = allServers();
    const totals = fleetTotals(servers, sample);
    const counts = [
      { key: 'running' as const, value: totals.running },
      { key: 'stopped' as const, value: totals.stopped },
      { key: 'rebooting' as const, value: servers.filter((server) => server.status === 'rebooting').length },
      { key: 'provisioning' as const, value: servers.filter((server) => server.status === 'provisioning').length },
    ];

    return sectionCard({
      title: t('dashboard.statusTitle'),
      subtitle: t('dashboard.statusText'),
      body: [
        h(
          'div',
          { class: 'flex flex-col items-center gap-4 sm:flex-row' },
          donut(
            counts.map((entry) => ({ value: entry.value, color: statusColor(entry.key), label: t(`status.${entry.key}`) })),
            t('dashboard.serversTotal'),
            formatNumber(totals.total, lang),
          ),
          h(
            'ul',
            { class: 'w-full flex-1 space-y-2' },
            ...counts.map((entry) =>
              h(
                'li',
                { class: 'flex items-center justify-between gap-2 text-xs' },
                h(
                  'span',
                  { class: 'inline-flex items-center gap-1.5' },
                  h('span', { class: 'size-2 rounded-full', style: `background-color:${statusColor(entry.key)}` }),
                  t(`status.${entry.key}`),
                ),
                h('span', { class: 'font-bold tabular-nums' }, formatNumber(entry.value, lang)),
              ),
            ),
          ),
        ),
        h('div', { class: 'my-4 border-t', style: 'border-color: var(--line);' }),
        h(
          'dl',
          { class: 'grid grid-cols-3 gap-2 text-center' },
          ...[
            { label: t('dashboard.vcpuTotal'), value: formatNumber(totals.vcpu, lang) },
            { label: t('dashboard.ramTotal'), value: formatStorage(totals.ramGb, lang) },
            { label: t('dashboard.diskTotal'), value: formatStorage(totals.diskGb, lang) },
          ].map((item) =>
            h(
              'div',
              { class: 'rounded-lg px-2 py-2', style: 'background-color: var(--surface-2);' },
              h('dt', { class: 'soft text-[9px] font-semibold uppercase' }, item.label),
              h('dd', { class: 'mt-0.5 text-xs font-bold' }, item.value),
            ),
          ),
        ),
      ],
    });
  }

  function buildRegions(): HTMLElement {
    const servers = allServers();
    const max = Math.max(1, ...REGIONS.map((region) => servers.filter((server) => server.regionId === region.id).length));
    return sectionCard({
      title: t('dashboard.regionsTitle'),
      subtitle: t('dashboard.regionsText'),
      body: [
        h(
          'ul',
          { class: 'space-y-2.5' },
          ...REGIONS.map((region) => {
            const count = servers.filter((server) => server.regionId === region.id).length;
            return h(
              'li',
              { class: 'flex items-center gap-2.5' },
              h('span', { class: 'w-16 shrink-0 truncate text-[11px] font-semibold' }, t(`regions.${region.id}`)),
              h(
                'span',
                { class: 'h-1.5 flex-1 overflow-hidden rounded-full', style: 'background-color: var(--surface-3);' },
                h('span', { class: 'block h-full rounded-full', style: `width:${(count / max) * 100}%; background-color: var(--color-brand-500); opacity:0.75;` }),
              ),
              h('span', { class: 'soft w-8 shrink-0 text-end text-[10px] tabular-nums' }, formatNumber(count, lang)),
              h('span', { class: 'soft w-14 shrink-0 text-end text-[10px] tabular-nums' }, t('regions.latency', { ms: formatNumber(region.latencyMs, lang) })),
            );
          }),
        ),
        h('p', { class: 'soft mt-3 text-[10px]' }, t('demo.simulated')),
      ],
    });
  }

  function buildActivity(): HTMLElement {
    const current = store.getState();
    return sectionCard({
      title: t('dashboard.activityTitle'),
      action: h('a', { href: '#/servers', class: 'text-xs font-semibold text-brand-600 hover:underline' }, t('dashboard.viewAll')),
      padded: false,
      body: [
        current.activity.length === 0
          ? emptyState({ icon: 'activity', title: t('activity.empty'), text: t('activity.emptyHint') })
          : h(
              'ol',
              { class: 'divide-y px-5', style: 'border-color: var(--line);' },
              ...current.activity.slice(0, 6).map((entry) =>
                h(
                  'li',
                  { class: 'flex items-center gap-3 py-3' },
                  h(
                    'span',
                    { class: 'flex size-8 shrink-0 items-center justify-center rounded-lg', style: 'background-color: var(--surface-3); color: var(--ink-muted);' },
                    icon(activityIcon(entry), 'size-4'),
                  ),
                  h(
                    'div',
                    { class: 'min-w-0 flex-1' },
                    entry.serverId
                      ? h('a', { href: `#/servers/${entry.serverId}`, class: 'block truncate text-xs font-semibold hover:text-brand-600' }, activityText(entry))
                      : h('p', { class: 'truncate text-xs font-semibold' }, activityText(entry)),
                    h('p', { class: 'soft mt-0.5 text-[10px]' }, formatRelative(entry.at, lang)),
                  ),
                  entry.serverName ? h('span', { class: 'chip hidden sm:inline-flex' }, entry.serverName) : null,
                ),
              ),
            ),
      ],
    });
  }

  function buildQuick(): HTMLElement {
    const entries = [
      { href: '/servers/new', iconName: 'plus' as const, title: t('dashboard.quickCreate'), text: t('dashboard.quickCreateText') },
      { href: '/billing', iconName: 'creditCard' as const, title: t('dashboard.quickBilling'), text: t('dashboard.quickBillingText') },
      { href: '/settings', iconName: 'settings' as const, title: t('dashboard.quickSettings'), text: t('dashboard.quickSettingsText') },
    ];
    return sectionCard({
      title: t('dashboard.quickTitle'),
      body: [
        h(
          'div',
          { class: 'space-y-2' },
          ...entries.map((entry) =>
            h(
              'a',
              { href: `#${entry.href}`, class: 'group flex items-center gap-3 rounded-xl border p-2.5 transition-colors hover:border-brand-500/40', style: 'border-color: var(--line);' },
              h('span', { class: 'flex size-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600' }, icon(entry.iconName, 'size-4')),
              h('span', { class: 'min-w-0 flex-1' }, h('span', { class: 'block text-xs font-semibold' }, entry.title), h('span', { class: 'soft block truncate text-[10px]' }, entry.text)),
              icon('chevronEnd', 'size-4 shrink-0 soft flip-rtl'),
            ),
          ),
        ),
      ],
    });
  }

  function renderCharts(current: number): void {
    sample = current;
    replaceChildren(kpiHost, buildKpis(current));
    replaceChildren(networkHost, buildNetwork(current));
    replaceChildren(gaugesHost, buildGauges(current));
  }

  function renderStateSections(): void {
    replaceChildren(rackHost, buildRack());
    replaceChildren(alertsHost, buildAlerts());
    replaceChildren(statusHost, buildStatus());
    replaceChildren(regionsHost, buildRegions());
    replaceChildren(activityHost, buildActivity());
    replaceChildren(quickHost, buildQuick());
  }

  const content = h(
    'div',
    { class: 'space-y-5' },
    kpiHost,
    rackHost,
    h(
      'div',
      { class: 'grid gap-5 xl:grid-cols-3', id: 'content-grid' },
      h('div', { class: 'space-y-5 xl:col-span-2' }, networkHost, gaugesHost, activityHost),
      h('div', { class: 'space-y-5' }, alertsHost, statusHost, regionsHost, quickHost),
    ),
  );

  const root = h(
    'div',
    null,
    pageHeader({
      eyebrow: `${t('dashboard.greeting')} · ${session?.isGuest ? t('auth.guestName') : (session?.name ?? '')}`,
      title: t('dashboard.title'),
      subtitle: t('dashboard.subtitle'),
      actions: [
        h('a', { href: '#/servers/new', class: 'btn btn-primary' }, icon('plus', 'size-4'), t('servers.create')),
        h('a', { href: '#/servers', class: 'btn btn-secondary' }, icon('server', 'size-4'), t('nav.servers')),
      ],
    }),
    content,
    h(
      'div',
      { class: 'mt-5 grid gap-3 lg:grid-cols-[1.6fr_1fr]' },
      notice({
        title: t('demo.simulatorTitle'),
        text: t('demo.simulatorText'),
        iconName: 'activity',
      }),
      h(
        'div',
        { class: 'card flex flex-wrap items-center justify-center gap-2 p-4' },
        demoBadge(),
        simulatedBadge(),
        h('span', { class: 'badge border-dashed border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300' }, icon('wifi', 'size-3.5'), t('demo.noNetwork')),
      ),
    ),
  );

  renderCharts(sample);
  renderStateSections();

  const unsubscribeStore = store.subscribe(() => {
    const next = currentSample();
    renderCharts(next);
    renderStateSections();
  });
  const unsubscribeClock = onClock(({ sample: next }) => {
    renderCharts(next);
    replaceChildren(statusHost, buildStatus());
  });

  return {
    el: root,
    titleKey: 'dashboard.title',
    destroy: () => {
      unsubscribeStore();
      unsubscribeClock();
    },
  };
}

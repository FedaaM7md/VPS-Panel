/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { t } from '../i18n';
import { getStore } from '../state/store';
import { getCsrfToken } from '../lib/csrf';
import { PLANS, getPlan } from '../data/catalog';
import type { InvoiceStatus, PlanId } from '../lib/types';
import { formatDate, formatMoney, formatNumber, localeFor, percentOf } from '../lib/format';
import { downloadCsv } from '../lib/csv';
import { buildSeries } from '../lib/simulator';
import { h, replaceChildren } from '../ui/dom';
import { icon } from '../ui/icons';
import { barChart } from '../ui/charts';
import { pageHeader, sectionCard, notice } from '../ui/components';
import { demoBadge, simulatedBadge } from '../ui/badges';
import { planName, planDescription } from '../ui/labels';
import { openDialog } from '../ui/dialog';
import { toast } from '../ui/toast';
import type { PageInstance } from './types';

function invoiceBadge(status: InvoiceStatus): HTMLElement {
  if (status === 'paid') {
    return h('span', { class: 'badge border-accent-500/25 bg-accent-500/10 text-accent-700 dark:text-accent-300' }, icon('checkCircle', 'size-3'), t('billing.paid'));
  }
  if (status === 'pending') {
    return h('span', { class: 'badge border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300' }, icon('clock', 'size-3'), t('billing.pending'));
  }
  return h('span', { class: 'badge border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300' }, icon('alertTriangle', 'size-3'), t('billing.overdue'));
}

export function renderBilling(): PageInstance {
  const store = getStore();
  const lang = store.getState().settings.lang;
  const contentHost = h('div', { class: 'space-y-5' });

  async function requestPlanChange(planId: PlanId): Promise<void> {
    const confirmed = await openDialog({
      title: t('billing.confirmChangeTitle'),
      description: t('billing.confirmChangeText', { plan: planName(planId) }),
      confirmLabel: t('billing.choosePlan'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;
    const result = store.changePlan(planId, getCsrfToken());
    if (!result.ok) {
      toast('error', t('errors.generic'));
      return;
    }
    toast('success', t('billing.changeDone', { plan: planName(planId) }));
    renderContent();
  }

  function renderContent(): void {
    const state = store.getState();
    const plan = getPlan(state.planId);
    const servers = state.servers;
    const renewsAt = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    const nextInvoice = state.invoices.find((invoice) => invoice.status === 'pending' || invoice.status === 'overdue');

    const exportInvoices = (): void => {
      downloadCsv(`vps-panel-invoices-${new Date().toISOString().slice(0, 10)}.csv`, [
        [t('billing.invoiceNumber'), t('billing.invoiceDate'), t('billing.invoicePlan'), t('billing.invoiceAmount'), t('billing.invoiceStatus')],
        ...state.invoices.map((invoice) => [
          invoice.number,
          formatDate(invoice.issuedAt, 'en'),
          planName(invoice.planId),
          invoice.amountUsd,
          t(`billing.${invoice.status}`),
        ]),
      ]);
      toast('success', t('billing.exportDone', { count: formatNumber(state.invoices.length, lang) }));
    };

    const totalVcpu = servers.reduce((sum, server) => sum + server.cpuCores, 0);
    const totalBandwidth = servers.reduce((sum, server) => sum + server.bandwidthTb, 0);
    const totalDisk = servers.reduce((sum, server) => sum + server.diskGb, 0);
    const cpuTotal = totalVcpu * 720;
    const cpuUsed = Math.round(cpuTotal * 0.34);
    const bandwidthUsed = Number((totalBandwidth * 0.42).toFixed(1));
    const storageUsed = Math.round(totalDisk * 0.63);

    const usageBar = (label: string, used: number, total: number, unit: string, color: string): HTMLElement => {
      const percent = percentOf(used, total);
      return h(
        'div',
        null,
        h(
          'div',
          { class: 'flex items-center justify-between gap-2 text-[11px]' },
          h('span', { class: 'font-semibold' }, label),
          h('span', { class: 'soft tabular-nums' }, t('billing.usedOf', { used: `${formatNumber(used, lang)} ${unit}`, total: `${formatNumber(total, lang)} ${unit}` })),
        ),
        h(
          'div',
          { class: 'mt-1.5 h-2 overflow-hidden rounded-full', style: 'background-color: var(--surface-3);' },
          h('div', { class: 'h-full rounded-full', style: `width:${percent}%; background-color:${color};` }),
        ),
      );
    };

    const monthLabels: string[] = [];
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(Date.now() - index * 30 * 24 * 60 * 60 * 1000);
      monthLabels.push(new Intl.DateTimeFormat(localeFor(lang), { month: 'short' }).format(date));
    }
    const usageSeries = buildSeries('billing-bandwidth', {
      base: Math.max(1.2, totalBandwidth * 0.3),
      amplitude: Math.max(0.3, totalBandwidth * 0.06),
      noise: Math.max(0.1, totalBandwidth * 0.03),
      count: 6,
      min: 0,
      max: Math.max(8, totalBandwidth),
    });

    const currentCard = sectionCard({
      title: t('billing.currentPlan'),
      subtitle: t('billing.subscriptionNote'),
      action: demoBadge(),
      body: [
        h(
          'div',
          { class: 'flex flex-wrap items-end justify-between gap-3' },
          h('div', null, h('p', { class: 'text-2xl font-extrabold' }, planName(plan.id)), h('p', { class: 'muted mt-0.5 text-xs' }, planDescription(plan.id))),
          h('p', { class: 'text-2xl font-extrabold text-brand-600 tabular-nums' }, formatMoney(plan.priceUsd, lang), h('span', { class: 'text-xs font-semibold muted' }, t('common.perMonth'))),
        ),
        h(
          'dl',
          { class: 'mt-4 grid grid-cols-2 gap-3 text-xs' },
          h('div', null, h('dt', { class: 'soft text-[10px]' }, t('billing.renews')), h('dd', { class: 'mt-0.5 font-semibold' }, formatDate(renewsAt, lang))),
          h('div', null, h('dt', { class: 'soft text-[10px]' }, t('billing.demoServers')), h('dd', { class: 'mt-0.5 font-semibold' }, formatNumber(servers.length, lang))),
        ),
        h(
          'div',
          { class: 'mt-3 flex flex-wrap gap-1.5' },
          h('span', { class: 'chip' }, `${formatNumber(plan.vcpu, lang)} vCPU`),
          h('span', { class: 'chip' }, `${formatNumber(plan.ramGb, lang)} GB`),
          h('span', { class: 'chip' }, `${formatNumber(plan.diskGb, lang)} GB`),
          h('span', { class: 'chip' }, `${formatNumber(plan.bandwidthTb, lang)} TB`),
        ),
        h('div', { class: 'mt-4' }, h('a', { href: '#/servers/new', class: 'btn btn-secondary btn-sm' }, icon('plus', 'size-3.5'), t('dashboard.quickCreate'))),
      ],
    });

    const invoiceCard = sectionCard({
      title: t('billing.nextInvoice'),
      action: simulatedBadge(),
      body: [
        h('p', { class: 'soft text-[10px] font-semibold uppercase' }, nextInvoice?.number ?? 'INV-DEMO'),
        h('p', { class: 'mt-1 text-2xl font-extrabold tabular-nums' }, formatMoney(nextInvoice?.amountUsd ?? plan.priceUsd, lang)),
        h('p', { class: 'muted mt-1 text-xs' }, `${t('billing.renews')} ${formatDate(renewsAt, lang)}`),
        h('div', { class: 'my-3 border-t', style: 'border-color: var(--line);' }),
        h('p', { class: 'soft text-[10px] font-semibold uppercase' }, t('billing.paymentMethod')),
        h('p', { class: 'mt-1 flex items-center gap-2 text-xs font-semibold' }, icon('creditCard', 'size-4 text-brand-600'), t('billing.demoCard')),
        h('p', { class: 'soft mt-2 text-[10px] leading-5' }, t('billing.notice')),
      ],
    });

    const usageCard = sectionCard({
      title: t('billing.usageTitle'),
      subtitle: t('billing.period'),
      body: [
        h('div', { class: 'space-y-3.5' },
          usageBar(t('billing.usageBarCpu'), cpuUsed, cpuTotal, t('common.hour'), 'var(--color-accent-500)'),
          usageBar(t('billing.usageBarBandwidth'), bandwidthUsed, Math.max(1, totalBandwidth), 'TB', 'var(--color-brand-500)'),
          usageBar(t('billing.usageBarStorage'), storageUsed, Math.max(1, totalDisk), 'GB', 'var(--color-amber-500)'),
        ),
        h('p', { class: 'soft mt-3 text-[10px] leading-5' }, t('billing.overageNote')),
      ],
    });

    const plansTable = sectionCard({
      title: t('billing.plansTitle'),
      subtitle: t('billing.plansText'),
      padded: false,
      body: [
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
                h('th', null, t('common.plan')),
                h('th', null, 'vCPU'),
                h('th', null, t('billing.ram')),
                h('th', null, t('billing.disk')),
                h('th', null, t('billing.bandwidth')),
                h('th', { class: 'text-end' }, t('common.amount')),
                h('th', { class: 'text-end' }, h('span', { class: 'sr-only' }, t('common.actions'))),
              ),
            ),
            h(
              'tbody',
              null,
              ...PLANS.map((entry) =>
                h(
                  'tr',
                  { style: entry.id === state.planId ? 'background-color: color-mix(in srgb, var(--color-brand-500) 5%, transparent);' : '' },
                  h(
                    'td',
                    null,
                    h(
                      'div',
                      { class: 'flex flex-wrap items-center gap-2' },
                      h('span', { class: 'text-sm font-bold' }, planName(entry.id)),
                      entry.popular ? h('span', { class: 'badge bg-accent-500/15 text-accent-700 dark:text-accent-300' }, t('billing.popular')) : null,
                      entry.id === state.planId ? h('span', { class: 'badge border-brand-500/30 bg-brand-500/10 text-brand-700 dark:text-brand-300' }, icon('check', 'size-3'), t('billing.current')) : null,
                      entry.rdp ? h('span', { class: 'badge border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' }, 'RDP') : null,
                    ),
                    h('p', { class: 'soft mt-0.5 text-[10px]' }, planDescription(entry.id)),
                  ),
                  h('td', { class: 'text-xs tabular-nums' }, formatNumber(entry.vcpu, lang)),
                  h('td', { class: 'text-xs tabular-nums' }, `${formatNumber(entry.ramGb, lang)} GB`),
                  h('td', { class: 'text-xs tabular-nums' }, `${formatNumber(entry.diskGb, lang)} GB`),
                  h('td', { class: 'text-xs tabular-nums' }, `${formatNumber(entry.bandwidthTb, lang)} TB`),
                  h('td', { class: 'text-end text-xs font-bold tabular-nums' }, formatMoney(entry.priceUsd, lang)),
                  h(
                    'td',
                    { class: 'text-end' },
                    entry.id === state.planId
                      ? h('button', { type: 'button', class: 'btn btn-secondary btn-sm', disabled: true }, t('billing.current'))
                      : h('button', { type: 'button', class: 'btn btn-primary btn-sm', onClick: () => void requestPlanChange(entry.id) }, t('billing.choosePlan')),
                  ),
                ),
              ),
            ),
          ),
        ),
        h('p', { class: 'soft px-5 pb-4 pt-3 text-[10px]' }, t('billing.subscriptionNote')),
        h(
          'ul',
          { class: 'divide-y md:hidden', style: 'border-color: var(--line);' },
          ...PLANS.map((entry) =>
            h(
              'li',
              { class: 'p-4' },
              h(
                'div',
                { class: 'flex flex-wrap items-center gap-2' },
                h('p', { class: 'text-sm font-bold' }, planName(entry.id)),
                entry.popular ? h('span', { class: 'badge bg-accent-500/15 text-accent-700 dark:text-accent-300' }, t('billing.popular')) : null,
                entry.id === state.planId ? h('span', { class: 'badge border-brand-500/30 bg-brand-500/10 text-brand-700 dark:text-brand-300' }, icon('check', 'size-3'), t('billing.current')) : null,
                entry.rdp ? h('span', { class: 'badge border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' }, 'RDP') : null,
              ),
              h('p', { class: 'muted mt-0.5 text-[10px]' }, planDescription(entry.id)),
              h(
                'div',
                { class: 'mt-2 flex flex-wrap gap-1.5' },
                h('span', { class: 'chip' }, `${formatNumber(entry.vcpu, lang)} vCPU`),
                h('span', { class: 'chip' }, `${formatNumber(entry.ramGb, lang)} GB`),
                h('span', { class: 'chip' }, `${formatNumber(entry.diskGb, lang)} GB`),
                h('span', { class: 'chip' }, `${formatNumber(entry.bandwidthTb, lang)} TB`),
              ),
              h(
                'div',
                { class: 'mt-3 flex items-center justify-between gap-2' },
                h('span', { class: 'text-lg font-extrabold tabular-nums' }, formatMoney(entry.priceUsd, lang), h('span', { class: 'text-[10px] font-semibold muted' }, t('common.perMonth'))),
                entry.id === state.planId
                  ? h('button', { type: 'button', class: 'btn btn-secondary btn-sm', disabled: true }, t('billing.current'))
                  : h('button', { type: 'button', class: 'btn btn-primary btn-sm', onClick: () => void requestPlanChange(entry.id) }, t('billing.choosePlan')),
              ),
            ),
          ),
        ),
      ],
    });

    const invoices = sectionCard({
      title: t('billing.invoicesTitle'),
      subtitle: t('billing.invoicesText'),
      action: h(
        'div',
        { class: 'flex flex-wrap items-center gap-2' },
        demoBadge(t('billing.demoInvoices')),
        h('button', { type: 'button', class: 'btn btn-secondary btn-sm', onClick: exportInvoices }, icon('download', 'size-3.5'), t('billing.exportCsv')),
      ),
      padded: false,
      body: [
        h(
          'div',
          { class: 'hidden overflow-x-auto md:block' },
          h(
            'table',
            { class: 'table min-w-[700px]' },
            h(
              'thead',
              null,
              h(
                'tr',
                null,
                h('th', null, t('billing.invoiceNumber')),
                h('th', null, t('billing.invoiceDate')),
                h('th', null, t('billing.invoicePlan')),
                h('th', { class: 'text-end' }, t('billing.invoiceAmount')),
                h('th', null, t('billing.invoiceStatus')),
                h('th', { class: 'text-end' }, h('span', { class: 'sr-only' }, t('common.actions'))),
              ),
            ),
            h(
              'tbody',
              null,
              ...state.invoices.map((invoice) =>
                h(
                  'tr',
                  null,
                  h('td', { class: 'font-mono text-xs font-semibold' }, invoice.number),
                  h('td', { class: 'text-xs' }, formatDate(invoice.issuedAt, lang)),
                  h('td', { class: 'text-xs' }, planName(invoice.planId)),
                  h('td', { class: 'text-end text-xs font-bold tabular-nums' }, formatMoney(invoice.amountUsd, lang)),
                  h('td', null, invoiceBadge(invoice.status)),
                  h(
                    'td',
                    { class: 'text-end' },
                    h(
                      'button',
                      {
                        type: 'button',
                        class: 'btn btn-ghost btn-sm',
                        title: t('billing.downloadInfo'),
                        onClick: () => toast('info', t('billing.downloadDemo')),
                      },
                      icon('download', 'size-3.5'),
                      t('billing.download'),
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
          ...state.invoices.map((invoice) =>
            h(
              'li',
              { class: 'p-4' },
              h(
                'div',
                { class: 'flex items-center justify-between gap-2' },
                h('p', { class: 'font-mono text-xs font-bold' }, invoice.number),
                invoiceBadge(invoice.status),
              ),
              h(
                'div',
                { class: 'mt-2 flex items-end justify-between gap-2' },
                h('div', null, h('p', { class: 'soft text-[10px]' }, t('billing.invoiceDate')), h('p', { class: 'text-xs font-semibold' }, formatDate(invoice.issuedAt, lang))),
                h('div', { class: 'text-end' }, h('p', { class: 'soft text-[10px]' }, t('billing.invoiceAmount')), h('p', { class: 'text-sm font-extrabold tabular-nums' }, formatMoney(invoice.amountUsd, lang))),
              ),
              h(
                'div',
                { class: 'mt-2 flex items-center justify-between' },
                h('span', { class: 'chip' }, planName(invoice.planId)),
                h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: () => toast('info', t('billing.downloadDemo')) }, icon('download', 'size-3.5'), t('billing.download')),
              ),
            ),
          ),
        ),
      ],
    });

    const usageChart = sectionCard({
      title: t('billing.bandwidthUsed'),
      subtitle: t('billing.usageText'),
      action: simulatedBadge(),
      body: [
        barChart(
          usageSeries.map((value, index) => ({
            label: monthLabels[index] ?? '',
            value,
            color: index === usageSeries.length - 1 ? 'var(--color-accent-500)' : 'var(--color-brand-500)',
          })),
          { lang, unit: ' TB', height: 130 },
        ),
        h('p', { class: 'soft mt-2 text-[10px] leading-5' }, t('billing.overageNote')),
      ],
    });

    replaceChildren(
      contentHost,
      h('div', { class: 'grid gap-4 lg:grid-cols-3' }, currentCard, invoiceCard, usageCard),
      plansTable,
      h('div', { class: 'grid gap-4 xl:grid-cols-3' }, h('div', { class: 'xl:col-span-2' }, invoices), h('div', null, usageChart)),
      notice({ tone: 'warning', title: t('demo.simulated'), text: t('billing.notice'), iconName: 'shieldCheck' }),
    );
  }

  const root = h(
    'div',
    null,
    pageHeader({
      title: t('billing.title'),
      subtitle: t('billing.subtitle'),
      actions: [h('a', { href: '#/servers', class: 'btn btn-secondary' }, icon('server', 'size-4'), t('nav.servers'))],
    }),
    contentHost,
  );

  renderContent();

  return { el: root, titleKey: 'billing.title' };
}

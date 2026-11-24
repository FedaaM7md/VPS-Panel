/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import type { PlanId, ServerStatus } from '../lib/types';
import { h } from './dom';
import { t } from '../i18n';
import { icon } from './icons';
import { planName } from './labels';

const STATUS_STYLE: Record<ServerStatus, { dot: string; badge: string }> = {
  running: { dot: 'var(--color-accent-500)', badge: 'bg-accent-500/10 text-accent-700 border-accent-500/25 dark:text-accent-300' },
  stopped: { dot: 'var(--color-slate-400)', badge: 'bg-slate-500/10 text-slate-600 border-slate-400/30 dark:text-slate-300' },
  rebooting: { dot: 'var(--color-amber-500)', badge: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300' },
  provisioning: { dot: 'var(--color-brand-500)', badge: 'bg-brand-500/10 text-brand-700 border-brand-500/30 dark:text-brand-300' },
};

export function statusBadge(status: ServerStatus): HTMLElement {
  const style = STATUS_STYLE[status];
  const pulse = status === 'rebooting' || status === 'provisioning' ? ' live-dot' : '';
  return h(
    'span',
    { class: `badge ${style.badge}` },
    h('span', { class: `size-1.5 rounded-full${pulse}`, style: `background-color:${style.dot}` }),
    t(`status.${status}`),
  );
}

export function demoBadge(label?: string): HTMLElement {
  return h(
    'span',
    { class: 'badge border-dashed border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
    icon('terminal', 'size-3.5'),
    label ?? t('common.demoTag'),
  );
}

export function simulatedBadge(label?: string): HTMLElement {
  return h(
    'span',
    { class: 'badge border-brand-500/20 bg-brand-500/10 text-brand-700 dark:text-brand-300' },
    icon('activity', 'size-3.5'),
    label ?? t('demo.simulated'),
  );
}

export function planBadge(planId: PlanId): HTMLElement {
  return h('span', { class: 'chip' }, icon('layers', 'size-3.5'), planName(planId));
}

export function rdpBadge(): HTMLElement {
  return h(
    'span',
    { class: 'badge border-brand-500/25 bg-brand-500/10 text-brand-700 dark:text-brand-300' },
    icon('monitor', 'size-3.5'),
    'RDP',
  );
}

export function warningBadge(label: string): HTMLElement {
  return h(
    'span',
    { class: 'badge border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
    icon('alertTriangle', 'size-3.5'),
    label,
  );
}

export function countBadge(count: number): HTMLElement {
  return h(
    'span',
    { class: 'inline-flex min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-[#041416]' },
    String(count),
  );
}

/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import type { Child } from './dom';
import { h } from './dom';
import type { IconName } from './icons';
import { icon } from './icons';
import { demoBadge } from './badges';

export interface SectionCardOptions {
  title?: string;
  subtitle?: string;
  action?: Node | null;
  body: Child[];
  class?: string;
  padded?: boolean;
  id?: string;
}

export function sectionCard(options: SectionCardOptions): HTMLElement {
  return h(
    'section',
    { class: `card ${options.class ?? ''}`, id: options.id },
    options.title || options.action
      ? h(
          'div',
          { class: 'flex flex-wrap items-start justify-between gap-3 px-5 pt-5' },
          h(
            'div',
            null,
            options.title ? h('h2', { class: 'text-base font-bold' }, options.title) : null,
            options.subtitle ? h('p', { class: 'muted mt-1 text-sm leading-6' }, options.subtitle) : null,
          ),
          options.action ?? null,
        )
      : null,
    h('div', { class: options.padded === false ? '' : 'p-5' }, ...options.body),
  );
}

export interface PageHeaderOptions {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: Array<Node | null>;
  back?: { label: string; href: string };
}

export function pageHeader(options: PageHeaderOptions): HTMLElement {
  return h(
    'header',
    { class: 'mb-6 flex flex-wrap items-end justify-between gap-4' },
    h(
      'div',
      { class: 'min-w-0' },
      options.back
        ? h(
            'a',
            { href: options.back.href, class: 'muted mb-2 inline-flex items-center gap-1.5 text-xs font-semibold hover:text-brand-600' },
            icon('arrowStart', 'size-3.5 flip-rtl'),
            options.back.label,
          )
        : null,
      options.eyebrow ? h('p', { class: 'mb-1 text-[11px] font-semibold text-brand-700 dark:text-brand-300' }, options.eyebrow) : null,
      h(
        'div',
        { class: 'flex flex-wrap items-center gap-2.5' },
        h('h1', { class: 'text-2xl font-extrabold tracking-tight sm:text-3xl' }, options.title),
        demoBadge(),
      ),
      options.subtitle ? h('p', { class: 'muted mt-2 max-w-2xl text-sm leading-6' }, options.subtitle) : null,
    ),
    options.actions && options.actions.length > 0
      ? h('div', { class: 'flex flex-wrap items-center gap-2' }, ...options.actions)
      : null,
  );
}

export interface EmptyStateOptions {
  icon?: IconName;
  title: string;
  text?: string;
  action?: Node | null;
}

export function emptyState(options: EmptyStateOptions): HTMLElement {
  return h(
    'div',
    { class: 'flex flex-col items-center justify-center px-4 py-10 text-center' },
    h(
      'div',
      { class: 'mb-3 flex size-12 items-center justify-center rounded-md border border-dashed', style: 'border-color: var(--line-strong); color: var(--ink-soft);' },
      icon(options.icon ?? 'server', 'size-6'),
    ),
    h('p', { class: 'text-sm font-semibold' }, options.title),
    options.text ? h('p', { class: 'muted mt-1.5 max-w-md text-xs leading-6' }, options.text) : null,
    options.action ? h('div', { class: 'mt-4' }, options.action) : null,
  );
}

export interface NoticeOptions {
  tone?: 'info' | 'warning' | 'success';
  title: string;
  text?: string;
  iconName?: IconName;
  action?: Node | null;
}

const NOTICE_TONE = {
  info: 'border-brand-500/20 bg-brand-500/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  success: 'border-accent-500/25 bg-accent-500/5',
} as const;

export function notice(options: NoticeOptions): HTMLElement {
  const tone = NOTICE_TONE[options.tone ?? 'info'];
  return h(
    'div',
    { class: `flex items-start gap-3 rounded-xl border p-3.5 ${tone}` },
    h(
      'span',
      { class: options.tone === 'warning' ? 'mt-0.5 text-amber-600' : options.tone === 'success' ? 'mt-0.5 text-accent-600' : 'mt-0.5 text-brand-600' },
      icon(options.iconName ?? 'info', 'size-5'),
    ),
    h(
      'div',
      { class: 'min-w-0 flex-1' },
      h('p', { class: 'text-sm font-semibold' }, options.title),
      options.text ? h('p', { class: 'muted mt-0.5 text-xs leading-6' }, options.text) : null,
      options.action ? h('div', { class: 'mt-2' }, options.action) : null,
    ),
  );
}

export function infoItem(label: string, value: string | Node, mono = false): HTMLElement {
  return h(
    'div',
    { class: 'min-w-0' },
    h('dt', { class: 'soft text-[11px] font-semibold uppercase' }, label),
    h('dd', { class: `mt-1 truncate text-sm font-semibold ${mono ? 'font-mono text-[13px]' : ''}`, title: typeof value === 'string' ? value : undefined }, value),
  );
}

export function statTile(options: {
  label: string;
  value: string;
  hint?: string;
  iconName: IconName;
  accent?: 'brand' | 'accent' | 'amber';
  chart?: Node;
}): HTMLElement {
  const accent = options.accent ?? 'brand';
  const accentClass = accent === 'accent' ? 'text-accent-600 bg-accent-500/10' : accent === 'amber' ? 'text-amber-600 bg-amber-500/10' : 'text-brand-600 bg-brand-500/10';
  return h(
    'div',
    { class: 'card card-hover p-4' },
    h(
      'div',
      { class: 'flex items-start justify-between gap-3' },
      h(
        'div',
        { class: 'min-w-0' },
        h('p', { class: 'muted text-xs font-semibold' }, options.label),
        h('p', { class: 'mt-1 text-2xl font-extrabold tabular-nums' }, options.value),
        options.hint ? h('p', { class: 'soft mt-1 text-[11px]' }, options.hint) : null,
      ),
      h('span', { class: `flex size-9 shrink-0 items-center justify-center rounded-xl ${accentClass}` }, icon(options.iconName, 'size-4.5')),
    ),
    options.chart ? h('div', { class: 'mt-3 h-10' }, options.chart) : null,
  );
}

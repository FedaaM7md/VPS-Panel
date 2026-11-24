/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import type { Lang } from './types';
import { translate } from '../i18n';

/** Latin digits keep technical values unambiguous in both languages. */
export function localeFor(lang: Lang): string {
  return lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US';
}

export function formatNumber(value: number, lang: Lang, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(localeFor(lang), options).format(value);
}

export function formatMoney(usd: number, lang: Lang): string {
  return new Intl.NumberFormat(localeFor(lang), {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
}

export function formatPercent(value: number, lang: Lang, fractionDigits = 0): string {
  const rounded = formatNumber(value, lang, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${rounded}%`;
}

export function formatDate(iso: string, lang: Lang): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(localeFor(lang), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(iso: string, lang: Lang): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(localeFor(lang), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRelative(iso: string, lang: Lang, nowMs: number = Date.now()): string {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return '—';
  const diffSeconds = (target - nowMs) / 1000;
  const abs = Math.abs(diffSeconds);

  if (abs < 45) return translate(lang, 'time.justNow');

  const rtf = new Intl.RelativeTimeFormat(localeFor(lang), { numeric: 'auto' });
  const divisions: ReadonlyArray<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { amount: 60, unit: 'second' },
    { amount: 60, unit: 'minute' },
    { amount: 24, unit: 'hour' },
    { amount: 7, unit: 'day' },
    { amount: 4.348, unit: 'week' },
    { amount: 12, unit: 'month' },
  ];

  let value = diffSeconds;
  for (const division of divisions) {
    if (Math.abs(value) < division.amount) {
      return rtf.format(Math.round(value), division.unit);
    }
    value /= division.amount;
  }
  return rtf.format(Math.round(value), 'year');
}

export function formatUptime(totalMinutes: number, lang: Lang): string {
  const safe = Math.max(0, Math.floor(totalMinutes));
  const days = Math.floor(safe / 1440);
  const hours = Math.floor((safe % 1440) / 60);
  const minutes = safe % 60;
  if (lang === 'ar') {
    if (days > 0) return `${formatNumber(days, lang)} ي ${formatNumber(hours, lang)} س`;
    if (hours > 0) return `${formatNumber(hours, lang)} س ${formatNumber(minutes, lang)} د`;
    return `${formatNumber(minutes, lang)} د`;
  }
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatStorage(gb: number, lang: Lang): string {
  if (gb >= 1000) {
    const tb = gb / 1000;
    return `${formatNumber(tb, lang, { maximumFractionDigits: 1 })} TB`;
  }
  return `${formatNumber(gb, lang, { maximumFractionDigits: 0 })} GB`;
}

export function formatBandwidth(tb: number, lang: Lang): string {
  return `${formatNumber(tb, lang, { maximumFractionDigits: 0 })} TB`;
}

export function formatLatency(ms: number, lang: Lang): string {
  return `${formatNumber(ms, lang)} ms`;
}

export function maxValue(values: readonly number[]): number {
  return values.reduce((max, value) => (value > max ? value : max), 0);
}

export function minValue(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((min, value) => (value < min ? value : min), values[0] ?? 0);
}

export function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function percentOf(used: number, total: number): number {
  if (total <= 0) return 0;
  return clamp((used / total) * 100, 0, 100);
}

export function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function pluralizeCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}

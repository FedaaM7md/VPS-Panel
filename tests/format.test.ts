/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { describe, expect, it } from 'vitest';
import {
  average,
  clamp,
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
  formatRelative,
  formatStorage,
  formatUptime,
  initials,
  maxValue,
  minValue,
  percentOf,
  pluralizeCount,
  truncate,
} from '../src/lib/format';

describe('formatting helpers', () => {
  it('formats numbers with Latin digits in both locales', () => {
    expect(formatNumber(1234, 'en')).toBe('1,234');
    const arabic = formatNumber(1234, 'ar');
    expect(arabic).toContain('1');
    expect(/[٠-٩]/.test(arabic)).toBe(false);
  });

  it('formats USD amounts', () => {
    expect(formatMoney(24, 'en')).toContain('24.00');
    expect(formatMoney(24, 'en')).toContain('$');
    expect(formatMoney(24, 'ar')).toContain('24.00');
  });

  it('formats percentages', () => {
    expect(formatPercent(72.5, 'en', 1)).toBe('72.5%');
    expect(formatPercent(0, 'en')).toBe('0%');
  });

  it('formats dates and times safely', () => {
    expect(formatDate('2026-11-23T12:34:00.000Z', 'en')).toContain('2026');
    expect(formatDateTime('2026-11-23T12:34:00.000Z', 'en')).toContain('2026');
    expect(formatDate('not-a-date', 'en')).toBe('—');
    expect(formatDate('2026-11-23T12:34:00.000Z', 'ar')).not.toBe('—');
  });

  it('formats relative times deterministically', () => {
    const now = Date.UTC(2026, 10, 23, 12, 0, 0);
    expect(formatRelative(new Date(now).toISOString(), 'en', now)).toBe('just now');
    expect(formatRelative(new Date(now - 5 * 60_000).toISOString(), 'en', now)).toBe('5 minutes ago');
    expect(formatRelative(new Date(now + 2 * 60 * 60_000).toISOString(), 'en', now)).toBe('in 2 hours');
    expect(formatRelative(new Date(now).toISOString(), 'ar', now)).toBe('الآن');
  });

  it('formats uptime in both languages', () => {
    expect(formatUptime(1500, 'en')).toBe('1d 1h');
    expect(formatUptime(90, 'en')).toBe('1h 30m');
    expect(formatUptime(30, 'en')).toBe('30m');
    expect(formatUptime(1500, 'ar')).toMatch(/[يس]/);
  });

  it('formats storage with a TB threshold', () => {
    expect(formatStorage(1500, 'en')).toBe('1.5 TB');
    expect(formatStorage(80, 'en')).toBe('80 GB');
  });

  it('handles small numeric helpers', () => {
    expect(clamp(120, 0, 100)).toBe(100);
    expect(clamp(-3, 0, 100)).toBe(0);
    expect(percentOf(50, 200)).toBe(25);
    expect(percentOf(10, 0)).toBe(0);
    expect(average([2, 4, 6])).toBe(4);
    expect(average([])).toBe(0);
    expect(maxValue([3, 9, 2])).toBe(9);
    expect(minValue([3, 9, 2])).toBe(2);
    expect(initials('Omar El-Sayed')).toBe('OE');
    expect(initials('')).toBe('?');
    expect(pluralizeCount(1, 'server', 'servers')).toBe('1 server');
    expect(pluralizeCount(2, 'server', 'servers')).toBe('2 servers');
    expect(truncate('abcdefghij', 6)).toBe('abcde…');
    expect(truncate('abc', 6)).toBe('abc');
  });
});

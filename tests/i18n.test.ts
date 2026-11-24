/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { afterEach, describe, expect, it } from 'vitest';
import { ar } from '../src/i18n/ar';
import { en, flattenMessages } from '../src/i18n/en';
import {
  getLanguage,
  getMessages,
  hasMessage,
  interpolate,
  placeholdersOf,
  setLanguage,
  t,
  tm,
  translate,
} from '../src/i18n';

const arMessages = flattenMessages(ar);
const enMessages = flattenMessages(en);

describe('translation dictionary', () => {
  it('has exactly the same keys in Arabic and English', () => {
    expect(Object.keys(arMessages).sort()).toEqual(Object.keys(enMessages).sort());
  });

  it('contains no empty or untranslated placeholder values', () => {
    for (const [key, value] of Object.entries(enMessages)) {
      expect(value.trim(), key).not.toBe('');
      expect(value, key).not.toBe(key);
    }
    for (const [key, value] of Object.entries(arMessages)) {
      expect(value.trim(), key).not.toBe('');
      expect(value, key).not.toBe(key);
    }
  });

  it('uses identical interpolation placeholders in both languages', () => {
    for (const key of Object.keys(enMessages)) {
      expect(placeholdersOf(arMessages[key] ?? ''), key).toEqual(placeholdersOf(enMessages[key] ?? ''));
    }
  });

  it('actually localises the interface (most keys differ)', () => {
    const keys = Object.keys(enMessages);
    const differing = keys.filter((key) => enMessages[key] !== arMessages[key]);
    expect(differing.length / keys.length).toBeGreaterThan(0.75);
  });

  it('interpolates parameters and leaves unknown placeholders untouched', () => {
    expect(interpolate('Hello {{name}}, {{count}} servers', { name: 'Omar', count: 3 })).toBe('Hello Omar, 3 servers');
    expect(interpolate('Value: {{missing}}', {})).toBe('Value: {{missing}}');
  });

  it('translates keys and falls back to the key for dynamic input', () => {
    expect(translate('en', 'common.save')).toBe('Save');
    expect(translate('ar', 'common.save')).toBe('حفظ');
    expect(tm('does.not.exist')).toBe('does.not.exist');
    expect(hasMessage('status.running', 'en')).toBe(true);
    expect(hasMessage('status.unknown', 'en')).toBe(false);
  });

  it('tracks language and document direction', () => {
    setLanguage('en');
    expect(getLanguage()).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
    expect(t('common.save')).toBe('Save');
    expect(getMessages('ar')['common.save']).toBe('حفظ');

    setLanguage('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(t('common.save')).toBe('حفظ');
  });
});

afterEach(() => {
  setLanguage('ar');
});

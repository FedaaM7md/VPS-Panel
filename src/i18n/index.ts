/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import type { Direction, Lang } from '../lib/types';
import { ar } from './ar';
import { en, flattenMessages, type Dictionary, type MessageKey } from './en';

export type { MessageKey };

export const SUPPORTED_LANGS: readonly Lang[] = ['ar', 'en'];

const dictionaries: Record<Lang, Dictionary> = { ar, en };
const flatCache = new Map<Lang, Record<string, string>>();

let currentLang: Lang = 'ar';

function flat(lang: Lang): Record<string, string> {
  let cached = flatCache.get(lang);
  if (!cached) {
    cached = flattenMessages(dictionaries[lang]);
    flatCache.set(lang, cached);
  }
  return cached;
}

export function dirFor(lang: Lang): Direction {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

export function isLang(value: unknown): value is Lang {
  return value === 'ar' || value === 'en';
}

export function setLanguage(lang: Lang): void {
  currentLang = lang;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.documentElement.dir = dirFor(lang);
  }
}

export function getLanguage(): Lang {
  return currentLang;
}

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/** Translate a compile-time-checked message key. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  return tm(key, params);
}

/** Translate a dynamic key (e.g. a validator error code), falling back to the key. */
export function tm(key: string, params?: Record<string, string | number>): string {
  const value = flat(currentLang)[key];
  if (value === undefined) return key;
  return interpolate(value, params);
}

/** Translate explicitly in a given language (used by tests and formatting helpers). */
export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  const value = flat(lang)[key];
  if (value === undefined) return key;
  return interpolate(value, params);
}

export function getMessages(lang: Lang): Record<string, string> {
  return flat(lang);
}

export function hasMessage(key: string, lang: Lang = currentLang): boolean {
  return flat(lang)[key] !== undefined;
}

/** Placeholders in a message, used by the i18n parity test. */
export function placeholdersOf(template: string): string[] {
  const found: string[] = [];
  for (const match of template.matchAll(/\{\{(\w+)\}\}/g)) {
    if (match[1]) found.push(match[1]);
  }
  return found.sort();
}

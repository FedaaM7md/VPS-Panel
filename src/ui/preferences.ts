/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { getStore } from '../state/store';
import { getCsrfToken } from '../lib/csrf';
import { setLanguage } from '../i18n';
import { navigate } from '../lib/navigation';
import type { Lang, Theme } from '../lib/types';

const META_THEME: Record<Theme, string> = { light: '#F2F4F7', dark: '#10151F' };

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = META_THEME[theme];
}

export function applyLanguage(lang: Lang): void {
  setLanguage(lang);
}

export function changeLanguage(lang: Lang): void {
  const store = getStore();
  const session = store.getState().session;
  const ok = store.setLanguage(lang, session ? getCsrfToken() : null);
  if (!ok) return;
  setLanguage(lang);
  navigate(currentRouteWithHash(), { replace: true, force: true });
}

export function changeTheme(theme: Theme): void {
  const store = getStore();
  const session = store.getState().session;
  const ok = store.setTheme(theme, session ? getCsrfToken() : null);
  if (!ok) return;
  applyTheme(theme);
  // The toggle's own label and icon are re-rendered by the shell refresh.
  document.dispatchEvent(new CustomEvent('vpspanel:theme', { detail: theme }));
}

export function toggleTheme(): void {
  const store = getStore();
  const next: Theme = store.getState().settings.theme === 'dark' ? 'light' : 'dark';
  changeTheme(next);
}

function currentRouteWithHash(): string {
  const hash = window.location.hash;
  if (!hash || hash === '#') return '/dashboard';
  return hash.replace(/^#/, '');
}

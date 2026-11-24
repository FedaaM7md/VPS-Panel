/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import type { MessageKey } from '../i18n';
import { t } from '../i18n';
import { getStore } from '../state/store';
import { getCsrfToken } from '../lib/csrf';
import { navigate, refreshRoute } from '../lib/navigation';
import { formatRelative, initials } from '../lib/format';
import type { Alert, Theme } from '../lib/types';
import { APP_VERSION } from '../lib/types';
import { changeLanguage, toggleTheme } from './preferences';
import { focusableWithin, h, replaceChildren, s } from './dom';
import { icon } from './icons';
import { toast } from './toast';
import { alertContent, alertIcon, severityLabel } from './labels';
import { countBadge } from './badges';

/**
 * Original mark: a rack stack inside a shield. Three 1U units carry status
 * LEDs; the shield outline makes it read at favicon size.
 */
export function brandMark(className = 'size-9'): SVGSVGElement {
  const svg = s('svg', {
    viewBox: '0 0 48 48',
    class: className,
    'aria-hidden': 'true',
    focusable: 'false',
  });

  svg.appendChild(
    s('path', {
      d: 'M24 3.2 41 8.7v13.6c0 10.4-7.1 18.9-17 23.5C14.1 41.2 7 32.7 7 22.3V8.7L24 3.2Z',
      fill: '#0b1018',
      stroke: '#00c2d1',
      'stroke-width': '1.8',
      'stroke-linejoin': 'round',
    }),
  );

  const rows = [14, 21, 28];
  rows.forEach((y, index) => {
    svg.appendChild(
      s('rect', {
        x: '13',
        y: String(y),
        width: '22',
        height: '4',
        rx: '1',
        fill: index === 0 ? '#00c2d1' : '#1f2c3d',
        stroke: index === 0 ? 'none' : '#3a475b',
        'stroke-width': '0.8',
      }),
    );
    svg.appendChild(
      s('rect', { x: '15', y: String(y + 1.2), width: '8', height: '1.6', rx: '0.8', fill: index === 0 ? '#08343a' : '#8a99ad', opacity: '0.55' }),
    );
    svg.appendChild(
      s('circle', {
        cx: '32',
        cy: String(y + 2),
        r: '0.9',
        fill: index === 0 ? '#22c55e' : index === 1 ? '#00c2d1' : '#8a99ad',
      }),
    );
  });

  svg.appendChild(s('path', { d: 'M24 36v4', stroke: '#8a99ad', 'stroke-width': '1.4', 'stroke-linecap': 'round' }));

  return svg;
}

function brandWordmark(): HTMLElement {
  return h(
    'span',
    { class: 'min-w-0 leading-tight' },
    h(
      'span',
      { class: 'block truncate text-[15px] font-bold tracking-tight text-white' },
      'VPS ',
      h('span', { class: 'font-mono text-[12px] font-medium tracking-[0.18em] text-brand-300' }, 'PANEL'),
    ),
    h(
      'span',
      { class: 'mt-0.5 block truncate text-[10px] font-medium', style: 'color: var(--sidebar-muted);' },
      t('app.tagline'),
    ),
  );
}

/**
 * A quiet, language-specific concept badge. Public pages use only this;
 * signed-in console screens add the demo-mode line.
 */
export function conceptRail(): HTMLElement {
  return h(
    'div',
    { class: 'demo-rail no-print sticky top-0 z-50 h-8 shrink-0', role: 'note', 'aria-label': t('demo.conceptBadge') },
    h(
      'div',
      { class: 'mx-auto flex h-full max-w-[1600px] items-center justify-center gap-2 px-2' },
      h('span', { class: 'live-dot size-1.5 shrink-0 rounded-full', style: 'background-color:#00c2d1' }),
      h(
        'span',
        { class: 'badge max-w-full truncate border-brand-500/40 bg-brand-500/10 text-brand-200' },
        t('demo.conceptBadge'),
      ),
    ),
  );
}

export function demoRail(): HTMLElement {
  return h(
    'div',
    { class: 'demo-rail no-print sticky top-0 z-50 h-8 shrink-0', role: 'note', 'aria-label': t('demo.modeBanner') },
    h(
      'div',
      { class: 'mx-auto flex h-full max-w-[1600px] items-center justify-center gap-2 px-2 sm:gap-3' },
      h('span', { class: 'live-dot size-1.5 shrink-0 rounded-full', style: 'background-color:#00c2d1' }),
      h(
        'span',
        { class: 'badge max-w-[70%] truncate border-brand-500/40 bg-brand-500/10 text-brand-200 sm:max-w-none' },
        t('demo.conceptBadge'),
      ),
      h('span', { class: 'h-3 w-px shrink-0 bg-white/20' }),
      h('span', { class: 'truncate text-[10px] sm:hidden' }, t('demo.modeShort')),
      h('span', { class: 'hidden truncate text-[10px] sm:inline' }, t('demo.modeBanner')),
    ),
  );
}

export function footerLinks(): HTMLElement {
  return h(
    'nav',
    { class: 'flex flex-wrap items-center gap-x-3 gap-y-1', 'aria-label': t('public.navLabel') },
    ...([
      ['/about', 'footer.about'],
      ['/help', 'footer.help'],
      ['/privacy', 'footer.privacy'],
      ['/terms', 'footer.terms'],
      ['/changelog', 'footer.changelog'],
    ] as const).map(([href, key]) =>
      h('a', { href: `#${href}`, class: 'hover:text-brand-600 hover:underline' }, t(key)),
    ),
  );
}

export function ownerCredit(): HTMLElement {
  return h(
    'a',
    {
      href: 'https://fedaamohamed.com',
      rel: 'noopener',
      class: 'hover:text-brand-600 hover:underline',
    },
    t('footer.credit'),
  );
}

interface NavItem {
  href: string;
  label: MessageKey;
  iconName: Parameters<typeof icon>[0];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'nav.dashboard', iconName: 'dashboard' },
  { href: '/servers', label: 'nav.servers', iconName: 'server' },
  { href: '/billing', label: 'nav.billing', iconName: 'creditCard' },
  { href: '/settings', label: 'nav.settings', iconName: 'settings' },
];

function isNavActive(path: string, href: string): boolean {
  if (href === '/servers') return path === '/servers' || (path.startsWith('/servers/') && path !== '/servers/new');
  return path === href;
}

function logout(): void {
  getStore().logout();
  navigate('/login');
  toast('info', t('auth.loggedOut'));
}

function displayName(session: { name: string; isGuest: boolean } | null): string {
  if (!session) return t('auth.guestName');
  return session.isGuest ? t('auth.guestName') : session.name;
}

function userAvatar(name: string): HTMLElement {
  return h(
    'span',
    {
      class: 'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white',
      style: 'background-color: #263244; border: 1px solid #3a475b; color: #67e8f0;',
      'aria-hidden': 'true',
    },
    initials(name),
  );
}

function sidebarInner(activePath: string, options: { mobile?: boolean; onNavigate?: () => void } = {}): HTMLElement {
  const state = getStore().getState();
  const session = state.session;
  const name = displayName(session);

  return h(
    'div',
    { class: 'flex h-full min-h-0 flex-col' },
    h(
      'div',
      { class: `flex items-center gap-2.5 border-b border-white/10 px-4 ${options.mobile ? 'h-16' : 'h-[70px]'}` },
      h('a', { href: '#/dashboard', class: 'flex min-w-0 items-center gap-2.5', 'aria-label': t('app.name'), onClick: options.onNavigate }, brandMark('size-9 shrink-0'), brandWordmark()),
      options.mobile
        ? h(
            'button',
            { type: 'button', class: 'ms-auto inline-flex size-8 items-center justify-center rounded-lg text-sidebar-muted hover:bg-white/10 hover:text-white', 'aria-label': t('nav.closeMenu'), onClick: options.onNavigate },
            icon('x'),
          )
        : null,
    ),
    h(
      'nav',
      { class: 'flex-1 overflow-y-auto scrollbar-none px-3 py-4', 'aria-label': t('nav.main') },
      h('p', { class: 'mb-2 px-3 text-[10px] font-bold uppercase', style: 'color: var(--sidebar-muted);' }, t('nav.main')),
      h(
        'div',
        { class: 'space-y-1' },
        ...NAV_ITEMS.slice(0, 3).map((item) =>
          h(
            'a',
            {
              href: `#${item.href}`,
              class: 'nav-link',
              'aria-current': isNavActive(activePath, item.href) ? 'page' : undefined,
              onClick: options.onNavigate,
            },
            icon(item.iconName, 'size-[18px] shrink-0'),
            h('span', null, t(item.label)),
          ),
        ),
      ),
      h(
        'a',
        {
          href: '#/servers/new',
          class: `mt-4 flex w-full items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold text-[#041416] transition-colors ${activePath === '/servers/new' ? 'bg-brand-400' : 'bg-brand-500 hover:bg-brand-400'}`,
          onClick: options.onNavigate,
          'aria-current': activePath === '/servers/new' ? 'page' : undefined,
        },
        icon('plus', 'size-4'),
        t('nav.createServer'),
      ),
      h('div', { class: 'my-4 border-t border-white/10' }),
      h(
        'div',
        { class: 'space-y-1' },
        ...NAV_ITEMS.slice(3).map((item) =>
          h(
            'a',
            {
              href: `#${item.href}`,
              class: 'nav-link',
              'aria-current': isNavActive(activePath, item.href) ? 'page' : undefined,
              onClick: options.onNavigate,
            },
            icon(item.iconName, 'size-[18px] shrink-0'),
            h('span', null, t(item.label)),
          ),
        ),
      ),
      h(
        'div',
        { class: 'mt-5 rounded border border-white/10 bg-white/[0.03] p-3' },
        h('div', { class: 'flex items-center gap-2 text-[11px] font-bold text-brand-300' }, icon('shieldCheck', 'size-4'), t('demo.modeShort')),
        h('p', { class: 'mt-1.5 text-[10px] leading-5', style: 'color: var(--sidebar-muted);' }, t('demo.resetHint')),
      ),
    ),
    h(
      'div',
      { class: 'border-t border-white/10 p-3' },
      h(
        'div',
        { class: 'flex items-center gap-2.5 rounded-md p-1.5' },
        userAvatar(name),
        h(
          'div',
          { class: 'min-w-0 flex-1' },
          h('p', { class: 'truncate text-xs font-bold text-white' }, name),
          h('p', { class: 'truncate text-[10px]', style: 'color: var(--sidebar-muted);' }, session?.email ?? ''),
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-muted hover:bg-white/10 hover:text-white',
            'aria-label': t('common.logout'),
            title: t('common.logout'),
            onClick: () => {
              options.onNavigate?.();
              logout();
            },
          },
          icon('logout', 'size-4'),
        ),
      ),
    ),
  );
}

function buildPopover(trigger: HTMLElement, panel: HTMLElement): HTMLElement {
  const wrapper = h('div', { class: 'relative' }, trigger, panel);
  panel.classList.add('card', 'absolute', 'end-0', 'top-[calc(100%+8px)]', 'z-50', 'hidden', 'w-[min(21rem,calc(100vw-2rem))]', 'p-2');
  panel.setAttribute('role', 'dialog');

  const close = (): void => {
    panel.classList.add('hidden');
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutside, true);
  };

  const onOutside = (event: PointerEvent): void => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (panel.contains(target) || trigger.contains(target)) return;
    close();
  };

  const open = (): void => {
    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
      panel.classList.remove('hidden');
      trigger.setAttribute('aria-expanded', 'true');
      window.setTimeout(() => document.addEventListener('pointerdown', onOutside, true), 0);
    } else {
      close();
    }
  };

  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.addEventListener('click', open);
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
  return wrapper;
}

function alertsPopover(): HTMLElement {
  const store = getStore();
  const state = store.getState();
  const unread = state.alerts.filter((alert) => !alert.read);
  const openCount = unread.length;

  const panel = h(
    'div',
    { class: 'w-full', 'aria-label': t('alerts.panelTitle') },
    h(
      'div',
      { class: 'flex items-center justify-between gap-2 px-2 py-1.5' },
      h('p', { class: 'text-sm font-bold' }, t('alerts.panelTitle')),
      openCount > 0
        ? h(
            'button',
            {
              type: 'button',
              class: 'text-[11px] font-semibold text-brand-600 hover:underline',
              onClick: () => {
                store.markAllAlertsRead(getCsrfToken());
                toast('success', t('alerts.allRead'));
                refreshRoute();
              },
            },
            t('alerts.markAllRead'),
          )
        : null,
    ),
    h(
      'ul',
      { class: 'max-h-80 divide-y overflow-y-auto', style: 'border-color: var(--line);' },
      ...(unread.length > 0
        ? unread.slice(0, 5).map((alert: Alert) => {
            const content = alertContent(alert, state);
            return h(
              'li',
              null,
              h(
                'button',
                {
                  type: 'button',
                  class: 'flex w-full items-start gap-2.5 rounded-lg px-2 py-2.5 text-start hover:bg-[color:var(--surface-3)]',
                  onClick: () => {
                    store.markAlertRead(alert.id, getCsrfToken());
                    navigate(content.href);
                  },
                },
                h('span', { class: 'mt-0.5 text-amber-600' }, icon(alertIcon(alert.code), 'size-4')),
                h(
                  'span',
                  { class: 'min-w-0 flex-1' },
                  h('span', { class: 'block text-xs font-semibold leading-5' }, content.title),
                  h('span', { class: 'soft mt-0.5 block text-[10px]' }, `${severityLabel(alert.severity)} · ${formatRelative(alert.at, state.settings.lang)}`),
                ),
              ),
            );
          })
        : [h('li', { class: 'px-2 py-8 text-center text-xs muted' }, t('alerts.emptyUnread'))]),
    ),
    h('div', { class: 'px-2 pt-2' }, h('p', { class: 'soft text-[10px] leading-5' }, t('alerts.panelText'))),
  );

  const trigger = h(
    'button',
    { type: 'button', class: 'icon-btn relative', 'aria-label': `${t('common.notifications')}${openCount > 0 ? ` (${openCount})` : ''}` },
    icon('bell', 'size-[19px]'),
    openCount > 0
      ? h('span', { class: 'absolute -end-0.5 -top-0.5' }, countBadge(openCount))
      : null,
  );

  return buildPopover(trigger, panel);
}

function userPopover(): HTMLElement {
  const state = getStore().getState();
  const session = state.session;
  const name = displayName(session);

  const panel = h(
    'div',
    { class: 'w-full' },
    h(
      'div',
      { class: 'flex items-center gap-2.5 px-2 py-2' },
      userAvatar(name),
      h(
        'div',
        { class: 'min-w-0' },
        h('p', { class: 'truncate text-sm font-bold' }, name),
        h('p', { class: 'soft truncate text-[11px]' }, session?.email ?? ''),
      ),
    ),
    h('div', { class: 'my-1 border-t', style: 'border-color: var(--line);' }),
    h(
      'a',
      { href: '#/settings', class: 'flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold hover:bg-[color:var(--surface-3)]' },
      icon('settings', 'size-4'),
      t('common.settings'),
    ),
    h(
      'button',
      {
        type: 'button',
        class: 'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start text-xs font-semibold text-red-600 hover:bg-red-500/10',
        onClick: logout,
      },
      icon('logout', 'size-4'),
      t('common.logout'),
    ),
    h('p', { class: 'soft px-2 pt-2 text-[10px] leading-5' }, t('demo.modeBanner')),
  );

  const trigger = h(
    'button',
    { type: 'button', class: 'rounded-full outline-offset-2', 'aria-label': t('common.profile') },
    userAvatar(name),
  );

  return buildPopover(trigger, panel);
}

function paintThemeButton(button: HTMLButtonElement, theme: Theme): void {
  replaceChildren(button, icon(theme === 'dark' ? 'sun' : 'moon', 'size-[19px]'));
  const label = theme === 'dark' ? t('common.light') : t('common.dark');
  button.setAttribute('aria-label', `${t('common.theme')}: ${label}`);
  button.setAttribute('title', `${t('common.theme')}: ${label}`);
}

export function renderShell(page: HTMLElement, activePath: string, titleKey: MessageKey): HTMLElement {
  const state = getStore().getState();
  const lang = state.settings.lang;
  const theme = state.settings.theme;

  const mobileOverlay = h('div', { class: 'fixed inset-x-0 bottom-0 top-8 z-40 hidden lg:hidden' });
  let previousOverflow = '';
  let previousFocus: HTMLElement | null = null;

  const closeDrawer = (): void => {
    mobileOverlay.classList.add('hidden');
    document.documentElement.style.overflow = previousOverflow;
    document.removeEventListener('keydown', onDrawerKey);
    if (previousFocus && document.contains(previousFocus)) previousFocus.focus();
  };

  const onDrawerKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDrawer();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusableWithin(drawer);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const drawer = h(
    'div',
    {
      class: 'absolute inset-y-0 start-0 flex h-full w-72 max-w-[86vw] flex-col shadow-2xl',
      style: 'background-color: var(--sidebar);',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': t('nav.main'),
    },
    sidebarInner(activePath, { mobile: true, onNavigate: () => closeDrawer() }),
  );

  const backdrop = h('div', { class: 'absolute inset-0 bg-black/70', onClick: closeDrawer });
  mobileOverlay.append(backdrop, drawer);

  const openDrawer = (): void => {
    previousOverflow = document.documentElement.style.overflow;
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.documentElement.style.overflow = 'hidden';
    mobileOverlay.classList.remove('hidden');
    document.addEventListener('keydown', onDrawerKey);
    const firstLink = drawer.querySelector<HTMLElement>('a, button');
    firstLink?.focus();
  };

  const menuButton = h(
    'button',
    { type: 'button', class: 'icon-btn lg:hidden', 'aria-label': t('nav.openMenu'), 'data-menu-toggle': '', onClick: openDrawer },
    icon('menu', 'size-5'),
  );

  const searchInput = h('input', {
    type: 'search',
    name: 'q',
    class: 'input h-9 ps-9 pe-8 text-sm',
    placeholder: t('nav.searchShortcut'),
    'aria-label': t('servers.searchLabel'),
    autocomplete: 'off',
    'data-global-search': '',
  });

  const searchForm = h(
    'form',
    {
      class: 'relative hidden w-56 md:block xl:w-72',
      role: 'search',
      onSubmit: (event: Event) => {
        event.preventDefault();
        const query = searchInput.value.trim();
        navigate(query ? `/servers?q=${encodeURIComponent(query)}` : '/servers');
      },
    },
    h('span', { class: 'pointer-events-none absolute start-3 top-1/2 -translate-y-1/2', style: 'color: var(--ink-soft);' }, icon('search', 'size-4')),
    searchInput,
    h('kbd', { class: 'pointer-events-none absolute end-2.5 top-1/2 hidden -translate-y-1/2 rounded border px-1 py-0.5 text-[10px] font-semibold lg:block', style: 'border-color: var(--line); color: var(--ink-soft);' }, '/'),
  );

  const languageButton = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-ghost btn-sm gap-1.5 px-2',
      'aria-label': `${t('common.language')}: ${lang === 'ar' ? t('common.english') : t('common.arabic')}`,
      title: t('common.language'),
      onClick: () => changeLanguage(lang === 'ar' ? 'en' : 'ar'),
    },
    icon('globe', 'size-[18px]'),
    h('span', { class: 'hidden text-xs font-bold sm:inline' }, lang === 'ar' ? 'EN' : 'ع'),
  );

  const themeButton = h('button', { type: 'button', class: 'icon-btn', 'data-theme-toggle': '' }, icon('moon', 'size-[19px]'));
  paintThemeButton(themeButton, theme);
  themeButton.addEventListener('click', () => {
    toggleTheme();
    const next = getStore().getState().settings.theme;
    paintThemeButton(themeButton, next);
  });

  const topbar = h(
    'header',
    {
      class: 'no-print sticky top-8 z-30 flex h-16 items-center gap-2 border-b px-3 sm:gap-3 sm:px-5',
      style: 'background-color: color-mix(in srgb, var(--surface) 92%, transparent); border-color: var(--line);',
    },
    menuButton,
    h(
      'div',
      { class: 'min-w-0 flex-1 md:flex-none' },
      h(
        'p',
        { class: 'hidden items-center gap-1.5 text-[11px] font-semibold sm:flex', style: 'color: var(--ink-soft);' },
        t('app.shortName'),
        icon('chevronEnd', 'size-3 flip-rtl'),
        h('span', { style: 'color: var(--ink-muted);' }, t(titleKey)),
      ),
      h('p', { class: 'truncate text-sm font-bold md:hidden' }, t(titleKey)),
    ),
    h('div', { class: 'ms-auto flex items-center gap-1 sm:gap-1.5' }, searchForm, languageButton, themeButton, alertsPopover(), userPopover()),
  );

  const main = h(
    'main',
    { id: 'main', tabindex: '-1', class: 'mx-auto w-full max-w-[1440px] flex-1 overflow-x-clip px-3 pb-8 pt-5 outline-none sm:px-5 lg:px-7 lg:pt-7' },
    h(
      'div',
      { class: 'mb-4 flex items-start gap-2 rounded-xl border border-dashed px-3 py-2 text-[10px] leading-5 sm:text-[11px]', style: 'border-color: var(--line-strong); color: var(--ink-muted);' },
      icon('shieldCheck', 'mt-0.5 size-4 shrink-0 text-accent-600'),
      h('span', null, t('demo.notice')),
    ),
    page,
    h(
      'footer',
      { class: 'mt-10 flex flex-col gap-2 border-t pt-4 text-[10px]', style: 'border-color: var(--line); color: var(--ink-soft);' },
      h(
        'div',
        { class: 'flex flex-wrap items-center justify-between gap-2' },
        h('span', { class: 'font-semibold' }, t('footer.concept')),
        h('span', null, t('footer.version', { version: APP_VERSION })),
      ),
      h(
        'div',
        { class: 'flex flex-wrap items-center justify-between gap-2' },
        footerLinks(),
        h('span', null, t('footer.built')),
      ),
      h(
        'div',
        { class: 'flex flex-wrap items-center justify-between gap-2' },
        h('span', { class: 'font-semibold' }, t('footer.copyright')),
        h('span', null, t('footer.rights')),
      ),
      h(
        'div',
        { class: 'flex flex-wrap items-center justify-between gap-2 pt-1', style: 'border-top: 1px solid var(--line);' },
        h('span', null, t('footer.demoNote')),
        ownerCredit(),
      ),
    ),
  );

  const skipLink = h(
    'button',
    {
      type: 'button',
      class: 'sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-[90] focus:rounded-lg focus:bg-brand-700 focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-white',
      onClick: () => document.getElementById('main')?.focus(),
    },
    t('nav.skipToContent'),
  );

  const sidebar = h(
    'aside',
    {
      class: 'no-print sticky top-8 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col border-e border-white/10 lg:flex',
      style: 'background-color: var(--sidebar);',
      'aria-label': t('nav.main'),
    },
    sidebarInner(activePath),
  );

  return h(
    'div',
    { class: 'flex min-h-screen flex-col' },
    skipLink,
    demoRail(),
    mobileOverlay,
    h('div', { class: 'flex flex-1' }, sidebar, h('div', { class: 'flex min-w-0 flex-1 flex-col' }, topbar, main)),
  );
}

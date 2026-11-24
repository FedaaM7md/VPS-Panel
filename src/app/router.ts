/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { t } from '../i18n';
import { DEMO_MODE_ENABLED } from '../config';
import { getStore } from '../state/store';
import { isSessionValid } from '../lib/auth';
import { navigate, parseLocation, ROUTE_EVENT } from '../lib/navigation';
import { demoRail, renderShell } from '../ui/layout';
import { toast } from '../ui/toast';
import type { MessageKey } from '../i18n';
import type { PageContext, PageFactory, PageInstance } from '../pages/types';
import { renderLogin } from '../pages/login';
import { renderPublicPage } from '../pages/public';
import { renderDashboard } from '../pages/dashboard';
import { renderServers } from '../pages/servers';
import { renderServerDetail } from '../pages/server-detail';
import { renderCreateServer } from '../pages/create-server';
import { renderBilling } from '../pages/billing';
import { renderSettings } from '../pages/settings';
import { renderNotFound } from '../pages/notfound';

interface RouteDefinition {
  test: (path: string) => Record<string, string> | null;
  factory: PageFactory;
  requiresAuth: boolean;
  titleKey: MessageKey;
}

function staticRoute(path: string, factory: PageFactory, requiresAuth: boolean, titleKey: MessageKey): RouteDefinition {
  return {
    test: (candidate) => (candidate === path ? {} : null),
    factory,
    requiresAuth,
    titleKey,
  };
}

const ROUTES: RouteDefinition[] = [
  staticRoute('/login', renderLogin, false, 'auth.title'),
  staticRoute('/about', () => renderPublicPage('about'), false, 'public.aboutTitle'),
  staticRoute('/help', () => renderPublicPage('help'), false, 'public.helpTitle'),
  staticRoute('/privacy', () => renderPublicPage('privacy'), false, 'public.privacyTitle'),
  staticRoute('/terms', () => renderPublicPage('terms'), false, 'public.termsTitle'),
  staticRoute('/changelog', () => renderPublicPage('changelog'), false, 'public.changelogTitle'),
  staticRoute('/dashboard', renderDashboard, true, 'dashboard.title'),
  staticRoute('/servers', renderServers, true, 'servers.title'),
  staticRoute('/servers/new', renderCreateServer, true, 'wizard.title'),
  {
    test: (path) => {
      const match = /^\/servers\/([A-Za-z0-9_-]+)$/.exec(path);
      return match && match[1] ? { id: match[1] } : null;
    },
    factory: renderServerDetail,
    requiresAuth: true,
    titleKey: 'servers.title',
  },
  staticRoute('/billing', renderBilling, true, 'billing.title'),
  staticRoute('/settings', renderSettings, true, 'settings.title'),
];

let currentPage: PageInstance | null = null;
let lastLocationKey = '';

function findRoute(path: string): { route: RouteDefinition; params: Record<string, string> } | null {
  for (const route of ROUTES) {
    const params = route.test(path);
    if (params) return { route, params };
  }
  return null;
}

function renderStandaloneNotFound(): void {
  const page = renderNotFound();
  const app = document.getElementById('app');
  if (!app) return;
  const shell = document.createElement('div');
  shell.className = 'min-h-screen';
  shell.append(demoRail(), page.el);
  app.replaceChildren(shell);
  document.title = `${t('notfound.title')} — ${t('app.name')}`;
  document.documentElement.setAttribute('data-route', '/404');
}

function renderRoute(): void {
  const store = getStore();
  const location = parseLocation(window.location.hash);
  const now = Date.now();
  const session = store.getState().session;

  if (session && !isSessionValid(session, now)) {
    store.logout();
    toast('info', t('auth.sessionExpired'));
    navigate('/login', { replace: true });
    return;
  }

  // Guest entry: a one-click demo session with its own rate limit. When demo
  // mode is off the route is not registered and resolves to the 404 page.
  if (location.path === '/demo') {
    if (!DEMO_MODE_ENABLED) {
      renderStandaloneNotFound();
      return;
    }
    if (session) {
      navigate('/dashboard', { replace: true });
      return;
    }
    const guest = store.guestLogin();
    if (guest.ok) {
      toast('success', t('auth.guestSignedIn'));
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login?demo=throttled', { replace: true });
    }
    return;
  }

  const match = findRoute(location.path);

  if (!match) {
    renderStandaloneNotFound();
    return;
  }

  if (match.route.requiresAuth && !session) {
    navigate('/login', { replace: true });
    return;
  }
  if (!match.route.requiresAuth && session && location.path === '/login') {
    navigate('/dashboard', { replace: true });
    return;
  }

  const locationKey = `${location.path}?${location.query.toString()}`;
  const isNewLocation = locationKey !== lastLocationKey;
  lastLocationKey = locationKey;

  if (currentPage?.destroy) currentPage.destroy();

  const context: PageContext = {
    path: location.path,
    query: location.query,
    params: match?.params ?? {},
  };

  const page = match.route.factory(context);
  currentPage = page;

  const app = document.getElementById('app');
  if (!app) return;

  if (!match.route.requiresAuth) {
    app.replaceChildren(page.el);
  } else {
    app.replaceChildren(renderShell(page.el, location.path, page.titleKey));
  }

  document.title = `${t(page.titleKey)} — ${t('app.name')}`;
  document.documentElement.setAttribute('data-route', location.path);

  if (isNewLocation) {
    const main = document.getElementById('main');
    if (main) {
      main.focus({ preventScroll: true });
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
}

/** Re-render the shell in place, e.g. after an epoch-driven demo reseed. */
export function refreshShell(): void {
  renderRoute();
}

let started = false;

export function startRouter(): void {
  if (started) return;
  started = true;

  window.addEventListener('hashchange', renderRoute);
  window.addEventListener(ROUTE_EVENT, renderRoute);

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const typing =
      target instanceof HTMLElement &&
      (target.matches('input, textarea, select') || target.isContentEditable);
    const isSlash = event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !typing;
    const isCommandK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
    const isHelp = event.key === '?' && !typing;
    if (isHelp) {
      event.preventDefault();
      navigate('/help');
      return;
    }
    if (!isSlash && !isCommandK) return;
    const search = document.querySelector<HTMLInputElement>('[data-global-search]');
    if (!search) return;
    event.preventDefault();
    search.focus();
    search.select();
  });

  renderRoute();
}

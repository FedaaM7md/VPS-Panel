/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { afterEach, describe, expect, it } from 'vitest';
import { getStore } from '../src/state/store';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../src/lib/auth';
import { clearDemoKeys } from '../src/lib/storage';
import { resetCsrfToken } from '../src/lib/csrf';
import { renderLogin } from '../src/pages/login';
import { renderDashboard } from '../src/pages/dashboard';
import { renderServers } from '../src/pages/servers';
import { renderServerDetail } from '../src/pages/server-detail';
import { renderCreateServer } from '../src/pages/create-server';
import { renderBilling } from '../src/pages/billing';
import { renderSettings } from '../src/pages/settings';
import { renderNotFound } from '../src/pages/notfound';
import { setLanguage } from '../src/i18n';
import type { PageInstance } from '../src/pages/types';
import { t } from '../src/i18n';

function context(query = '') {
  return { path: '/test', query: new URLSearchParams(query), params: {} };
}

function mount(page: PageInstance): HTMLElement {
  document.body.replaceChildren(page.el);
  return page.el;
}

afterEach(() => {
  document.body.replaceChildren();
  getStore().logout();
  clearDemoKeys();
  resetCsrfToken();
  setLanguage('ar');
});

describe('page rendering smoke tests', () => {
  it('renders the login screen with the demo credentials and local-only notice', () => {
    const page = renderLogin();
    const root = mount(page);
    expect(root.querySelector('h1')?.textContent).toBeTruthy();
    expect(root.textContent).toContain(DEMO_EMAIL);
    expect(root.textContent).toContain(DEMO_PASSWORD);
    expect(root.querySelector('#login-email')).toBeInstanceOf(HTMLInputElement);
    expect(root.querySelector('#login-password')).toBeInstanceOf(HTMLInputElement);
    page.destroy?.();
  });

  it('renders every authenticated page and tab without throwing', () => {
    const store = getStore();
    const login = store.login(DEMO_EMAIL, DEMO_PASSWORD);
    expect(login.ok).toBe(true);

    const dashboard = renderDashboard();
    expect(mount(dashboard).querySelector('h1')?.textContent).toBeTruthy();
    dashboard.destroy?.();

    const servers = renderServers(context('q=fra'));
    expect(mount(servers).querySelectorAll('tbody tr').length).toBeGreaterThan(0);
    servers.destroy?.();

    const server = store.getState().servers[0];
    if (!server) throw new Error('seed missing servers');
    for (const tab of ['overview', 'monitoring', 'snapshots', 'firewall', 'access', 'rdp', 'console']) {
      const detail = renderServerDetail({ ...context(`tab=${tab}`), params: { id: server.id } });
      const root = mount(detail);
      expect(root.querySelector('h1')?.textContent).toContain(server.name);
      expect(root.querySelector('[role="tablist"]')).not.toBeNull();
      detail.destroy?.();
    }

    const rdpServer = store.getState().servers.find((item) => item.rdp !== null);
    if (rdpServer) {
      const rdpDetail = renderServerDetail({ ...context('tab=rdp'), params: { id: rdpServer.id } });
      expect(mount(rdpDetail).textContent).toContain('3389');
      rdpDetail.destroy?.();
    }

    const wizard = renderCreateServer();
    expect(mount(wizard).querySelector('#wizard-name')).toBeInstanceOf(HTMLInputElement);
    wizard.destroy?.();

    const billing = renderBilling();
    expect(mount(billing).querySelectorAll('tbody tr').length).toBeGreaterThan(0);
    billing.destroy?.();

    const settings = renderSettings();
    expect(mount(settings).querySelector('#profile-name')).toBeInstanceOf(HTMLInputElement);
    settings.destroy?.();

    const missing = renderNotFound();
    expect(mount(missing).textContent).toContain('404');
    missing.destroy?.();
  });

  it('paginates the server list, opens the phone filter sheet and highlights search', () => {
    const store = getStore();
    const login = store.login(DEMO_EMAIL, DEMO_PASSWORD);
    expect(login.ok).toBe(true);
    const page = renderServers(context());
    const root = mount(page);
    expect(root.querySelectorAll('article').length).toBe(8);
    expect(root.querySelector('nav[aria-label]')).not.toBeNull();

    const filters = root.querySelector<HTMLElement>('#servers-filters');
    const toggle = root.querySelector<HTMLButtonElement>('[data-filter-toggle]');
    expect(filters?.dataset.open).toBe('false');
    toggle?.click();
    expect(filters?.dataset.open).toBe('true');
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');

    const search = root.querySelector<HTMLInputElement>('#servers-search');
    if (search) {
      search.value = 'web';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(root.querySelector('mark')?.textContent?.toLowerCase()).toBe('web');
    page.destroy?.();
  });

  it('walks the provisioning wizard and creates a demo server', () => {
    const store = getStore();
    const login = store.login(DEMO_EMAIL, DEMO_PASSWORD);
    expect(login.ok).toBe(true);
    const before = store.getState().servers.length;

    const page = renderCreateServer();
    const root = mount(page);

    const name = root.querySelector<HTMLInputElement>('#wizard-name');
    expect(name).not.toBeNull();
    if (!name) return;
    name.value = 'smoke-wizard-01';
    name.dispatchEvent(new Event('input', { bubbles: true }));

    const next = () => {
      const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button.btn-primary'));
      const button = buttons[buttons.length - 1];
      expect(button).toBeDefined();
      button?.click();
    };

    // Basics -> plan
    next();
    expect(root.querySelectorAll('[role="radio"]').length).toBe(4);
    expect(root.textContent).toContain(t('wizard.stepOf', { current: '2', total: '6' }));

    // Pick the first plan.
    const plans = root.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    expect(plans.length).toBeGreaterThan(0);
    plans[0]?.click();

    // Plan -> region
    next();
    const regions = root.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    expect(regions.length).toBeGreaterThan(0);
    regions[0]?.click();

    // Region -> image
    next();
    const images = root.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    expect(images.length).toBeGreaterThan(0);
    images[0]?.click();

    // Image -> access
    next();
    const keyCheckboxes = root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(keyCheckboxes.length).toBeGreaterThan(0);
    keyCheckboxes[0]?.click();

    // Access -> review
    next();
    expect(root.textContent).toContain('smoke-wizard-01');

    // Create.
    next();

    const created = store.getState().servers.find((server) => server.name === 'smoke-wizard-01');
    expect(created).toBeDefined();
    expect(store.getState().servers.length).toBe(before + 1);
    expect(created?.status).toBe('provisioning');
    page.destroy?.();
  });
});

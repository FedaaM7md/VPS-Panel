/**
 * VPS Panel boot sequence.
 * © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE.
 */
import '@fontsource/mada/400.css';
import '@fontsource/mada/500.css';
import '@fontsource/mada/600.css';
import '@fontsource/mada/700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import './styles.css';

import { DEMO_EPOCH_FILE, DEMO_MODE_ENABLED } from './config';
import { getStore } from './state/store';
import { applyLanguage, applyTheme } from './ui/preferences';
import { startClock } from './lib/clock';
import { fetchDemoEpoch } from './lib/demo';
import { startRouter, refreshShell } from './app/router';
import { toast } from './ui/toast';
import { t } from './i18n';

async function syncDemoEpoch(): Promise<void> {
  const epoch = await fetchDemoEpoch(DEMO_EPOCH_FILE, DEMO_MODE_ENABLED);
  if (!epoch) return;
  if (getStore().applyDemoEpoch(epoch)) {
    toast('info', t('demo.autoReset'));
    refreshShell();
  }
}

function boot(): void {
  const store = getStore();
  const state = store.getState();

  // A build with demo mode disabled has no valid client-side identity.
  // A server-side auth implementation is required before it can be used.
  if (!DEMO_MODE_ENABLED && state.session) store.logout();

  // Apply persisted preferences before the first paint.
  applyLanguage(state.settings.lang);
  applyTheme(state.settings.theme);
  store.tick(Date.now());

  startClock();
  startRouter();

  if (store.sessionExpiredOnBoot) {
    toast('info', t('auth.sessionExpired'));
  }

  if (DEMO_MODE_ENABLED) void syncDemoEpoch();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

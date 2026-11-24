/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { getStore } from '../state/store';
import { navigate } from './navigation';
import { t } from '../i18n';
import { toast } from '../ui/toast';
import { isSessionValid } from './auth';
/** Single 4-second clock shared by live charts and status settling. */
const listeners = new Set<(payload: { now: number; sample: number }) => void>();
let timer: number | null = null;

export function onClock(listener: (payload: { now: number; sample: number }) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function currentSample(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 4000);
}

export function startClock(): void {
  if (timer !== null) return;
  timer = window.setInterval(() => {
    const now = Date.now();
    const store = getStore();
    const session = store.getState().session;

    if (session && !isSessionValid(session, now)) {
      store.logout();
      toast('info', t('auth.sessionExpired'));
      navigate('/login', { replace: true });
      return;
    }

    const { sample } = store.tick(now);
    for (const listener of listeners) {
      try {
        listener({ now, sample });
      } catch (error) {
        console.error('Clock listener failed', error);
      }
    }
  }, 4000);
}

export function stopClock(): void {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
}

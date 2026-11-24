/**
 * Sign-in and one-click guest entry for the concept console.
 * © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE.
 */
import { t } from '../i18n';
import { DEMO_MODE_ENABLED } from '../config';
import { getStore } from '../state/store';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../lib/auth';
import { isValidEmail } from '../lib/validation';
import { navigate } from '../lib/navigation';
import { formatNumber } from '../lib/format';
import { APP_VERSION } from '../lib/types';
import { h, replaceChildren } from '../ui/dom';
import { icon } from '../ui/icons';
import { conceptRail, footerLinks, ownerCredit, brandMark } from '../ui/layout';
import { toast } from '../ui/toast';
import { changeLanguage, toggleTheme } from '../ui/preferences';
import type { PageContext, PageInstance } from './types';

function passwordVisibilityButton(input: HTMLInputElement): HTMLButtonElement {
  const button = h(
    'button',
    {
      type: 'button',
      class: 'absolute end-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md transition-colors',
      style: 'color: var(--ink-muted);',
      'aria-label': t('common.show'),
      'aria-pressed': 'false',
      onClick: () => {
        const visible = input.type === 'password';
        input.type = visible ? 'text' : 'password';
        button.setAttribute('aria-pressed', String(visible));
        button.setAttribute('aria-label', visible ? t('common.hide') : t('common.show'));
        replaceChildren(button, icon(visible ? 'eyeOff' : 'eye', 'size-4'));
      },
    },
    icon('eye', 'size-4'),
  );
  return button;
}

function statusColor(status: string): string {
  if (status === 'running') return 'var(--color-accent-500)';
  if (status === 'rebooting' || status === 'provisioning') return '#f59e0b';
  return 'var(--iron)';
}

export function renderLogin(context?: PageContext): PageInstance {
  const store = getStore();
  const state = store.getState();
  const lang = state.settings.lang;
  const theme = state.settings.theme;
  const demo = DEMO_MODE_ENABLED;

  let countdownTimer: number | null = null;
  let guestCountdown: number | null = null;

  const emailInput = h('input', {
    id: 'login-email',
    name: 'email',
    type: 'email',
    class: 'input',
    autocomplete: 'username',
    spellcheck: 'false',
    placeholder: t('auth.emailPlaceholder'),
    'aria-describedby': 'login-email-error',
    disabled: !demo,
  });

  const passwordInput = h('input', {
    id: 'login-password',
    name: 'password',
    type: 'password',
    class: 'input pe-11',
    autocomplete: 'current-password',
    placeholder: t('auth.passwordPlaceholder'),
    'aria-describedby': 'login-password-error',
    disabled: !demo,
  });

  // Honeypot: hidden from people, tempting to naive form bots.
  const honeypot = h('input', {
    type: 'text',
    name: 'website',
    tabindex: '-1',
    autocomplete: 'off',
    'aria-hidden': 'true',
    class: 'pointer-events-none absolute -start-[9999px] top-0 size-px opacity-0',
  });

  const emailError = h('p', { id: 'login-email-error', class: 'error-text', hidden: true });
  const passwordError = h('p', { id: 'login-password-error', class: 'error-text', hidden: true });
  const formMessage = h('div', { class: 'hidden rounded-md border px-3 py-2.5 text-sm leading-6', role: 'alert' });
  const guestMessage = h('p', { class: 'hidden text-xs font-semibold text-amber-700 dark:text-amber-300', role: 'status' });
  const lockMessage = h('p', { class: 'hidden items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300', role: 'status' });

  const submitButton = h(
    'button',
    { type: 'submit', class: 'btn btn-secondary w-full py-2.5 text-sm', disabled: !demo },
    t('auth.submit'),
    icon('arrowEnd', 'size-4 flip-rtl'),
  );

  const setFieldError = (input: HTMLInputElement, target: HTMLElement, message: string | null): void => {
    if (message) {
      target.textContent = message;
      target.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.classList.add('border-red-500');
    } else {
      target.textContent = '';
      target.hidden = true;
      input.removeAttribute('aria-invalid');
      input.classList.remove('border-red-500');
    }
  };

  const showFormMessage = (kind: 'error' | 'info', message: string): void => {
    formMessage.className =
      kind === 'error'
        ? 'rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm leading-6 text-red-700 dark:text-red-300'
        : 'rounded-md border border-brand-500/30 bg-brand-500/10 px-3 py-2.5 text-sm leading-6 text-brand-700 dark:text-brand-300';
    formMessage.textContent = message;
    formMessage.hidden = false;
  };

  const hideFormMessage = (): void => {
    formMessage.hidden = true;
    formMessage.textContent = '';
  };

  const clearCountdown = (): void => {
    if (countdownTimer !== null) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (guestCountdown !== null) {
      window.clearInterval(guestCountdown);
      guestCountdown = null;
    }
  };

  const startCountdown = (lockedUntil: number): void => {
    if (countdownTimer !== null) window.clearInterval(countdownTimer);
    const tick = (): void => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      if (remaining <= 0) {
        if (countdownTimer !== null) window.clearInterval(countdownTimer);
        countdownTimer = null;
        lockMessage.classList.add('hidden');
        lockMessage.classList.remove('flex');
        submitButton.disabled = false;
        return;
      }
      lockMessage.classList.remove('hidden');
      lockMessage.classList.add('flex');
      lockMessage.textContent = t('auth.errorLocked', { seconds: formatNumber(remaining, lang) });
      submitButton.disabled = true;
    };
    tick();
    countdownTimer = window.setInterval(tick, 1000);
  };

  const startGuestCountdown = (): void => {
    if (guestCountdown !== null) window.clearInterval(guestCountdown);
    const tick = (): void => {
      const remaining = store.guestRetryAfterSeconds();
      if (remaining <= 0) {
        if (guestCountdown !== null) window.clearInterval(guestCountdown);
        guestCountdown = null;
        guestMessage.classList.add('hidden');
        return;
      }
      guestMessage.classList.remove('hidden');
      guestMessage.textContent = t('auth.guestRateLimited', { seconds: formatNumber(remaining, lang) });
    };
    tick();
    guestCountdown = window.setInterval(tick, 1000);
  };

  const throttle = store.getThrottle();
  if (demo && throttle.lockedUntil && throttle.lockedUntil > Date.now()) {
    startCountdown(throttle.lockedUntil);
  }
  if (demo) startGuestCountdown();

  const form = h(
    'form',
    {
      class: 'mt-4 space-y-4',
      novalidate: true,
      'data-login-form': '',
      onSubmit: (event: Event) => {
        event.preventDefault();
        if (!demo) {
          showFormMessage('error', t('auth.disabledText'));
          return;
        }
        hideFormMessage();
        setFieldError(emailInput, emailError, null);
        setFieldError(passwordInput, passwordError, null);

        if (honeypot.value.trim().length > 0) {
          showFormMessage('error', t('auth.errorInvalid'));
          return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        let invalid = false;

        if (!email) {
          setFieldError(emailInput, emailError, t('auth.errorRequired'));
          invalid = true;
        } else if (!isValidEmail(email)) {
          setFieldError(emailInput, emailError, t('auth.errorEmail'));
          invalid = true;
        }
        if (!password) {
          setFieldError(passwordInput, passwordError, t('auth.errorRequired'));
          invalid = true;
        }
        if (invalid) {
          (email ? passwordInput : emailInput).focus();
          return;
        }

        const result = store.login(email, password);
        if (!result.ok) {
          if (result.code === 'locked') {
            const lockedUntil = result.throttle.lockedUntil ?? Date.now() + 60_000;
            startCountdown(lockedUntil);
          } else if (result.code === 'disabled') {
            showFormMessage('error', t('auth.disabledText'));
          } else {
            showFormMessage('error', t('auth.errorInvalid'));
            emailInput.setAttribute('aria-invalid', 'true');
            passwordInput.setAttribute('aria-invalid', 'true');
            passwordInput.focus();
            passwordInput.select();
          }
          return;
        }

        toast('success', t('auth.signedIn'));
        navigate('/dashboard');
      },
    },
    honeypot,
    h(
      'div',
      null,
      h('label', { for: 'login-email', class: 'label' }, t('auth.emailLabel')),
      emailInput,
      emailError,
    ),
    h(
      'div',
      null,
      h('label', { for: 'login-password', class: 'label' }, t('auth.passwordLabel')),
      h('div', { class: 'relative' }, passwordInput, passwordVisibilityButton(passwordInput)),
      passwordError,
    ),
    formMessage,
    lockMessage,
    submitButton,
  );

  const guestButton = demo
    ? h(
        'button',
        {
          type: 'button',
          class: 'btn btn-primary w-full py-3 text-sm',
          'data-guest-entry': '',
          onClick: () => {
            const result = store.guestLogin();
            if (!result.ok) {
              startGuestCountdown();
              return;
            }
            toast('success', t('auth.guestSignedIn'));
            navigate('/dashboard');
          },
        },
        icon('user', 'size-4'),
        t('auth.guestSubmit'),
        icon('arrowEnd', 'size-4 flip-rtl'),
      )
    : null;

  const guestBox = demo
    ? h(
        'div',
        { class: 'mt-4' },
        guestButton,
        h('p', { class: 'soft mt-2 text-[10px] leading-5' }, t('auth.guestHint')),
        h('p', { class: 'soft mt-1 flex items-center gap-1.5 text-[10px] leading-5' }, icon('shieldCheck', 'size-3.5'), t('auth.guestRoleNote')),
        guestMessage,
      )
    : h(
        'div',
        { class: 'mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs leading-6 text-amber-800 dark:text-amber-200', role: 'note' },
        h('p', { class: 'font-bold' }, t('auth.disabledTitle')),
        h('p', { class: 'mt-1' }, t('auth.disabledText')),
      );

  const demoBox = demo
    ? h(
        'div',
        { class: 'mt-5 rounded-md border border-dashed p-3.5', style: 'border-color: var(--line-strong); background-color: var(--surface-2);' },
        h('p', { class: 'flex items-center gap-1.5 text-xs font-bold' }, icon('key', 'size-4 text-brand-600'), t('auth.demoTitle')),
        h('p', { class: 'muted mt-1 text-[11px] leading-5' }, t('auth.demoText')),
        h(
          'dl',
          { class: 'mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]' },
          h('dt', { class: 'soft' }, t('auth.demoEmail')),
          h('dd', { class: 'select-all font-mono font-semibold' }, DEMO_EMAIL),
          h('dt', { class: 'soft' }, t('auth.demoPassword')),
          h('dd', { class: 'select-all font-mono font-semibold' }, DEMO_PASSWORD),
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-ghost btn-sm mt-2 w-full',
            onClick: () => {
              emailInput.value = DEMO_EMAIL;
              passwordInput.value = DEMO_PASSWORD;
              emailInput.focus();
              hideFormMessage();
            },
          },
          t('auth.fillDemo'),
        ),
      )
    : null;

  const makeLanguageButton = (): HTMLButtonElement =>
    h(
      'button',
      {
        type: 'button',
        class: 'btn btn-ghost btn-sm gap-1.5',
        'aria-label': t('common.language'),
        onClick: () => changeLanguage(lang === 'ar' ? 'en' : 'ar'),
      },
      icon('globe', 'size-4'),
      h('span', { class: 'text-xs font-bold' }, lang === 'ar' ? 'EN' : 'ع'),
    );

  const makeThemeButton = (): HTMLButtonElement => {
    const button = h(
      'button',
      {
        type: 'button',
        class: 'icon-btn',
        'aria-label': t('common.theme'),
        onClick: () => {
          toggleTheme();
          replaceChildren(button, icon(getStore().getState().settings.theme === 'dark' ? 'sun' : 'moon', 'size-4'));
        },
      },
      icon(theme === 'dark' ? 'sun' : 'moon', 'size-4'),
    );
    return button;
  };

  const servers = state.servers.slice(0, 5);
  const running = state.servers.filter((server) => server.status === 'running').length;

  const rackPreview = h(
    'div',
    { class: 'rack rack-dark', 'aria-label': t('auth.previewLabel') },
    ...servers.map((server) =>
      h(
        'div',
        { class: 'rack-unit', style: 'background-color:#141c28; border-color:#263244;' },
        h('span', { class: 'rack-ear' }),
        h('span', { class: 'rack-led', style: `color:${statusColor(server.status)}; background-color:${statusColor(server.status)};` }),
        h(
          'span',
          { class: 'min-w-0 flex-1' },
          h('span', { class: 'block truncate text-[11px] font-semibold text-slate-100' }, server.name),
          h(
            'span',
            { class: 'block truncate text-[9px] text-slate-400' },
            h('span', { class: 'font-mono' }, server.ipv4),
            ' · ',
            t(`regions.${server.regionId}`),
          ),
        ),
        h('span', { class: 'rack-vents hidden sm:block' }),
        h('span', { class: 'shrink-0 text-[9px] text-slate-400' }, t(`status.${server.status}`)),
        h('span', { class: 'rack-ear' }),
      ),
    ),
  );

  const hero = h(
    'section',
    {
      class: 'relative hidden overflow-hidden border-e border-white/10 p-10 lg:flex lg:flex-col lg:justify-between xl:p-14',
      style: 'background-color:#0b1018;',
    },
    h(
      'div',
      { class: 'pointer-events-none absolute inset-0 opacity-25', 'aria-hidden': 'true', style: 'background-image: linear-gradient(rgba(138,153,173,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(138,153,173,0.12) 1px, transparent 1px); background-size: 40px 40px;' },
    ),
    h(
      'div',
      { class: 'relative' },
      h(
        'div',
        { class: 'flex items-center gap-3' },
        brandMark('size-11'),
        h(
          'div',
          null,
          h('p', { class: 'text-base font-bold tracking-tight text-white' }, 'VPS ', h('span', { class: 'font-mono text-xs font-medium tracking-[0.18em] text-brand-300' }, 'PANEL')),
          h('p', { class: 'text-[10px]', style: 'color:#8a99ad;' }, t('app.tagline')),
        ),
      ),
      h(
        'p',
        { class: 'mt-10 text-[10px] font-semibold text-brand-300' },
        t('auth.showcaseTag'),
      ),
      h('h2', { class: 'mt-3 max-w-md text-balance text-3xl font-bold leading-tight text-white xl:text-4xl' }, t('auth.heroTitle')),
      h('p', { class: 'mt-3 max-w-md text-sm leading-7', style: 'color:#9fb0c4;' }, t('auth.heroSubtitle')),
    ),
    h(
      'div',
      { class: 'relative mt-8' },
      h(
        'div',
        { class: 'mb-2 flex items-center justify-between gap-3' },
        h('p', { class: 'text-[10px] font-semibold', style: 'color:#7d8ea3;' }, t('auth.previewTitle')),
        h(
          'p',
          { class: 'text-[10px]', style: 'color:#7d8ea3;' },
          h('span', { class: 'font-mono' }, `${formatNumber(running, lang)} / ${formatNumber(state.servers.length, lang)}`),
          ' ',
          t('status.running'),
        ),
      ),
      rackPreview,
      h(
        'div',
        { class: 'console-shell mt-3 p-3' },
        h('p', null, h('span', { class: 'font-mono', style: 'color:#5b7f97;' }, '00:00:04 '), h('span', { style: 'color:#22c55e;' }, t('auth.consoleBoot'))),
        h('p', null, h('span', { class: 'font-mono', style: 'color:#5b7f97;' }, '00:00:04 '), h('span', { style: 'color:#22d3e0;' }, t('auth.consoleState', { count: formatNumber(state.servers.length, lang) }))),
        h('p', null, h('span', { class: 'font-mono', style: 'color:#5b7f97;' }, '00:00:04 '), h('span', { style: 'color:#22c55e;' }, t('auth.consoleNet'))),
      ),
      h('p', { class: 'mt-3 text-[9px]', style: 'color:#7d8ea3;' }, t('auth.previewFootnote')),
    ),
    h(
      'div',
      { class: 'relative mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]', style: 'color:#7d8ea3;' },
      h('span', { class: 'font-mono' }, `v${APP_VERSION}`),
      h('span', null, t('footer.copyright')),
    ),
  );

  const formSide = h(
    'section',
    { class: 'flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-10' },
    h(
      'div',
      { class: 'w-full max-w-md' },
      h(
        'div',
        { class: 'mb-6 flex items-center justify-between gap-3 lg:hidden' },
        h(
          'div',
          { class: 'flex items-center gap-2.5' },
          brandMark('size-9'),
          h(
            'div',
            null,
            h('p', { class: 'text-sm font-bold' }, 'VPS ', h('span', { class: 'font-mono text-[10px] tracking-[0.18em] text-brand-600' }, 'PANEL')),
            h('p', { class: 'soft text-[10px]' }, t('app.tagline')),
          ),
        ),
        h('div', { class: 'flex items-center gap-1' }, makeLanguageButton(), makeThemeButton()),
      ),
      h(
        'div',
        { class: 'card p-5 sm:p-7' },
        h(
          'div',
          { class: 'flex items-start justify-between gap-3' },
          h(
            'div',
            null,
            h('p', { class: 'text-[10px] font-semibold text-brand-600' }, t('auth.kicker')),
            h('h1', { class: 'mt-1.5 text-2xl font-bold tracking-tight' }, t('auth.title')),
            h('p', { class: 'muted mt-2 text-sm leading-6' }, t('auth.subtitle')),
          ),
          h('div', { class: 'hidden items-center gap-1 lg:flex' }, makeLanguageButton(), makeThemeButton()),
        ),
        guestBox,
        demo
          ? h(
              'div',
              { class: 'my-4 flex items-center gap-3' },
              h('span', { class: 'h-px flex-1', style: 'background-color: var(--line);' }),
              h('span', { class: 'text-[9px] font-semibold soft' }, t('auth.orSignIn')),
              h('span', { class: 'h-px flex-1', style: 'background-color: var(--line);' }),
            )
          : null,
        form,
        h('p', { class: 'soft mt-3 flex items-start gap-1.5 text-[10px] leading-5' }, icon('lock', 'size-3.5 shrink-0'), t('auth.lockNotice')),
        demoBox,
      ),
      h(
        'div',
        { class: 'mt-5 flex items-start gap-2 rounded-md border p-3 text-[10px] leading-5', style: 'border-color: var(--line); color: var(--ink-muted);' },
        icon('shield', 'size-4 shrink-0 text-brand-600'),
        h('span', null, h('span', { class: 'block font-bold' }, t('auth.localTitle')), t('auth.localText')),
      ),
      h(
        'p',
        { class: 'soft mt-4 text-center text-[10px] leading-5' },
        t('auth.noAccount'),
        ' ',
        h('span', { class: 'font-mono' }, `v${APP_VERSION}`),
      ),
      h(
        'footer',
        { class: 'mt-5 flex flex-col gap-2 border-t pt-3 text-center text-[10px] leading-5', style: 'border-color: var(--line); color: var(--ink-soft);' },
        h('div', { class: 'flex justify-center' }, footerLinks()),
        h('p', null, t('footer.demoNote')),
        h('p', { class: 'font-semibold' }, t('footer.copyright')),
        h('p', null, ownerCredit()),
      ),
    ),
  );

  const root = h(
    'div',
    { class: 'flex min-h-screen flex-col' },
    conceptRail(),
    h('div', { class: 'flex flex-1 flex-col lg:grid lg:grid-cols-[1.04fr_0.96fr]' }, hero, formSide),
  );

  // A throttled guest entry redirects here with a marker so the reason is visible.
  if (context?.query.get('demo') === 'throttled') {
    startGuestCountdown();
  }

  return {
    el: root,
    titleKey: 'auth.title',
    destroy: clearCountdown,
  };
}

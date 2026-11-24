/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { t, tm } from '../i18n';
import { getStore } from '../state/store';
import { getCsrfToken } from '../lib/csrf';
import { refreshRoute } from '../lib/navigation';
import { isValidEmail } from '../lib/validation';
import { APP_VERSION, type Lang, type Theme } from '../lib/types';
import { h, replaceChildren } from '../ui/dom';
import { icon } from '../ui/icons';
import { pageHeader, sectionCard, notice } from '../ui/components';
import { demoBadge } from '../ui/badges';
import { changeLanguage, changeTheme, applyLanguage, applyTheme } from '../ui/preferences';
import { openDialog } from '../ui/dialog';
import { toast } from '../ui/toast';
import type { PageInstance } from './types';

function field(label: string, id: string, control: HTMLElement, hint?: string, error?: HTMLElement): HTMLElement {
  return h(
    'div',
    null,
    h('label', { class: 'label', for: id }, label),
    control,
    hint ? h('p', { class: 'hint' }, hint) : null,
    error ?? null,
  );
}

export function renderSettings(): PageInstance {
  const store = getStore();
  const lang = store.getState().settings.lang;

  function makeError(id: string): HTMLParagraphElement {
    return h('p', { id, class: 'error-text', hidden: true });
  }

  function setError(node: HTMLElement, message: string | null): void {
    if (message) {
      node.textContent = message;
      node.hidden = false;
    } else {
      node.textContent = '';
      node.hidden = true;
    }
  }

  const state = store.getState();
  const profile = state.settings.profile;

  const demoAccount = state.session?.isDemo === true;
  const nameInput = h('input', { id: 'profile-name', class: 'input', value: profile.name, maxlength: '60', autocomplete: 'name' });
  const emailInput = h('input', {
    id: 'profile-email',
    class: 'input',
    type: 'email',
    value: profile.email,
    autocomplete: 'email',
    disabled: demoAccount,
  });
  const companyInput = h('input', { id: 'profile-company', class: 'input', value: profile.company, maxlength: '80', autocomplete: 'organization' });
  const nameError = makeError('profile-name-error');
  const emailError = makeError('profile-email-error');
  const companyError = makeError('profile-company-error');

  const profileForm = h(
    'form',
    {
      class: 'space-y-3',
      novalidate: true,
      onSubmit: (event: Event) => {
        event.preventDefault();
        setError(nameError, null);
        setError(emailError, null);
        setError(companyError, null);

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const company = companyInput.value.trim();
        let invalid = false;
        if (name.length < 2 || name.length > 60) {
          setError(nameError, t('settings.invalidName'));
          invalid = true;
        }
        if (!isValidEmail(email)) {
          setError(emailError, t('settings.invalidEmail'));
          invalid = true;
        }
        if (company.length > 80) {
          setError(companyError, t('errors.maxLength', { count: 80 }));
          invalid = true;
        }
        if (invalid) return;

        const result = store.updateProfile({ name, email, company }, getCsrfToken());
        if (!result.ok) {
          if (result.errors?.name) setError(nameError, tm(result.errors.name));
          if (result.errors?.email) setError(emailError, tm(result.errors.email));
          if (result.errors?.company) setError(companyError, tm(result.errors.company));
          if (!result.errors) toast('error', t('errors.sessionExpired'));
          return;
        }
        toast('success', t('settings.profileSaved'));
        refreshRoute();
      },
    },
    field(t('settings.nameLabel'), 'profile-name', nameInput, undefined, nameError),
    field(
      t('settings.emailLabel'),
      'profile-email',
      emailInput,
      demoAccount ? t('settings.emailLockedHint') : undefined,
      emailError,
    ),
    field(t('settings.companyLabel'), 'profile-company', companyInput, undefined, companyError),
    h('div', { class: 'flex flex-wrap items-center justify-between gap-2 pt-2' }, demoBadge(t('settings.demoProfile')), h('button', { type: 'submit', class: 'btn btn-primary btn-sm' }, icon('check', 'size-3.5'), t('settings.saveProfile'))),
  );

  const notifications = { ...state.settings.notifications };
  const toggle = (key: keyof typeof notifications, label: string, hint: string): HTMLElement => {
    const input = h('input', {
      type: 'checkbox',
      class: 'mt-0.5 size-4 shrink-0 accent-teal-600',
      checked: notifications[key],
      id: `notify-${key}`,
      onChange: (event: Event) => {
        notifications[key] = (event.target as HTMLInputElement).checked;
      },
    });
    return h(
      'label',
      { class: 'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:border-brand-500/40', style: 'border-color: var(--line);', for: `notify-${key}` },
      input,
      h('span', { class: 'min-w-0' }, h('span', { class: 'block text-xs font-bold' }, label), h('span', { class: 'muted mt-0.5 block text-[10px] leading-5' }, hint)),
    );
  };

  const notifyForm = h(
    'form',
    {
      class: 'space-y-2',
      onSubmit: (event: Event) => {
        event.preventDefault();
        const result = store.updateNotifications(notifications, getCsrfToken());
        if (!result.ok) {
          toast('error', t('errors.generic'));
          return;
        }
        toast('success', t('settings.notifySaved'));
      },
    },
    toggle('email', t('settings.notifyEmail'), t('settings.notifyEmailHint')),
    toggle('maintenance', t('settings.notifyMaintenance'), t('settings.notifyMaintenanceHint')),
    toggle('security', t('settings.notifySecurity'), t('settings.notifySecurityHint')),
    toggle('product', t('settings.notifyProduct'), t('settings.notifyProductHint')),
    h('div', { class: 'flex flex-wrap items-center justify-between gap-2 pt-1' }, h('p', { class: 'soft max-w-[60%] text-[10px] leading-5' }, t('settings.notificationDemo')), h('button', { type: 'submit', class: 'btn btn-primary btn-sm' }, icon('check', 'size-3.5'), t('settings.saveNotify'))),
  );

  function languageCard(): HTMLElement {
    return sectionCard({
      title: t('settings.languageTitle'),
      subtitle: t('settings.languageText'),
      body: [
        h(
          'div',
          { class: 'grid gap-2 sm:grid-cols-2' },
          ...[
            { id: 'ar' as Lang, label: t('common.arabic'), sub: 'RTL', preview: 'العربية', dir: 'rtl' as const },
            { id: 'en' as Lang, label: t('common.english'), sub: 'LTR', preview: 'English', dir: 'ltr' as const },
          ].map((item) => {
            const selected = lang === item.id;
            return h(
              'button',
              {
                type: 'button',
                class: `rounded-xl border p-3 text-start transition-all ${selected ? 'border-brand-500 bg-brand-500/[0.06] ring-2 ring-brand-500/25' : 'hover:border-brand-500/40'}`,
                style: selected ? '' : 'border-color: var(--line);',
                'aria-pressed': String(selected),
                onClick: () => {
                  if (!selected) changeLanguage(item.id);
                },
              },
              h('div', { class: 'flex items-center justify-between' }, h('span', { class: 'text-sm font-bold' }, item.label), selected ? icon('checkCircle', 'size-4 text-brand-600') : null),
              h('p', { class: 'mt-1 text-lg font-bold', dir: item.dir }, item.preview),
              h('p', { class: 'soft mt-0.5 text-[10px] font-mono' }, item.sub),
            );
          }),
        ),
      ],
    });
  }

  function themeCard(): HTMLElement {
    const currentTheme = store.getState().settings.theme;
    const selectTheme = (theme: Theme): void => {
      if (theme === currentTheme) return;
      changeTheme(theme);
      const topbarButton = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
      if (topbarButton) replaceChildren(topbarButton, icon(theme === 'dark' ? 'sun' : 'moon', 'size-[19px]'));
      toast('success', t('settings.appearanceSaved'));
      renderAll();
    };

    return sectionCard({
      title: t('settings.themeTitle'),
      subtitle: t('settings.themeText'),
      body: [
        h(
          'div',
          { class: 'grid gap-2 sm:grid-cols-2' },
          ...[
            { id: 'light' as Theme, label: t('common.light'), hint: t('settings.lightHint'), bg: '#f2f4f7', surface: '#ffffff', line: '#d7dee7' },
            { id: 'dark' as Theme, label: t('common.dark'), hint: t('settings.darkHint'), bg: '#10151f', surface: '#1a2230', line: '#2a3545' },
          ].map((item) => {
            const selected = currentTheme === item.id;
            return h(
              'button',
              {
                type: 'button',
                class: `rounded-xl border p-3 text-start transition-all ${selected ? 'border-brand-500 ring-2 ring-brand-500/25' : 'hover:border-brand-500/40'}`,
                style: selected ? '' : 'border-color: var(--line);',
                'aria-pressed': String(selected),
                onClick: () => selectTheme(item.id),
              },
              h(
                'div',
                { class: 'flex h-16 items-end gap-1.5 rounded-lg border p-2', style: `background-color:${item.bg}; border-color:${item.line};` },
                h('span', { class: 'h-4 w-4 rounded', style: `background-color:${item.surface}; border:1px solid ${item.line};` }),
                h('span', { class: 'h-6 flex-1 rounded', style: `background-color:${item.surface}; border:1px solid ${item.line};` }),
                h('span', { class: 'h-4 w-4 rounded-full', style: 'background-color:#00c2d1;' }),
                h('span', { class: 'h-4 w-4 rounded-full', style: 'background-color:#22c55e;' }),
              ),
              h('div', { class: 'mt-2 flex items-center justify-between' }, h('span', { class: 'text-sm font-bold' }, item.label), selected ? icon('checkCircle', 'size-4 text-brand-600') : null),
              h('p', { class: 'soft mt-0.5 text-[10px]' }, item.hint),
            );
          }),
        ),
      ],
    });
  }

  async function resetDemo(): Promise<void> {
    const confirmed = await openDialog({
      title: t('settings.resetTitle'),
      description: t('settings.resetText'),
      confirmLabel: t('settings.resetDemo'),
      cancelLabel: t('common.cancel'),
      danger: true,
    });
    if (!confirmed) return;
    const ok = store.resetDemo(getCsrfToken());
    if (!ok) {
      toast('error', t('errors.sessionExpired'));
      return;
    }
    applyLanguage(store.getState().settings.lang);
    applyTheme(store.getState().settings.theme);
    toast('success', t('settings.resetDone'));
    refreshRoute();
  }

  const dataCard = sectionCard({
    title: t('settings.dataTitle'),
    subtitle: t('settings.dataText'),
    body: [
      notice({ tone: 'warning', title: t('settings.resetTitle'), text: t('settings.resetText'), iconName: 'refresh' }),
      h('p', { class: 'soft mt-3 text-[10px] leading-5' }, t('settings.autoResetNote')),
      h(
        'div',
        { class: 'mt-3 flex flex-wrap items-center justify-between gap-2' },
        h('p', { class: 'soft text-[10px]' }, t('settings.resetKeptSession')),
        h('button', { type: 'button', class: 'btn btn-secondary btn-sm border-red-500/40 text-red-600', onClick: () => void resetDemo() }, icon('refresh', 'size-3.5'), t('settings.resetDemo')),
      ),
    ],
  });

  const aboutCard = sectionCard({
    title: t('settings.aboutTitle'),
    subtitle: t('settings.aboutText'),
    body: [
      h(
        'dl',
        { class: 'grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs' },
        h('dt', { class: 'soft' }, t('settings.version')),
        h('dd', { class: 'font-mono font-semibold' }, APP_VERSION),
        h('dt', { class: 'soft' }, t('settings.stack')),
        h('dd', { class: 'font-semibold' }, 'TypeScript · Vite · Tailwind CSS'),
        h('dt', { class: 'soft' }, t('settings.localData')),
        h('dd', { class: 'muted leading-5' }, t('settings.localDataText')),
      ),
      h('div', { class: 'my-3 border-t', style: 'border-color: var(--line);' }),
      h('p', { class: 'text-xs font-bold' }, t('settings.accessibilityTitle')),
      h('p', { class: 'muted mt-1 text-[11px] leading-6' }, t('settings.accessibilityText')),
      h('p', { class: 'soft mt-1 flex items-center gap-1.5 text-[10px]' }, icon('activity', 'size-3.5'), t('settings.reducedMotion')),
      h('div', { class: 'mt-3 flex flex-wrap gap-2' }, demoBadge(), h('span', { class: 'chip font-mono' }, `v${APP_VERSION}`)),
    ],
  });

  function renderAll(): void {
    replaceChildren(
      contentHost,
      h(
        'div',
        { class: 'grid gap-5 xl:grid-cols-2' },
        sectionCard({ title: t('settings.profileTitle'), subtitle: t('settings.profileText'), body: [profileForm] }),
        sectionCard({ title: t('settings.notifyTitle'), subtitle: t('settings.notifyText'), body: [notifyForm] }),
        languageCard(),
        themeCard(),
        dataCard,
        aboutCard,
      ),
    );
  }

  const contentHost = h('div');
  renderAll();

  return { el: h('div', null, pageHeader({ title: t('settings.title'), subtitle: t('settings.subtitle'), actions: [demoBadge()] }), contentHost), titleKey: 'settings.title' };
}

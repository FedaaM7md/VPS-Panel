/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { t, type MessageKey } from '../i18n';
import { getStore } from '../state/store';
import { changeLanguage, toggleTheme } from '../ui/preferences';
import { brandMark, footerLinks, ownerCredit } from '../ui/layout';
import { h, replaceChildren } from '../ui/dom';
import { icon } from '../ui/icons';
import type { PageInstance } from './types';

export type PublicPageKind = 'about' | 'help' | 'privacy' | 'terms' | 'changelog';

interface PublicCopyKeys {
  titleKey: MessageKey;
  eyebrowKey: MessageKey;
  introKey: MessageKey;
}

const COPY: Record<PublicPageKind, PublicCopyKeys> = {
  about: { titleKey: 'public.aboutTitle', eyebrowKey: 'footer.about', introKey: 'public.aboutIntro' },
  help: { titleKey: 'public.helpTitle', eyebrowKey: 'footer.help', introKey: 'public.helpIntro' },
  privacy: { titleKey: 'public.privacyTitle', eyebrowKey: 'footer.privacy', introKey: 'public.privacyIntro' },
  terms: { titleKey: 'public.termsTitle', eyebrowKey: 'footer.terms', introKey: 'public.termsIntro' },
  changelog: { titleKey: 'public.changelogTitle', eyebrowKey: 'footer.changelog', introKey: 'public.changelogIntro' },
};

function section(title: string, text: string): HTMLElement {
  return h(
    'section',
    { class: 'border-t pt-5', style: 'border-color: var(--line);' },
    h('h2', { class: 'text-base font-bold' }, title),
    h('p', { class: 'muted mt-2 text-sm leading-7' }, text),
  );
}

function faqItem(question: string, answer: string): HTMLElement {
  return h(
    'details',
    { class: 'group border-b py-3', style: 'border-color: var(--line);' },
    h(
      'summary',
      { class: 'flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold' },
      question,
      h('span', { class: 'shrink-0 text-brand-600 transition-transform group-open:rotate-45' }, icon('plus', 'size-4')),
    ),
    h('p', { class: 'muted mt-2 text-sm leading-7' }, answer),
  );
}

function aboutBody(): HTMLElement[] {
  return [
    section(t('public.aboutWhatTitle'), t('public.aboutWhatText')),
    section(t('public.aboutDemoTitle'), t('public.aboutDemoText')),
    h(
      'section',
      { class: 'border-t pt-5', style: 'border-color: var(--line);' },
      h('h2', { class: 'text-base font-bold' }, t('public.aboutContactTitle')),
      h('p', { class: 'muted mt-2 text-sm leading-7' }, t('public.aboutContactText')),
      h(
        'dl',
        { class: 'mt-3 grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6' },
        h('dt', { class: 'soft text-xs' }, t('common.email')),
        h('dd', { class: 'font-mono text-xs' }, t('public.contactEmail')),
        h('dt', { class: 'soft text-xs' }, t('common.phone')),
        h('dd', { class: 'font-mono text-xs' }, t('public.contactPhone')),
        h('dt', { class: 'soft text-xs' }, t('public.addressLabel')),
        h('dd', { class: 'text-xs' }, t('public.contactAddress')),
      ),
    ),
  ];
}

function helpBody(): HTMLElement[] {
  const pairs = [
    [t('public.helpQ1'), t('public.helpA1')],
    [t('public.helpQ2'), t('public.helpA2')],
    [t('public.helpQ3'), t('public.helpA3')],
    [t('public.helpQ4'), t('public.helpA4')],
    [t('public.helpQ5'), t('public.helpA5')],
    [t('public.helpQ6'), t('public.helpA6')],
  ];
  return [h('div', { class: 'mt-2 border-t', style: 'border-color: var(--line);' }, ...pairs.map(([question, answer]) => faqItem(question ?? '', answer ?? '')))];
}

function legalBody(kind: 'privacy' | 'terms'): HTMLElement[] {
  if (kind === 'privacy') {
    return [
      section(t('public.privacyLocalTitle'), t('public.privacyLocalText')),
      section(t('public.privacyTrackTitle'), t('public.privacyTrackText')),
      section(t('public.privacyResetTitle'), t('public.privacyResetText')),
      h('p', { class: 'soft pt-2 text-[10px]' }, t('public.lastUpdated')),
    ];
  }
  return [
    section(t('public.termsDemoTitle'), t('public.termsDemoText')),
    section(t('public.termsIpTitle'), t('public.termsIpText')),
    section(t('public.termsLiabilityTitle'), t('public.termsLiabilityText')),
    h('p', { class: 'soft pt-2 text-[10px]' }, t('public.lastUpdated')),
  ];
}

function changelogBody(): HTMLElement[] {
  return [
    h(
      'ol',
      { class: 'relative ms-2 border-s ps-5', style: 'border-color: var(--line-strong);' },
      h(
        'li',
        { class: 'relative pb-8' },
        h('span', { class: 'absolute -start-[26px] top-1.5 size-2.5 rounded-full border-2', style: 'border-color: var(--surface); background-color: var(--color-brand-500);' }),
        h('p', { class: 'text-[10px] font-semibold text-brand-700 dark:text-brand-300' }, t('public.changelog020Date')),
        h(
          'ul',
          { class: 'muted mt-2 space-y-1.5 text-sm leading-6' },
          ...[t('public.changelog020Item1'), t('public.changelog020Item2'), t('public.changelog020Item3'), t('public.changelog020Item4')].map((item) =>
            h('li', { class: 'flex gap-2' }, h('span', { class: 'mt-2 size-1 shrink-0 rounded-full bg-brand-500' }), item),
          ),
        ),
      ),
      h(
        'li',
        { class: 'relative' },
        h('span', { class: 'absolute -start-[26px] top-1.5 size-2.5 rounded-full border-2', style: 'border-color: var(--surface); background-color: var(--iron);' }),
        h('p', { class: 'text-[10px] font-semibold soft' }, t('public.changelog010Date')),
        h(
          'ul',
          { class: 'muted mt-2 space-y-1.5 text-sm leading-6' },
          ...[t('public.changelog010Item1')].map((item) =>
            h('li', { class: 'flex gap-2' }, h('span', { class: 'mt-2 size-1 shrink-0 rounded-full bg-[color:var(--iron)]' }), item),
          ),
        ),
      ),
    ),
  ];
}

function bodyFor(kind: PublicPageKind): HTMLElement[] {
  switch (kind) {
    case 'about':
      return aboutBody();
    case 'help':
      return helpBody();
    case 'privacy':
      return legalBody('privacy');
    case 'terms':
      return legalBody('terms');
    case 'changelog':
      return changelogBody();
  }
}

function publicHeader(): HTMLElement {
  const state = getStore().getState();
  const lang = state.settings.lang;
  const session = state.session;

  const themeButton = h(
    'button',
    { type: 'button', class: 'icon-btn', 'aria-label': t('common.theme'), 'data-theme-toggle': '' },
    icon(state.settings.theme === 'dark' ? 'sun' : 'moon', 'size-[18px]'),
  );
  themeButton.addEventListener('click', () => {
    toggleTheme();
    replaceChildren(themeButton, icon(getStore().getState().settings.theme === 'dark' ? 'sun' : 'moon', 'size-[18px]'));
  });

  return h(
    'header',
    { class: 'border-b', style: 'border-color: var(--line); background-color: var(--surface);' },
    h(
      'div',
      { class: 'mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6' },
      h(
        'a',
        { href: '#/login', class: 'flex min-w-0 items-center gap-2.5', 'aria-label': t('app.name') },
        brandMark('size-8'),
        h('span', { class: 'truncate text-sm font-bold' }, 'VPS ', h('span', { class: 'font-mono text-[10px] tracking-[0.16em] text-brand-600' }, 'PANEL')),
      ),
      h(
        'nav',
        { class: 'ms-4 hidden items-center gap-4 text-xs font-semibold md:flex', 'aria-label': t('public.navLabel') },
        h('a', { href: '#/about', class: 'hover:text-brand-600' }, t('footer.about')),
        h('a', { href: '#/help', class: 'hover:text-brand-600' }, t('footer.help')),
        h('a', { href: '#/changelog', class: 'hover:text-brand-600' }, t('footer.changelog')),
        h('a', { href: '#/privacy', class: 'hover:text-brand-600' }, t('footer.privacy')),
        h('a', { href: '#/terms', class: 'hover:text-brand-600' }, t('footer.terms')),
      ),
      h(
        'div',
        { class: 'ms-auto flex items-center gap-1' },
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
        ),
        themeButton,
        h(
          'a',
          { href: session ? '#/dashboard' : '#/login', class: 'btn btn-primary btn-sm ms-1' },
          session ? t('public.backToApp') : t('auth.submit'),
          icon('arrowEnd', 'size-3.5 flip-rtl'),
        ),
      ),
    ),
  );
}

function publicFooter(): HTMLElement {
  return h(
    'footer',
    { class: 'mt-12 border-t', style: 'border-color: var(--line); background-color: var(--surface-2);' },
    h(
      'div',
      { class: 'mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-[10px] leading-5 sm:px-6', style: 'color: var(--ink-soft);' },
      h('div', { class: 'flex flex-wrap items-center justify-between gap-3' }, footerLinks(), h('span', null, t('footer.demoNote'))),
      h(
        'div',
        { class: 'flex flex-wrap items-center justify-between gap-3 border-t pt-3', style: 'border-color: var(--line);' },
        h('span', { class: 'font-semibold' }, t('footer.copyright')),
        ownerCredit(),
      ),
    ),
  );
}

export function renderPublicPage(kind: PublicPageKind): PageInstance {
  const copy = COPY[kind];
  const root = h(
    'div',
    { class: 'flex min-h-screen flex-col' },
    publicHeader(),
    h(
      'main',
      { id: 'main', tabindex: '-1', class: 'mx-auto w-full max-w-4xl flex-1 px-4 py-10 outline-none sm:px-6 sm:py-14' },
      h(
        'div',
        { class: 'max-w-2xl' },
        h('p', { class: 'text-[11px] font-semibold text-brand-700 dark:text-brand-300' }, t(copy.eyebrowKey)),
        h('h1', { class: 'mt-2 text-3xl font-bold tracking-tight sm:text-4xl' }, t(copy.titleKey)),
        h('p', { class: 'muted mt-4 text-sm leading-7' }, t(copy.introKey)),
      ),
      h('div', { class: 'mt-8 space-y-5' }, ...bodyFor(kind)),
      h(
        'a',
        { href: '#/login', class: 'btn btn-secondary mt-8' },
        icon('arrowStart', 'size-4 flip-rtl'),
        t('public.backToApp'),
      ),
    ),
    publicFooter(),
  );

  return { el: root, titleKey: copy.titleKey };
}

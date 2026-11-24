/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { t } from '../i18n';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { emptyState } from '../ui/components';
import type { PageInstance } from './types';

export function renderNotFound(): PageInstance {
  const el = h(
    'div',
    { class: 'flex min-h-[55vh] items-center justify-center' },
    h(
      'div',
      { class: 'card w-full max-w-lg p-2' },
      h(
        'div',
        { class: 'relative overflow-hidden rounded-md p-6 text-center', style: 'background-color: var(--surface); border: 1px solid var(--line);' },
        h('p', { class: 'font-mono text-5xl font-extrabold text-brand-600' }, '404'),
        h('div', { class: 'mx-auto mt-4 max-w-sm' }, emptyState({ icon: 'search', title: t('notfound.title'), text: t('notfound.text') })),
        h('a', { href: '#/dashboard', class: 'btn btn-primary mt-2' }, icon('arrowStart', 'size-4 flip-rtl'), t('notfound.back')),
      ),
    ),
  );
  return { el, titleKey: 'notfound.title' };
}

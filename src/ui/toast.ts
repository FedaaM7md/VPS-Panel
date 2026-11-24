/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { h } from './dom';
import { t } from '../i18n';
import { checkCircleIcon, infoCircleIcon, alertTriangleIcon, closeIcon } from './icons';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void;
  /** Milliseconds before auto-dismiss. Defaults to 4 s. */
  duration?: number;
}

let container: HTMLElement | null = null;

function ensureContainer(): HTMLElement {
  if (container && document.body.contains(container)) return container;
  container = h('div', {
    class: 'toast-stack fixed z-[80] end-4 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 no-print',
    role: 'region',
    'aria-label': t('common.notifications'),
    'aria-live': 'polite',
  });
  document.body.appendChild(container);
  return container;
}

const KIND_STYLE: Record<ToastKind, string> = {
  success: 'border-accent-500/40',
  error: 'border-red-500/50',
  info: 'border-brand-500/40',
};

const KIND_ICON: Record<ToastKind, () => SVGElement> = {
  success: checkCircleIcon,
  error: alertTriangleIcon,
  info: infoCircleIcon,
};

export function toast(kind: ToastKind, message: string, options: ToastOptions = {}): void {
  const host = ensureContainer();
  let timer: number | null = null;

  const node = h(
    'div',
    {
      class: `animate-rise flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm shadow-sm ${KIND_STYLE[kind]}`,
      style: 'background-color: var(--surface); color: var(--ink);',
      role: kind === 'error' ? 'alert' : 'status',
    },
    h('span', { class: kind === 'error' ? 'mt-0.5 text-red-500' : kind === 'success' ? 'mt-0.5 text-accent-600' : 'mt-0.5 text-brand-600' }, KIND_ICON[kind]()),
    h('span', { class: 'min-w-0 flex-1 leading-6' }, message),
    options.actionLabel && options.onAction
      ? h(
          'button',
          {
            type: 'button',
            class: 'btn btn-ghost btn-sm -my-1 shrink-0 px-1.5 font-semibold text-brand-700 dark:text-brand-300',
            onClick: () => {
              options.onAction?.();
              dismiss();
            },
          },
          options.actionLabel,
        )
      : null,
    h(
      'button',
      {
        type: 'button',
        class: 'icon-btn -me-1 -mt-1 size-7 shrink-0',
        'aria-label': t('common.close'),
        onClick: () => dismiss(),
      },
      closeIcon(),
    ),
  );

  let removed = false;
  const dismiss = (): void => {
    if (removed) return;
    removed = true;
    if (timer !== null) window.clearTimeout(timer);
    node.remove();
  };

  host.appendChild(node);
  timer = window.setTimeout(dismiss, options.duration ?? 4000);
  // Keep at most four toasts.
  while (host.children.length > 4) {
    host.firstElementChild?.remove();
  }
}

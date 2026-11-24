/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { t } from '../i18n';
import { focusableWithin, h } from './dom';
import { icon } from './icons';

export interface DialogOptions {
  title: string;
  description?: string;
  body?: HTMLElement;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  closeLabel?: string;
  /** Return false to keep the dialog open (e.g. failed validation). */
  onConfirm?: () => boolean;
}

let dialogCount = 0;

/**
 * Accessible modal with focus trapping, Escape handling and focus restoration.
 * Resolves true when confirmed, false when cancelled.
 */
export function openDialog(options: DialogOptions): Promise<boolean> {
  dialogCount += 1;
  const titleId = `dialog-title-${dialogCount}`;
  const descriptionId = `dialog-desc-${dialogCount}`;
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const previousOverflow = document.documentElement.style.overflow;

  let settled = false;

  const closeButton = h(
    'button',
    { type: 'button', class: 'icon-btn -me-1 -mt-1', 'aria-label': options.closeLabel ?? t('common.close') },
    icon('x'),
  );

  const cancelButton = h(
    'button',
    { type: 'button', class: 'btn btn-secondary' },
    options.cancelLabel ?? t('common.cancel'),
  );

  const confirmButton = h(
    'button',
    { type: 'button', class: `btn ${options.danger ? 'btn-danger' : 'btn-primary'}` },
    options.confirmLabel,
  );

  const panel = h(
    'div',
    {
      class: 'card animate-rise max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': titleId,
      'aria-describedby': options.description ? descriptionId : undefined,
      tabindex: '-1',
      style: 'background-color: var(--surface);',
    },
    h(
      'div',
      { class: 'flex items-start justify-between gap-4 px-5 pt-5' },
      h(
        'div',
        null,
        h('h2', { id: titleId, class: 'text-lg font-bold' }, options.title),
        options.description
          ? h('p', { id: descriptionId, class: 'muted mt-1.5 text-sm leading-6' }, options.description)
          : null,
      ),
      closeButton,
    ),
    options.body ? h('div', { class: 'px-5 pt-4' }, options.body) : null,
    h(
      'div',
      { class: 'mt-5 flex flex-wrap items-center justify-end gap-2 px-5 pb-5' },
      cancelButton,
      confirmButton,
    ),
  );

  const overlay = h(
    'div',
    {
      class: 'fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4',
      role: 'presentation',
    },
    panel,
  );

  const focusables = (): HTMLElement[] => {
    const all = focusableWithin(panel);
    return all.length > 0 ? all : [panel];
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(false);
      return;
    }
    if (event.key === 'Tab') {
      const items = focusables();
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
      return;
    }
    if (event.key === 'Enter' && !options.body) {
      event.preventDefault();
      confirmButton.click();
      return;
    }
    if (event.key === 'Enter' && options.body) {
      const target = event.target;
      if (target instanceof HTMLInputElement) {
        event.preventDefault();
        confirmButton.click();
      }
    }
  };

  const onClickBackdrop = (event: MouseEvent): void => {
    if (event.target === overlay) close(false);
  };

  const close = (confirmed: boolean): void => {
    if (settled) return;
    settled = true;
    document.removeEventListener('keydown', onKeyDown, true);
    document.documentElement.style.overflow = previousOverflow;
    overlay.remove();
    if (previousFocus && document.contains(previousFocus)) previousFocus.focus();
    resolvePromise(confirmed);
  };

  let resolvePromise: (value: boolean) => void = () => undefined;
  const promise = new Promise<boolean>((resolve) => {
    resolvePromise = resolve;
  });

  closeButton.addEventListener('click', () => close(false));
  cancelButton.addEventListener('click', () => close(false));
  confirmButton.addEventListener('click', () => {
    if (options.onConfirm && options.onConfirm() === false) return;
    close(true);
  });

  overlay.addEventListener('click', onClickBackdrop);
  document.addEventListener('keydown', onKeyDown, true);
  document.documentElement.style.overflow = 'hidden';
  document.body.appendChild(overlay);

  const preferred = panel.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, select');
  (preferred ?? focusables()[0] ?? panel).focus();

  return promise;
}

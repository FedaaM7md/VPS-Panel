/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
/** Tiny typed DOM builders. Text is always inserted as text nodes (no innerHTML). */

export type Child = Node | string | number | null | undefined | false;
export type Attrs = Record<string, unknown>;
export const SVG_NS = 'http://www.w3.org/2000/svg';

function applyAttrs(element: Element, attrs?: Attrs): void {
  if (!attrs) return;
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;

    if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
      continue;
    }

    if (key === 'class') {
      element.setAttribute('class', String(value));
      continue;
    }

    if (key === 'dataset' && typeof value === 'object') {
      for (const [dataKey, dataValue] of Object.entries(value as Record<string, string>)) {
        (element as HTMLElement).dataset[dataKey] = dataValue;
      }
      continue;
    }

    if (key === 'style' && typeof value === 'object') {
      for (const [styleKey, styleValue] of Object.entries(value as Record<string, string>)) {
        element.setAttribute('style', `${(element.getAttribute('style') ?? '') + styleKey}:${styleValue};`);
      }
      continue;
    }

    if (key === 'for') {
      element.setAttribute('for', String(value));
      continue;
    }

    if (value === true) {
      element.setAttribute(key, '');
      continue;
    }

    // Properties such as value/checked/disabled behave better on live elements.
    if (key in element && element instanceof HTMLElement && !key.startsWith('aria-') && !key.startsWith('data-')) {
      try {
        (element as unknown as Record<string, unknown>)[key] = value;
        continue;
      } catch {
        /* fall through to attribute */
      }
    }

    element.setAttribute(key, String(value));
  }
}

export function appendChildren(element: Element, children: readonly Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) {
      appendChildren(element, child as unknown as readonly Child[]);
      continue;
    }
    element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  applyAttrs(element, attrs ?? undefined);
  appendChildren(element, children);
  return element;
}

export function s<T extends keyof SVGElementTagNameMap>(
  tag: T,
  attrs?: Attrs | null,
  ...children: Child[]
): SVGElementTagNameMap[T] {
  const element = document.createElementNS(SVG_NS, tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (key.startsWith('on') && typeof value === 'function') {
        element.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
        continue;
      }
      element.setAttribute(key, String(value));
    }
  }
  appendChildren(element, children);
  return element;
}

export function clear(element: Element): void {
  while (element.firstChild) element.removeChild(element.firstChild);
}

export function replaceChildren(element: Element, ...children: Child[]): void {
  clear(element);
  appendChildren(element, children);
}

export function iconButton(label: string, child: Node, attrs?: Attrs): HTMLButtonElement {
  return h('button', { type: 'button', class: 'icon-btn', 'aria-label': label, title: label, ...attrs }, child);
}

export function focusableWithin(container: HTMLElement): HTMLElement[] {
  const selector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );
}

/** Clipboard helper with graceful fallback and no external dependency. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const area = h('textarea', { class: 'sr-only', 'aria-hidden': 'true' });
    area.value = text;
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function externalLink(href: string, label: string): HTMLAnchorElement {
  return h(
    'a',
    { class: 'inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline', href, rel: 'noopener noreferrer', target: '_blank' },
    label,
  );
}

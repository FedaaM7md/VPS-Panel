/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
export const ROUTE_EVENT = 'vpspanel:route';

export interface NavigateOptions {
  replace?: boolean;
  force?: boolean;
}

function normalize(to: string): string {
  if (to.startsWith('#')) return to;
  if (to.startsWith('/')) return `#${to}`;
  return `#/${to}`;
}

/** Hash-based navigation; the router listens for hashchange and ROUTE_EVENT. */
export function navigate(to: string, options: NavigateOptions = {}): void {
  const target = normalize(to);
  const current = window.location.hash;

  if (options.replace) {
    if (current !== target) {
      window.history.replaceState(null, '', target);
    }
    window.dispatchEvent(new CustomEvent(ROUTE_EVENT));
    return;
  }

  if (current === target) {
    if (options.force) window.dispatchEvent(new CustomEvent(ROUTE_EVENT));
    return;
  }

  window.location.hash = target;
}

export function refreshRoute(): void {
  window.dispatchEvent(new CustomEvent(ROUTE_EVENT));
}

export interface ParsedLocation {
  path: string;
  query: URLSearchParams;
}

export function parseLocation(hash: string): ParsedLocation {
  const raw = hash.replace(/^#/, '') || '/dashboard';
  const questionIndex = raw.indexOf('?');
  const path = questionIndex >= 0 ? raw.slice(0, questionIndex) : raw;
  const queryString = questionIndex >= 0 ? raw.slice(questionIndex + 1) : '';
  return { path: path || '/dashboard', query: new URLSearchParams(queryString) };
}

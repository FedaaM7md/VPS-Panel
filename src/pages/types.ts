/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import type { MessageKey } from '../i18n';

export interface PageContext {
  path: string;
  query: URLSearchParams;
  params: Record<string, string>;
}

export interface PageInstance {
  el: HTMLElement;
  destroy?: () => void;
  titleKey: MessageKey;
}

export type PageFactory = (ctx: PageContext) => PageInstance;

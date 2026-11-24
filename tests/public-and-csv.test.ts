/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderPublicPage } from '../src/pages/public';
import { csvCell } from '../src/lib/csv';
import { setLanguage } from '../src/i18n';
import { toast } from '../src/ui/toast';

afterEach(() => {
  document.body.replaceChildren();
  setLanguage('ar');
  vi.useRealTimers();
});

describe('public product pages', () => {
  for (const kind of ['about', 'help', 'privacy', 'terms', 'changelog'] as const) {
    it(`renders the ${kind} page with footer credit and demo note`, () => {
      const page = renderPublicPage(kind);
      document.body.replaceChildren(page.el);
      expect(page.el.querySelector('h1')?.textContent).toBeTruthy();
      expect(page.el.textContent).toContain('فداء محمد');
      expect(page.el.textContent).toContain('نسخة عرض');
      const credit = page.el.querySelector<HTMLAnchorElement>('a[href="https://fedaamohamed.com"]');
      expect(credit).not.toBeNull();
      expect(credit?.getAttribute('rel')).toBe('noopener');
    });
  }

  it('localises the page when the language changes', () => {
    setLanguage('en');
    const page = renderPublicPage('about');
    expect(page.el.textContent).toContain('About VPS Panel');
    expect(page.el.textContent).toContain('Designed & built by Fedaa Mohamed');
    expect(page.el.textContent).toContain('Demo build');
  });
});

describe('CSV safety', () => {
  it('quotes cells and neutralises spreadsheet formulas', () => {
    expect(csvCell('web-fra-01')).toBe('"web-fra-01"');
    expect(csvCell('=cmd|calc')).toBe('"\'=cmd|calc"');
    expect(csvCell('+1,2')).toBe('"\'+1,2"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });
});

describe('toast lifecycle', () => {
  it('auto-dismisses after four seconds', () => {
    vi.useFakeTimers();
    toast('success', 'Saved');
    expect(document.querySelectorAll('.toast-stack > *').length).toBe(1);
    vi.advanceTimersByTime(3999);
    expect(document.querySelectorAll('.toast-stack > *').length).toBe(1);
    vi.advanceTimersByTime(1);
    expect(document.querySelectorAll('.toast-stack > *').length).toBe(0);
  });

  it('runs an undo action and closes the toast', () => {
    let undone = false;
    toast('success', 'Removed', { actionLabel: 'Undo', onAction: () => { undone = true; } });
    const action = document.querySelector<HTMLButtonElement>('.toast-stack button');
    action?.click();
    expect(undone).toBe(true);
    expect(document.querySelectorAll('.toast-stack > *').length).toBe(0);
  });
});

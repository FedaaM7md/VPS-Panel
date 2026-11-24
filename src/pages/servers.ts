/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { t } from '../i18n';
import { getStore } from '../state/store';
import { OS_IMAGES, REGIONS, getPlan } from '../data/catalog';
import type { OsId, RegionId, Server, ServerStatus } from '../lib/types';
import { formatDate, formatMoney, formatNumber } from '../lib/format';
import { downloadCsv } from '../lib/csv';
import { h, replaceChildren } from '../ui/dom';
import { icon } from '../ui/icons';
import { pageHeader, emptyState } from '../ui/components';
import { demoBadge, rdpBadge, statusBadge } from '../ui/badges';
import { osName, planName, regionName } from '../ui/labels';
import { toast } from '../ui/toast';
import type { PageContext, PageInstance } from './types';

type StatusFilter = ServerStatus | 'all';
type SortKey = 'name' | 'created' | 'cost' | 'status';

const STATUS_ORDER: Record<ServerStatus, number> = { running: 0, provisioning: 1, rebooting: 2, stopped: 3 };
const PAGE_SIZE = 8;

function selectField(id: string, label: string, value: string, options: Array<{ value: string; label: string }>, onChange: (value: string) => void): HTMLElement {
  const select = h(
    'select',
    {
      id,
      class: 'select h-10',
      onChange: (event: Event) => onChange((event.target as HTMLSelectElement).value),
    },
    ...options.map((option) =>
      h('option', { value: option.value, selected: option.value === value }, option.label),
    ),
  );
  return h('div', null, h('label', { class: 'label text-xs', for: id }, label), select);
}

export function renderServers(ctx: PageContext): PageInstance {
  const store = getStore();
  const lang = store.getState().settings.lang;

  let query = (ctx.query.get('q') ?? '').trim();
  let statusFilter: StatusFilter = 'all';
  let regionFilter: RegionId | 'all' = 'all';
  let osFilter: OsId | 'all' = 'all';
  let sortKey: SortKey = 'name';
  let sortDirection: 'asc' | 'desc' = 'asc';
  let page = 1;
  let filtersOpen = false;

  const searchInput = h('input', {
    type: 'search',
    id: 'servers-search',
    class: 'input h-10 ps-10',
    placeholder: t('servers.searchPlaceholder'),
    'aria-label': t('servers.searchLabel'),
    value: query,
    autocomplete: 'off',
    onInput: (event: Event) => {
      query = (event.target as HTMLInputElement).value;
      applyFilters();
    },
  });

  const clearSearch = h(
    'button',
    {
      type: 'button',
      class: 'icon-btn absolute end-1 top-1/2 size-8 -translate-y-1/2',
      'aria-label': t('servers.clearSearch'),
      onClick: () => {
        query = '';
        searchInput.value = '';
        searchInput.focus();
        applyFilters();
      },
    },
    icon('x', 'size-6'),
  );

  const statusSelect = selectField(
    'filter-status',
    t('servers.statusFilter'),
    statusFilter,
    [
      { value: 'all', label: t('servers.filterAll') },
      { value: 'running', label: t('status.running') },
      { value: 'stopped', label: t('status.stopped') },
      { value: 'rebooting', label: t('status.rebooting') },
      { value: 'provisioning', label: t('status.provisioning') },
    ],
    (value) => {
      statusFilter = value as StatusFilter;
      applyFilters();
    },
  );

  const regionSelect = selectField(
    'filter-region',
    t('servers.regionFilter'),
    regionFilter,
    [
      { value: 'all', label: t('servers.filterAll') },
      ...REGIONS.map((region) => ({ value: region.id, label: regionName(region.id) })),
    ],
    (value) => {
      regionFilter = value as RegionId | 'all';
      applyFilters();
    },
  );

  const osSelect = selectField(
    'filter-os',
    t('servers.imageFilter'),
    osFilter,
    [
      { value: 'all', label: t('servers.filterAll') },
      ...OS_IMAGES.map((image) => ({ value: image.id, label: osName(image.id) })),
    ],
    (value) => {
      osFilter = value as OsId | 'all';
      applyFilters();
    },
  );

  const sortSelect = selectField(
    'sort-servers',
    t('common.sort'),
    sortKey,
    [
      { value: 'name', label: t('servers.sortName') },
      { value: 'created', label: t('servers.sortCreated') },
      { value: 'cost', label: t('servers.sortCost') },
      { value: 'status', label: t('servers.sortStatus') },
    ],
    (value) => {
      sortKey = value as SortKey;
      applyFilters();
    },
  );

  const sortDirectionButton = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-secondary mt-6 h-10 w-10 p-0',
      'aria-label': t('common.sort'),
      title: t('common.sort'),
      onClick: () => {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        sortDirectionButton.setAttribute('aria-label', `${t('common.sort')}: ${sortDirection === 'asc' ? 'A–Z' : 'Z–A'}`);
        applyFilters();
      },
    },
    icon('sort', 'size-4'),
  );

  const resetButton = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-ghost mt-6 h-10',
      onClick: () => {
        query = '';
        statusFilter = 'all';
        regionFilter = 'all';
        osFilter = 'all';
        sortKey = 'name';
        sortDirection = 'asc';
        page = 1;
        searchInput.value = '';
        setSelectValue('filter-status', 'all');
        setSelectValue('filter-region', 'all');
        setSelectValue('filter-os', 'all');
        setSelectValue('sort-servers', 'name');
        renderList();
      },
    },
    icon('refresh', 'size-4'),
    t('servers.resetFilters'),
  );

  function createResetButton(): HTMLButtonElement {
    return h(
      'button',
      {
        type: 'button',
        class: 'btn btn-secondary btn-sm',
        onClick: () => {
          resetButton.click();
        },
      },
      icon('refresh', 'size-3.5'),
      t('servers.resetFilters'),
    );
  }

  const countLabel = h('span', { class: 'text-xs font-semibold' });
  const summaryLabel = h('p', { class: 'soft text-[10px]' });
  const mobileCountLabel = h('span', { class: 'chip' });
  const sheetCountLabel = h('p', { class: 'text-sm font-semibold' });
  const listHost = h('div');
  const paginationHost = h('nav', { class: 'mt-4 flex flex-wrap items-center justify-center gap-2', 'aria-label': t('servers.pagination') });

  const filterBackdrop = h('div', {
    class: 'filters-backdrop',
    onClick: () => setFiltersOpen(false),
  });

  const filterPanel = h(
    'div',
    {
      class: 'filters-panel',
      id: 'servers-filters',
      'data-open': 'false',
      role: 'group',
      'aria-label': t('servers.filtersTitle'),
    },
    h(
      'div',
      { class: 'filters-sheet-head' },
      h('div', null, h('p', { class: 'text-sm font-bold' }, t('servers.filtersTitle')), h('p', { class: 'soft text-[10px]' }, t('servers.filtersHint'))),
      h(
        'button',
        {
          type: 'button',
          class: 'icon-btn',
          'aria-label': t('common.close'),
          onClick: () => setFiltersOpen(false),
        },
        icon('x', 'size-4'),
      ),
    ),
    statusSelect,
    regionSelect,
    osSelect,
    sortSelect,
    h('div', { class: 'flex items-end gap-1.5' }, sortDirectionButton, resetButton),
    h(
      'div',
      { class: 'filters-sheet-foot' },
      sheetCountLabel,
      h(
        'button',
        { type: 'button', class: 'btn btn-primary', onClick: () => setFiltersOpen(false) },
        t('servers.showResults'),
      ),
    ),
  );

  function setFiltersOpen(open: boolean): void {
    filtersOpen = open;
    filterPanel.dataset.open = String(open);
    filterBackdrop.dataset.open = String(open);
    filterToggle.setAttribute('aria-expanded', String(open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) {
      window.setTimeout(() => statusSelect.querySelector('select')?.focus(), 0);
    } else {
      filterToggle.focus();
    }
  }

  const filterToggle = h(
    'button',
    {
      type: 'button',
      class: 'filters-toggle btn btn-secondary h-10 shrink-0',
      'aria-expanded': 'false',
      'aria-controls': 'servers-filters',
      'data-filter-toggle': '',
      onClick: () => setFiltersOpen(!filtersOpen),
    },
    icon('filter', 'size-4'),
    t('servers.filters'),
    mobileCountLabel,
  );

  function setSelectValue(id: string, value: string): void {
    const element = document.getElementById(id);
    if (element instanceof HTMLSelectElement) element.value = value;
  }

  function filteredServers(): Server[] {
    const term = query.trim().toLowerCase();
    const servers = store.getState().servers.filter((server) => {
      if (statusFilter !== 'all' && server.status !== statusFilter) return false;
      if (regionFilter !== 'all' && server.regionId !== regionFilter) return false;
      if (osFilter !== 'all' && server.osId !== osFilter) return false;
      if (!term) return true;
      const haystack = `${server.name} ${server.hostname} ${server.ipv4} ${regionName(server.regionId)} ${osName(server.osId)} ${planName(server.planId)}`.toLowerCase();
      return haystack.includes(term);
    });

    const direction = sortDirection === 'asc' ? 1 : -1;
    return servers.slice().sort((left, right) => {
      switch (sortKey) {
        case 'name':
          return left.name.localeCompare(right.name) * direction;
        case 'created':
          return (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) * direction;
        case 'cost':
          return (getPlan(left.planId).priceUsd - getPlan(right.planId).priceUsd) * direction;
        case 'status':
          return (STATUS_ORDER[left.status] - STATUS_ORDER[right.status]) * direction;
      }
    });
  }

  function highlightedName(server: Server): Array<Node | string> {
    const term = query.trim();
    if (!term) return [server.name];
    const index = server.name.toLowerCase().indexOf(term.toLowerCase());
    if (index < 0) return [server.name];
    return [
      server.name.slice(0, index),
      h('mark', { class: 'rounded-sm bg-brand-500/25 px-0.5 text-inherit' }, server.name.slice(index, index + term.length)),
      server.name.slice(index + term.length),
    ];
  }

  function openLink(server: Server): HTMLAnchorElement {
    return h(
      'a',
      { href: `#/servers/${server.id}`, class: 'text-sm font-bold hover:text-brand-600', title: `${t('servers.open')}: ${server.name}` },
      ...highlightedName(server),
    );
  }

  function buildTable(servers: readonly Server[]): HTMLElement {
    return h(
      'div',
      { class: 'hidden overflow-x-auto xl:block' },
      h(
        'table',
        { class: 'table min-w-[880px]' },
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            h('th', null, t('servers.name')),
            h('th', null, t('servers.status')),
            h('th', null, t('servers.plan')),
            h('th', null, t('servers.region')),
            h('th', null, t('servers.image')),
            h('th', null, t('servers.specs')),
            h('th', { class: 'text-end' }, t('servers.cost')),
            h('th', { class: 'text-end' }, h('span', { class: 'sr-only' }, t('common.actions'))),
          ),
        ),
        h(
          'tbody',
          null,
          ...servers.map((server) => {
            const plan = getPlan(server.planId);
            return h(
              'tr',
              { class: 'transition-colors' },
              h(
                'td',
                { class: 'min-w-[190px]' },
                h('div', { class: 'flex items-center gap-2' }, openLink(server), server.rdp ? rdpBadge() : null),
                h('p', { class: 'soft mt-0.5 font-mono text-[10px]' }, `${server.hostname} · ${server.ipv4}`),
              ),
              h('td', null, statusBadge(server.status)),
              h(
                'td',
                null,
                h('p', { class: 'text-xs font-semibold' }, planName(server.planId)),
                h('p', { class: 'soft text-[10px]' }, `${formatNumber(server.cpuCores, lang)} vCPU · ${formatNumber(server.ramGb, lang)} GB`),
              ),
              h(
                'td',
                null,
                h('p', { class: 'text-xs font-semibold' }, regionName(server.regionId)),
                h('p', { class: 'soft font-mono text-[10px]' }, server.regionId.toUpperCase()),
              ),
              h(
                'td',
                null,
                h('p', { class: 'text-xs font-semibold' }, osName(server.osId)),
              ),
              h(
                'td',
                null,
                h('p', { class: 'text-xs tabular-nums' }, `${formatNumber(plan.vcpu, lang)} / ${formatNumber(plan.ramGb, lang)} GB`),
                h('p', { class: 'soft text-[10px]' }, `${formatNumber(plan.diskGb, lang)} GB · ${formatNumber(plan.bandwidthTb, lang)} TB`),
              ),
              h('td', { class: 'text-end text-xs font-bold tabular-nums' }, formatMoney(plan.priceUsd, lang)),
              h(
                'td',
                { class: 'text-end' },
                h('a', { href: `#/servers/${server.id}`, class: 'btn btn-secondary btn-sm' }, t('servers.manage'), icon('chevronEnd', 'size-3 flip-rtl')),
              ),
            );
          }),
        ),
      ),
    );
  }

  function buildCards(servers: readonly Server[]): HTMLElement {
    return h(
      'div',
      { class: 'grid gap-3 p-3 sm:grid-cols-2 xl:hidden' },
      ...servers.map((server) => {
        const plan = getPlan(server.planId);
        return h(
          'article',
          { class: 'rounded-xl border p-4', style: 'border-color: var(--line); background-color: var(--surface);' },
          h(
            'div',
            { class: 'flex items-start justify-between gap-2' },
            h('div', { class: 'min-w-0' }, h('div', { class: 'flex items-center gap-2' }, openLink(server), server.rdp ? rdpBadge() : null), h('p', { class: 'soft mt-0.5 truncate font-mono text-[10px]' }, `${server.hostname} · ${server.ipv4}`)),
            statusBadge(server.status),
          ),
          h(
            'dl',
            { class: 'mt-3 grid grid-cols-2 gap-2 text-[11px]' },
            h('div', null, h('dt', { class: 'soft text-[10px]' }, t('servers.plan')), h('dd', { class: 'font-semibold' }, planName(server.planId))),
            h('div', null, h('dt', { class: 'soft text-[10px]' }, t('servers.region')), h('dd', { class: 'font-semibold' }, regionName(server.regionId))),
            h('div', null, h('dt', { class: 'soft text-[10px]' }, t('servers.image')), h('dd', { class: 'font-semibold' }, osName(server.osId))),
            h('div', null, h('dt', { class: 'soft text-[10px]' }, t('servers.cost')), h('dd', { class: 'font-semibold' }, formatMoney(plan.priceUsd, lang))),
          ),
          h(
            'div',
            { class: 'mt-3 flex items-center justify-between gap-2' },
            h('span', { class: 'soft text-[10px]' }, t('common.created'), ' ', formatDate(server.createdAt, lang)),
            h('a', { href: `#/servers/${server.id}`, class: 'btn btn-secondary btn-sm' }, t('servers.manage'), icon('chevronEnd', 'size-3 flip-rtl')),
          ),
        );
      }),
    );
  }

  function renderPagination(total: number): void {
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (pages <= 1) {
      replaceChildren(paginationHost);
      return;
    }
    replaceChildren(
      paginationHost,
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-secondary btn-sm',
          disabled: page <= 1,
          'aria-label': t('servers.prevPage'),
          onClick: () => {
            page = Math.max(1, page - 1);
            renderList();
          },
        },
        icon('chevronStart', 'size-4 flip-rtl'),
        t('servers.prevPage'),
      ),
      h('span', { class: 'px-1 text-[11px] tabular-nums' }, t('servers.pageOf', { page: formatNumber(page, lang), pages: formatNumber(pages, lang) })),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-secondary btn-sm',
          disabled: page >= pages,
          'aria-label': t('servers.nextPage'),
          onClick: () => {
            page = Math.min(pages, page + 1);
            renderList();
          },
        },
        t('servers.nextPage'),
        icon('chevronEnd', 'size-4 flip-rtl'),
      ),
    );
  }

  function renderList(): void {
    const state = store.getState();
    const filtered = filteredServers();
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > pages) page = pages;
    if (page < 1) page = 1;
    const servers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const counts = {
      running: state.servers.filter((server) => server.status === 'running').length,
      stopped: state.servers.filter((server) => server.status === 'stopped').length,
      transient: state.servers.filter((server) => server.status === 'rebooting' || server.status === 'provisioning').length,
    };

    countLabel.textContent = t('servers.count', { count: formatNumber(total, lang) });
    summaryLabel.textContent = `${t('servers.results', { shown: formatNumber(total, lang), total: formatNumber(state.servers.length, lang) })} · ${t('servers.fleetSummary', {
      running: formatNumber(counts.running, lang),
      stopped: formatNumber(counts.stopped, lang),
      transient: formatNumber(counts.transient, lang),
    })}`;
    mobileCountLabel.textContent = formatNumber(total, lang);
    sheetCountLabel.textContent = t('servers.resultsCount', { count: formatNumber(total, lang) });

    if (state.servers.length === 0) {
      replaceChildren(
        listHost,
        h(
          'div',
          { class: 'card' },
          emptyState({
            icon: 'serverOff',
            title: t('servers.emptyFleet'),
            text: t('servers.emptyFleetHint'),
            action: h('a', { href: '#/servers/new', class: 'btn btn-primary' }, icon('plus', 'size-4'), t('servers.create')),
          }),
        ),
      );
      replaceChildren(paginationHost);
      return;
    }

    if (total === 0) {
      replaceChildren(
        listHost,
        h(
          'div',
          { class: 'card' },
          emptyState({
            icon: 'search',
            title: t('servers.empty'),
            text: t('servers.emptyHint'),
            action: createResetButton(),
          }),
        ),
      );
      replaceChildren(paginationHost);
      return;
    }

    replaceChildren(listHost, h('div', { class: 'card overflow-hidden' }, buildTable(servers), buildCards(servers)));
    renderPagination(total);
  }

  function applyFilters(): void {
    page = 1;
    renderList();
  }

  function exportCsv(): void {
    const servers = filteredServers();
    if (servers.length === 0) {
      toast('info', t('servers.exportEmpty'));
      return;
    }
    const rows: Array<Array<string | number>> = [
      [
        t('servers.name'),
        t('servers.status'),
        t('servers.plan'),
        t('servers.region'),
        t('servers.image'),
        t('servers.ip'),
        t('common.cores'),
        t('server.ram'),
        t('server.disk'),
        t('servers.cost'),
      ],
      ...servers.map((server) => {
        const plan = getPlan(server.planId);
        return [
          server.name,
          t(`status.${server.status}`),
          planName(server.planId),
          regionName(server.regionId),
          osName(server.osId),
          server.ipv4,
          server.cpuCores,
          server.ramGb,
          server.diskGb,
          plan.priceUsd,
        ];
      }),
    ];
    downloadCsv(`vps-panel-servers-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast('success', t('servers.exportDone', { count: formatNumber(servers.length, lang) }));
  }

  const exportButton = h(
    'button',
    { type: 'button', class: 'btn btn-secondary btn-sm', onClick: exportCsv },
    icon('download', 'size-3.5'),
    t('servers.exportCsv'),
  );

  const root = h(
    'div',
    null,
    pageHeader({
      title: t('servers.title'),
      subtitle: t('servers.subtitle'),
      actions: [h('a', { href: '#/servers/new', class: 'btn btn-primary' }, icon('plus', 'size-4'), t('servers.create'))],
    }),
    h(
      'div',
      { class: 'card mb-4 p-4' },
      h(
        'div',
        { class: 'servers-filters' },
        h(
          'div',
          { class: 'servers-search-row' },
          h(
            'div',
            { class: 'min-w-0 flex-1' },
            h('label', { class: 'label text-xs', for: 'servers-search' }, t('common.search')),
            h('div', { class: 'relative' }, h('span', { class: 'pointer-events-none absolute start-3 top-1/2 -translate-y-1/2', style: 'color: var(--ink-soft);' }, icon('search', 'size-4')), searchInput, clearSearch),
          ),
          filterToggle,
        ),
        filterPanel,
      ),
    ),
    h(
      'div',
      { class: 'mb-3 flex flex-wrap items-center justify-between gap-2' },
      h('div', { class: 'flex flex-wrap items-center gap-2' }, addCount(countLabel), demoBadge(), exportButton),
      summaryLabel,
    ),
    listHost,
    paginationHost,
    h(
      'p',
      { class: 'soft mt-3 flex items-center gap-1.5 text-[10px]' },
      icon('info', 'size-3.5'),
      t('servers.demoTable'),
    ),
    filterBackdrop,
  );

  function addCount(node: HTMLElement): HTMLElement {
    return h('span', { class: 'chip' }, icon('server', 'size-3.5'), node);
  }

  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && filtersOpen) setFiltersOpen(false);
  };
  document.addEventListener('keydown', onKey);

  renderList();
  const unsubscribe = store.subscribe(() => renderList());

  return {
    el: root,
    titleKey: 'servers.title',
    destroy: () => {
      unsubscribe();
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    },
  };
}

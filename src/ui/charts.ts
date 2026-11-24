/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import type { ServerStatus } from '../lib/types';
import { h, s, replaceChildren } from './dom';
import { formatNumber, formatPercent } from '../lib/format';
import type { Lang } from '../lib/types';

let gradientCounter = 0;

function nextId(): string {
  gradientCounter += 1;
  return `vpspanel-chart-${gradientCounter}`;
}

export interface SparklineOptions {
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  label?: string;
}

export function sparkline(values: readonly number[], options: SparklineOptions = {}): SVGSVGElement {
  const width = options.width ?? 120;
  const height = options.height ?? 36;
  const padding = 2;
  const color = options.color ?? 'var(--color-accent-500)';
  const id = nextId();
  const svg = s('svg', {
    viewBox: `0 0 ${width} ${height}`,
    class: 'h-full w-full overflow-visible',
    preserveAspectRatio: 'none',
    role: 'img',
    'aria-label': options.label ?? 'Sparkline',
  });

  if (values.length === 0) {
    svg.appendChild(s('path', { d: `M${padding} ${height / 2}H${width - padding}`, stroke: color, 'stroke-width': '1.5', fill: 'none' }));
    return svg;
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  const span = max - min || 1;
  const step = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;
  const points: Array<{ x: number; y: number }> = values.map((value, index) => ({
    x: Number((padding + index * step).toFixed(2)),
    y: Number((height - padding - ((value - min) / span) * (height - padding * 2)).toFixed(2)),
  }));

  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
  const first = points[0];
  const last = points[points.length - 1];

  if (options.fill !== false && first && last) {
    const defs = s('defs');
    const gradient = s('linearGradient', { id, x1: '0', y1: '0', x2: '0', y2: '1' });
    gradient.appendChild(s('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '0.28' }));
    gradient.appendChild(s('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0' }));
    defs.appendChild(gradient);
    svg.appendChild(defs);
    svg.appendChild(
      s('path', {
        d: `${line} L${last.x} ${height} L${first.x} ${height} Z`,
        fill: `url(#${id})`,
        stroke: 'none',
      }),
    );
  }

  svg.appendChild(s('path', { d: line, fill: 'none', stroke: color, 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  if (last) {
    svg.appendChild(s('circle', { cx: last.x, cy: last.y, r: '2', fill: color }));
  }
  return svg;
}

export interface AreaChartOptions {
  color?: string;
  secondaryValues?: readonly number[];
  secondaryColor?: string;
  label: string;
  height?: number;
}

/** Two-series area chart with a fixed viewBox, rendered responsively. */
export function areaChart(values: readonly number[], options: AreaChartOptions): SVGSVGElement {
  const width = 640;
  const height = options.height ?? 210;
  const paddingX = 8;
  const paddingY = 12;
  const color = options.color ?? 'var(--color-accent-500)';
  const secondaryColor = options.secondaryColor ?? 'var(--color-brand-500)';
  const id = nextId();
  const svg = s('svg', {
    viewBox: `0 0 ${width} ${height}`,
    class: 'h-auto w-full',
    preserveAspectRatio: 'none',
    role: 'img',
    'aria-label': options.label,
  });

  const defs = s('defs');
  const gradient = s('linearGradient', { id, x1: '0', y1: '0', x2: '0', y2: '1' });
  gradient.appendChild(s('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '0.3' }));
  gradient.appendChild(s('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0.02' }));
  defs.appendChild(gradient);
  svg.appendChild(defs);

  for (let line = 0; line <= 4; line += 1) {
    const y = paddingY + ((height - paddingY * 2) / 4) * line;
    svg.appendChild(
      s('line', {
        x1: '0',
        x2: String(width),
        y1: String(y),
        y2: String(y),
        stroke: 'var(--line)',
        'stroke-width': '1',
        'stroke-dasharray': line === 4 ? '0' : '4 6',
      }),
    );
  }

  const all = options.secondaryValues ? [...values, ...options.secondaryValues] : [...values];
  let max = 0;
  for (const value of all) if (value > max) max = value;
  max = max <= 0 ? 1 : max * 1.15;

  const buildPath = (series: readonly number[]): { line: string; area: string } => {
    if (series.length === 0) return { line: '', area: '' };
    const step = series.length > 1 ? (width - paddingX * 2) / (series.length - 1) : 0;
    const points = series.map((value, index) => {
      const x = paddingX + index * step;
      const y = height - paddingY - (Math.max(0, value) / max) * (height - paddingY * 2);
      return `${Number(x.toFixed(2))} ${Number(y.toFixed(2))}`;
    });
    const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point}`).join(' ');
    const firstX = paddingX;
    const lastX = paddingX + (series.length - 1) * step;
    return { line, area: `${line} L${Number(lastX.toFixed(2))} ${height} L${firstX} ${height} Z` };
  };

  const primary = buildPath(values);
  if (primary.area) {
    svg.appendChild(s('path', { d: primary.area, fill: `url(#${id})`, stroke: 'none' }));
  }
  if (primary.line) {
    svg.appendChild(
      s('path', { d: primary.line, fill: 'none', stroke: color, 'stroke-width': '2.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    );
  }

  if (options.secondaryValues && options.secondaryValues.length > 0) {
    const secondary = buildPath(options.secondaryValues);
    if (secondary.line) {
      svg.appendChild(
        s('path', {
          d: secondary.line,
          fill: 'none',
          stroke: secondaryColor,
          'stroke-width': '1.6',
          'stroke-dasharray': '5 5',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-opacity': '0.85',
        }),
      );
    }
  }

  return svg;
}

export function gaugeColor(value: number): string {
  if (value >= 85) return 'var(--color-red-500)';
  if (value >= 70) return 'var(--color-amber-500)';
  return 'var(--color-accent-500)';
}

export interface GaugeOptions {
  size?: number;
  label: string;
  lang: Lang;
  unit?: string;
  detail?: string;
}

/** Circular gauge with a textual value (colour is never the only signal). */
export function gauge(value: number, options: GaugeOptions): HTMLElement {
  const size = options.size ?? 104;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.max(0, Math.min(100, value));
  const offset = circumference - (percent / 100) * circumference;
  const color = gaugeColor(percent);

  const svg = s('svg', {
    viewBox: '0 0 104 104',
    width: String(size),
    height: String(size),
    class: 'block',
    role: 'img',
    'aria-label': `${options.label}: ${formatPercent(percent, options.lang)}`,
  });
  svg.appendChild(s('circle', { cx: '52', cy: '52', r: String(radius), fill: 'none', stroke: 'var(--surface-3)', 'stroke-width': '9' }));
  svg.appendChild(
    s('circle', {
      cx: '52',
      cy: '52',
      r: String(radius),
      fill: 'none',
      stroke: color,
      'stroke-width': '9',
      'stroke-linecap': 'round',
      'stroke-dasharray': String(circumference),
      'stroke-dashoffset': String(offset),
      transform: 'rotate(-90 52 52)',
      style: 'transition: stroke-dashoffset 600ms ease;',
    }),
  );
  svg.appendChild(
    s(
      'text',
      {
        x: '52',
        y: '52',
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        fill: 'currentColor',
        'font-size': '20',
        'font-weight': '700',
      },
      `${formatNumber(percent, options.lang, { maximumFractionDigits: 1 })}%`,
    ),
  );

  return h(
    'div',
    { class: 'flex flex-col items-center gap-1.5 text-center' },
    h('span', { class: 'relative inline-flex' }, svg),
    h('span', { class: 'text-xs font-semibold' }, options.label),
    options.detail ? h('span', { class: 'soft text-[11px]' }, options.detail) : null,
  );
}

export interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

export function donut(segments: readonly DonutSegment[], centerLabel: string, centerValue: string): SVGSVGElement {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  const svg = s('svg', {
    viewBox: '0 0 100 100',
    class: 'size-32',
    role: 'img',
    'aria-label': segments.map((segment) => `${segment.label}: ${segment.value}`).join(', '),
  });

  svg.appendChild(s('circle', { cx: '50', cy: '50', r: String(radius), fill: 'none', stroke: 'var(--surface-3)', 'stroke-width': '12' }));

  let offset = 0;
  for (const segment of segments) {
    if (segment.value <= 0) continue;
    const portion = (segment.value / total) * circumference;
    svg.appendChild(
      s('circle', {
        cx: '50',
        cy: '50',
        r: String(radius),
        fill: 'none',
        stroke: segment.color,
        'stroke-width': '12',
        'stroke-dasharray': `${Math.max(0, portion - 3)} ${circumference}`,
        'stroke-dashoffset': String(-offset),
        'stroke-linecap': 'round',
        transform: 'rotate(-90 50 50)',
      }),
    );
    offset += portion;
  }

  svg.appendChild(
    s(
      'text',
      {
        x: '50',
        y: '47',
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        fill: 'currentColor',
        'font-size': '16',
        'font-weight': '700',
      },
      centerValue,
    ),
  );
  svg.appendChild(
    s(
      'text',
      {
        x: '50',
        y: '61',
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        fill: 'var(--ink-muted)',
        'font-size': '7',
        'font-weight': '600',
      },
      centerLabel,
    ),
  );
  return svg;
}

export interface LegendItem {
  label: string;
  color: string;
  value?: string;
}

export function chartLegend(items: readonly LegendItem[]): HTMLElement {
  return h(
    'div',
    { class: 'flex flex-wrap items-center gap-x-4 gap-y-2 text-xs' },
    ...items.map((item) =>
      h(
        'span',
        { class: 'inline-flex items-center gap-1.5' },
        h('span', { class: 'size-2.5 rounded-full', style: `background-color:${item.color}` }),
        h('span', { class: 'muted' }, item.label),
        item.value ? h('span', { class: 'font-semibold' }, item.value) : null,
      ),
    ),
  );
}

export function statusColor(status: ServerStatus): string {
  switch (status) {
    case 'running':
      return 'var(--color-accent-500)';
    case 'stopped':
      return 'var(--color-slate-400)';
    case 'rebooting':
      return 'var(--color-amber-500)';
    case 'provisioning':
      return 'var(--color-brand-500)';
  }
}

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

/** Lightweight bar chart for usage; each bar carries a visible tooltip. */
export function barChart(data: readonly BarDatum[], options: { height?: number; unit?: string; lang: Lang }): HTMLElement {
  const max = data.reduce((highest, datum) => Math.max(highest, datum.value), 1);
  const height = options.height ?? 140;
  return h(
    'div',
    { class: 'flex items-end gap-2 sm:gap-3', style: `height:${height + 34}px`, role: 'img', 'aria-label': data.map((d) => `${d.label}: ${d.value}`).join(', ') },
    ...data.map((datum) =>
      h(
        'div',
        { class: 'flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5', title: `${datum.label}: ${formatNumber(datum.value, options.lang)}${options.unit ?? ''}` },
        h('span', { class: 'text-[10px] font-semibold' }, `${formatNumber(datum.value, options.lang, { maximumFractionDigits: 1 })}${options.unit ?? ''}`),
        h('span', {
          class: 'w-full max-w-10 rounded-t-md',
          style: `height:${Math.max(4, (datum.value / max) * height)}px; background-color:${datum.color ?? 'var(--color-brand-500)'}; opacity:0.85;`,
        }),
        h('span', { class: 'soft w-full truncate text-center text-[10px]' }, datum.label),
      ),
    ),
  );
}

export function replaceChart(host: HTMLElement, chart: Node): void {
  replaceChildren(host, chart);
}

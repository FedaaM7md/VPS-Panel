/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { s } from './dom';

/** Original stroke icon set — no third-party icon font or logo assets. */
export type IconName =
  | 'dashboard'
  | 'server'
  | 'plus'
  | 'creditCard'
  | 'settings'
  | 'logout'
  | 'sun'
  | 'moon'
  | 'globe'
  | 'search'
  | 'chevronDown'
  | 'chevronUp'
  | 'chevronStart'
  | 'chevronEnd'
  | 'menu'
  | 'x'
  | 'bell'
  | 'check'
  | 'alertTriangle'
  | 'info'
  | 'play'
  | 'stop'
  | 'restart'
  | 'camera'
  | 'shield'
  | 'shieldCheck'
  | 'key'
  | 'terminal'
  | 'copy'
  | 'trash'
  | 'external'
  | 'cpu'
  | 'memory'
  | 'disk'
  | 'network'
  | 'sparkles'
  | 'user'
  | 'filter'
  | 'sort'
  | 'download'
  | 'lock'
  | 'mail'
  | 'building'
  | 'code'
  | 'clock'
  | 'checkCircle'
  | 'xCircle'
  | 'activity'
  | 'arrowUpRight'
  | 'refresh'
  | 'eye'
  | 'eyeOff'
  | 'calendar'
  | 'wallet'
  | 'monitor'
  | 'mapPin'
  | 'zap'
  | 'serverOff'
  | 'more'
  | 'command'
  | 'layers'
  | 'gauge'
  | 'arrowStart'
  | 'arrowEnd'
  | 'wifi';

interface Shape {
  tag: keyof SVGElementTagNameMap;
  attrs: Record<string, string>;
}

const ICONS: Record<IconName, Shape[]> = {
  dashboard: [
    { tag: 'rect', attrs: { x: '3', y: '3', width: '7.5', height: '7.5', rx: '1.6' } },
    { tag: 'rect', attrs: { x: '13.5', y: '3', width: '7.5', height: '7.5', rx: '1.6' } },
    { tag: 'rect', attrs: { x: '3', y: '13.5', width: '7.5', height: '7.5', rx: '1.6' } },
    { tag: 'rect', attrs: { x: '13.5', y: '13.5', width: '7.5', height: '7.5', rx: '1.6' } },
  ],
  server: [
    { tag: 'rect', attrs: { x: '3', y: '4', width: '18', height: '6', rx: '2' } },
    { tag: 'rect', attrs: { x: '3', y: '14', width: '18', height: '6', rx: '2' } },
    { tag: 'circle', attrs: { cx: '7', cy: '7', r: '0.9', fill: 'currentColor', stroke: 'none' } },
    { tag: 'circle', attrs: { cx: '7', cy: '17', r: '0.9', fill: 'currentColor', stroke: 'none' } },
    { tag: 'path', attrs: { d: 'M11 7h6M11 17h6' } },
  ],
  plus: [
    { tag: 'path', attrs: { d: 'M12 5v14M5 12h14' } },
  ],
  creditCard: [
    { tag: 'rect', attrs: { x: '2.5', y: '5', width: '19', height: '14', rx: '2.5' } },
    { tag: 'path', attrs: { d: 'M2.5 10h19' } },
    { tag: 'path', attrs: { d: 'M6 15h4' } },
  ],
  settings: [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '3' } },
    { tag: 'path', attrs: { d: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4' } },
  ],
  logout: [
    { tag: 'path', attrs: { d: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4' } },
    { tag: 'path', attrs: { d: 'M10 8l-4 4 4 4M6 12h10' } },
  ],
  sun: [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '4' } },
    { tag: 'path', attrs: { d: 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' } },
  ],
  moon: [
    { tag: 'path', attrs: { d: 'M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z' } },
  ],
  globe: [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '9' } },
    { tag: 'ellipse', attrs: { cx: '12', cy: '12', rx: '4', ry: '9' } },
    { tag: 'path', attrs: { d: 'M3 12h18' } },
  ],
  search: [
    { tag: 'circle', attrs: { cx: '11', cy: '11', r: '7' } },
    { tag: 'path', attrs: { d: 'm16.5 16.5 4.5 4.5' } },
  ],
  chevronDown: [{ tag: 'path', attrs: { d: 'm6 9 6 6 6-6' } }],
  chevronUp: [{ tag: 'path', attrs: { d: 'm6 15 6-6 6 6' } }],
  chevronStart: [{ tag: 'path', attrs: { d: 'M15 6 9 12l6 6' } }],
  chevronEnd: [{ tag: 'path', attrs: { d: 'm9 6 6 6-6 6' } }],
  menu: [{ tag: 'path', attrs: { d: 'M4 7h16M4 12h16M4 17h16' } }],
  x: [{ tag: 'path', attrs: { d: 'm6 6 12 12M18 6 6 18' } }],
  bell: [
    { tag: 'path', attrs: { d: 'M18 8a6 6 0 1 0-12 0c0 6-3 7-3 7h18s-3-1-3-7' } },
    { tag: 'path', attrs: { d: 'M10.5 21a2 2 0 0 0 3 0' } },
  ],
  check: [{ tag: 'path', attrs: { d: 'm5 13 5 5L19 6' } }],
  alertTriangle: [
    { tag: 'path', attrs: { d: 'M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z' } },
    { tag: 'path', attrs: { d: 'M12 9v4.5' } },
    { tag: 'circle', attrs: { cx: '12', cy: '17.2', r: '0.9', fill: 'currentColor', stroke: 'none' } },
  ],
  info: [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '9' } },
    { tag: 'path', attrs: { d: 'M12 11v5' } },
    { tag: 'circle', attrs: { cx: '12', cy: '7.8', r: '0.9', fill: 'currentColor', stroke: 'none' } },
  ],
  play: [{ tag: 'path', attrs: { d: 'M8 5.5 19 12 8 18.5Z', fill: 'currentColor', stroke: 'none' } }],
  stop: [{ tag: 'rect', attrs: { x: '6', y: '6', width: '12', height: '12', rx: '1.5', fill: 'currentColor', stroke: 'none' } }],
  restart: [
    { tag: 'path', attrs: { d: 'M20 11a8 8 0 1 1-2.4-5.6' } },
    { tag: 'path', attrs: { d: 'M20 4v6h-6' } },
  ],
  camera: [
    { tag: 'path', attrs: { d: 'M4 8h3l1.4-2h7.2L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z' } },
    { tag: 'circle', attrs: { cx: '12', cy: '13', r: '3.5' } },
  ],
  shield: [
    { tag: 'path', attrs: { d: 'M12 3 5 6v5c0 5 3.5 8.5 7 10 3.5-1.5 7-5 7-10V6l-7-3Z' } },
  ],
  shieldCheck: [
    { tag: 'path', attrs: { d: 'M12 3 5 6v5c0 5 3.5 8.5 7 10 3.5-1.5 7-5 7-10V6l-7-3Z' } },
    { tag: 'path', attrs: { d: 'm9 12 2 2 4-4.5' } },
  ],
  key: [
    { tag: 'circle', attrs: { cx: '7.5', cy: '15.5', r: '4.5' } },
    { tag: 'path', attrs: { d: 'm10.8 12.2 9.2-9.2M17 3l4 4M14.8 5.2l4 4' } },
  ],
  terminal: [
    { tag: 'rect', attrs: { x: '3', y: '4', width: '18', height: '16', rx: '2' } },
    { tag: 'path', attrs: { d: 'm7 9 3 3-3 3M12.5 15H17' } },
  ],
  copy: [
    { tag: 'rect', attrs: { x: '8', y: '8', width: '12', height: '12', rx: '2' } },
    { tag: 'path', attrs: { d: 'M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2' } },
  ],
  trash: [
    { tag: 'path', attrs: { d: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5' } },
  ],
  external: [
    { tag: 'path', attrs: { d: 'M14 4h6v6M20 4l-9 9' } },
    { tag: 'path', attrs: { d: 'M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5' } },
  ],
  cpu: [
    { tag: 'rect', attrs: { x: '6', y: '6', width: '12', height: '12', rx: '2' } },
    { tag: 'rect', attrs: { x: '9.5', y: '9.5', width: '5', height: '5', rx: '1' } },
    { tag: 'path', attrs: { d: 'M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3' } },
  ],
  memory: [
    { tag: 'rect', attrs: { x: '3', y: '7', width: '18', height: '10', rx: '2' } },
    { tag: 'path', attrs: { d: 'M7 17v4M12 17v4M17 17v4M7 10v4M11 10v4M15 10v4' } },
  ],
  disk: [
    { tag: 'ellipse', attrs: { cx: '12', cy: '5.5', rx: '8', ry: '3' } },
    { tag: 'path', attrs: { d: 'M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3' } },
  ],
  network: [
    { tag: 'circle', attrs: { cx: '12', cy: '5', r: '2.5' } },
    { tag: 'circle', attrs: { cx: '5', cy: '19', r: '2.5' } },
    { tag: 'circle', attrs: { cx: '19', cy: '19', r: '2.5' } },
    { tag: 'path', attrs: { d: 'M12 7.5V12M12 12l-5.3 4.8M12 12l5.3 4.8' } },
  ],
  sparkles: [
    { tag: 'path', attrs: { d: 'M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z' } },
    { tag: 'path', attrs: { d: 'M19 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z' } },
  ],
  user: [
    { tag: 'circle', attrs: { cx: '12', cy: '8', r: '4' } },
    { tag: 'path', attrs: { d: 'M4 21a8 8 0 0 1 16 0' } },
  ],
  filter: [{ tag: 'path', attrs: { d: 'M3 5h18l-7 8v6l-4 2v-8L3 5Z' } }],
  sort: [{ tag: 'path', attrs: { d: 'm8 9 4-4 4 4M8 15l4 4 4-4' } }],
  download: [
    { tag: 'path', attrs: { d: 'M12 3v12M7 10l5 5 5-5M5 21h14' } },
  ],
  lock: [
    { tag: 'rect', attrs: { x: '4', y: '10', width: '16', height: '11', rx: '2' } },
    { tag: 'path', attrs: { d: 'M8 10V7a4 4 0 0 1 8 0v3' } },
  ],
  mail: [
    { tag: 'rect', attrs: { x: '3', y: '5', width: '18', height: '14', rx: '2' } },
    { tag: 'path', attrs: { d: 'm3 7 9 6 9-6' } },
  ],
  building: [
    { tag: 'path', attrs: { d: 'M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17M15 9h4a1 1 0 0 1 1 1v11M2 21h20' } },
    { tag: 'path', attrs: { d: 'M7 7h4M7 11h4M7 15h4' } },
  ],
  code: [{ tag: 'path', attrs: { d: 'm8 8-4 4 4 4M16 8l4 4-4 4' } }],
  clock: [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '9' } },
    { tag: 'path', attrs: { d: 'M12 7v5l3 2' } },
  ],
  checkCircle: [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '9' } },
    { tag: 'path', attrs: { d: 'm8 12.5 3 3 5.5-6' } },
  ],
  xCircle: [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '9' } },
    { tag: 'path', attrs: { d: 'm9 9 6 6M15 9l-6 6' } },
  ],
  activity: [{ tag: 'path', attrs: { d: 'M3 12h4l3-7 4 14 3-7h4' } }],
  arrowUpRight: [{ tag: 'path', attrs: { d: 'M7 17 17 7M8 7h9v9' } }],
  refresh: [
    { tag: 'path', attrs: { d: 'M20 11a8 8 0 1 1-2.4-5.6' } },
    { tag: 'path', attrs: { d: 'M20 4v6h-6' } },
  ],
  eye: [
    { tag: 'path', attrs: { d: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z' } },
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '3' } },
  ],
  eyeOff: [
    { tag: 'path', attrs: { d: 'M3 3l18 18' } },
    { tag: 'path', attrs: { d: 'M10.6 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.4 4.2M6.5 6.6A16.5 16.5 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 5.2-1.3' } },
  ],
  calendar: [
    { tag: 'rect', attrs: { x: '3', y: '5', width: '18', height: '16', rx: '2' } },
    { tag: 'path', attrs: { d: 'M3 10h18M8 3v4M16 3v4' } },
  ],
  wallet: [
    { tag: 'rect', attrs: { x: '3', y: '6', width: '18', height: '13', rx: '2.5' } },
    { tag: 'path', attrs: { d: 'M3 10h18' } },
    { tag: 'circle', attrs: { cx: '16.5', cy: '14.5', r: '1.2', fill: 'currentColor', stroke: 'none' } },
  ],
  monitor: [
    { tag: 'rect', attrs: { x: '3', y: '4', width: '18', height: '12', rx: '2' } },
    { tag: 'path', attrs: { d: 'M12 16v4M8 20h8' } },
  ],
  mapPin: [
    { tag: 'path', attrs: { d: 'M12 21s7-6.2 7-12A7 7 0 0 0 5 9c0 5.8 7 12 7 12Z' } },
    { tag: 'circle', attrs: { cx: '12', cy: '9', r: '2.5' } },
  ],
  zap: [{ tag: 'path', attrs: { d: 'M13 2 4 14h6l-1 8 9-12h-6l1-8Z' } }],
  serverOff: [
    { tag: 'rect', attrs: { x: '3', y: '4', width: '18', height: '6', rx: '2' } },
    { tag: 'rect', attrs: { x: '3', y: '14', width: '18', height: '6', rx: '2' } },
    { tag: 'path', attrs: { d: 'M6 7h.01M6 17h.01M11 7h6M11 17h4M4 3l16 18' } },
  ],
  more: [
    { tag: 'circle', attrs: { cx: '5', cy: '12', r: '1.3', fill: 'currentColor', stroke: 'none' } },
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '1.3', fill: 'currentColor', stroke: 'none' } },
    { tag: 'circle', attrs: { cx: '19', cy: '12', r: '1.3', fill: 'currentColor', stroke: 'none' } },
  ],
  command: [
    { tag: 'path', attrs: { d: 'M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6Z' } },
  ],
  layers: [
    { tag: 'path', attrs: { d: 'm12 3-9 5 9 5 9-5-9-5Z' } },
    { tag: 'path', attrs: { d: 'm3 12 9 5 9-5M3 16l9 5 9-5' } },
  ],
  gauge: [
    { tag: 'path', attrs: { d: 'M20 18a8 8 0 1 0-16 0' } },
    { tag: 'path', attrs: { d: 'm12 14 4-5' } },
    { tag: 'circle', attrs: { cx: '12', cy: '14', r: '1.2', fill: 'currentColor', stroke: 'none' } },
  ],
  arrowStart: [{ tag: 'path', attrs: { d: 'M20 12H4M10 6l-6 6 6 6' } }],
  arrowEnd: [{ tag: 'path', attrs: { d: 'M4 12h16M14 6l6 6-6 6' } }],
  wifi: [
    { tag: 'path', attrs: { d: 'M2.5 8.5a15 15 0 0 1 19 0M5.5 12a10 10 0 0 1 13 0M8.5 15.5a5 5 0 0 1 7 0' } },
    { tag: 'circle', attrs: { cx: '12', cy: '19', r: '1.2', fill: 'currentColor', stroke: 'none' } },
  ],
};

export function icon(name: IconName, className = 'size-5'): SVGSVGElement {
  const svg = s('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.8',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    class: className,
    'aria-hidden': 'true',
    focusable: 'false',
  });
  for (const shape of ICONS[name]) {
    svg.appendChild(s(shape.tag, shape.attrs));
  }
  return svg;
}

export const closeIcon = (): SVGSVGElement => icon('x');
export const checkCircleIcon = (): SVGSVGElement => icon('checkCircle');
export const infoCircleIcon = (): SVGSVGElement => icon('info');
export const alertTriangleIcon = (): SVGSVGElement => icon('alertTriangle');

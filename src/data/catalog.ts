/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import type { OsId, OsImage, Plan, PlanId, Region, RegionId } from '../lib/types';

/** Static catalog of demo hosting plans. Prices are illustrative. */
export const PLANS: readonly Plan[] = [
  { id: 'starter', vcpu: 2, ramGb: 4, diskGb: 80, bandwidthTb: 2, priceUsd: 12, rdp: false, popular: false },
  { id: 'business', vcpu: 4, ramGb: 8, diskGb: 160, bandwidthTb: 5, priceUsd: 24, rdp: false, popular: true },
  { id: 'scale', vcpu: 8, ramGb: 16, diskGb: 320, bandwidthTb: 10, priceUsd: 48, rdp: false, popular: false },
  { id: 'rdp', vcpu: 4, ramGb: 16, diskGb: 200, bandwidthTb: 6, priceUsd: 59, rdp: true, popular: false },
];

export const REGIONS: readonly Region[] = [
  { id: 'fra', code: 'FRA', latencyMs: 12, zone: 'eu' },
  { id: 'dxb', code: 'DXB', latencyMs: 24, zone: 'me' },
  { id: 'ruh', code: 'RUH', latencyMs: 18, zone: 'me' },
  { id: 'ams', code: 'AMS', latencyMs: 16, zone: 'eu' },
  { id: 'iad', code: 'IAD', latencyMs: 92, zone: 'us' },
  { id: 'sin', code: 'SIN', latencyMs: 148, zone: 'apac' },
];

export const OS_IMAGES: readonly OsImage[] = [
  { id: 'ubuntu-2404', name: 'Ubuntu', family: 'linux', version: '24.04 LTS', rdp: false },
  { id: 'debian-12', name: 'Debian', family: 'linux', version: '12', rdp: false },
  { id: 'rocky-9', name: 'Rocky Linux', family: 'linux', version: '9', rdp: false },
  { id: 'windows-2022', name: 'Windows Server', family: 'windows', version: '2022', rdp: true },
  { id: 'windows-2025', name: 'Windows Server', family: 'windows', version: '2025', rdp: true },
];

const planMap = new Map<PlanId, Plan>(PLANS.map((p) => [p.id, p]));
const regionMap = new Map<RegionId, Region>(REGIONS.map((r) => [r.id, r]));
const osMap = new Map<OsId, OsImage>(OS_IMAGES.map((o) => [o.id, o]));

export function getPlan(id: PlanId): Plan {
  const plan = planMap.get(id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
}

export function getRegion(id: RegionId): Region {
  const region = regionMap.get(id);
  if (!region) throw new Error(`Unknown region: ${id}`);
  return region;
}

export function getOs(id: OsId): OsImage {
  const os = osMap.get(id);
  if (!os) throw new Error(`Unknown OS: ${id}`);
  return os;
}

export function isPlanId(value: string): value is PlanId {
  return planMap.has(value as PlanId);
}

export function isRegionId(value: string): value is RegionId {
  return regionMap.has(value as RegionId);
}

export function isOsId(value: string): value is OsId {
  return osMap.has(value as OsId);
}

/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import type { Server, ServerMetrics, ServerStatus } from './types';
import { clamp } from './format';

/** FNV-1a 32-bit hash. Stable across browsers and Node. */
export function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Mulberry32 PRNG — tiny, fast and fully deterministic. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SeriesOptions {
  base: number;
  amplitude: number;
  noise: number;
  min?: number;
  max?: number;
  count?: number;
  sample?: number;
  spikeChance?: number;
}

/**
 * Builds a seeded, smooth-ish pseudo-random walk. The same seed, sample and
 * options always produce exactly the same series.
 */
export function buildSeries(seed: string, options: SeriesOptions): number[] {
  const count = options.count ?? 40;
  const min = options.min ?? 0;
  const max = options.max ?? 100;
  const random = mulberry32(hashString(seed));
  const phase = random() * Math.PI * 2;
  const period = 5 + random() * 6;
  const sampleOffset = options.sample ?? 0;
  const spikeChance = options.spikeChance ?? 0;
  const values: number[] = [];

  for (let index = 0; index < count; index += 1) {
    const wave = Math.sin((index + sampleOffset) / period + phase) * options.amplitude;
    const jitter = (random() - 0.5) * 2 * options.noise;
    let value = options.base + wave + jitter;
    if (spikeChance > 0 && random() < spikeChance) {
      value += options.amplitude * (0.6 + random() * 0.8);
    }
    values.push(Math.round(clamp(value, min, max) * 10) / 10);
  }
  return values;
}

export interface MetricSource {
  id: string;
  status: ServerStatus;
  cpuCores: number;
  ramGb: number;
  diskGb: number;
  sample: number;
  points?: number;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function lastOf(values: readonly number[]): number {
  return values[values.length - 1] ?? 0;
}

/**
 * Deterministic simulated telemetry for one server. Nothing is measured; the
 * values are derived from the server id, its status and the sample index.
 */
export function computeMetrics(source: MetricSource): ServerMetrics {
  const points = source.points ?? 40;
  const sample = source.sample;
  const base = hashString(source.id);
  const running = source.status === 'running';

  const cpuBase = running ? 24 + (base % 34) : source.status === 'rebooting' ? 9 : 1.5;
  const memoryBase = running ? 40 + ((base >>> 3) % 32) : source.status === 'rebooting' ? 18 : 0.6;
  const diskBase = 46 + ((base >>> 5) % 34);
  const inboundBase = running ? 40 + ((base >>> 7) % 140) : 0;
  const outboundBase = running ? 25 + ((base >>> 11) % 90) : 0;

  const cpuSeries = buildSeries(`${source.id}:cpu`, {
    base: cpuBase,
    amplitude: running ? 11 : 1.2,
    noise: running ? 7 : 0.6,
    count: points,
    sample,
    spikeChance: running ? 0.035 : 0,
    min: 0,
    max: 99,
  });

  const memorySeries = buildSeries(`${source.id}:memory`, {
    base: memoryBase,
    amplitude: running ? 4.5 : 0.4,
    noise: running ? 1.8 : 0.2,
    count: points,
    sample,
    min: 0,
    max: 96,
  });

  const diskSeries = buildSeries(`${source.id}:disk`, {
    base: diskBase,
    amplitude: 0.9,
    noise: 0.25,
    count: points,
    sample,
    min: 0,
    max: 97,
  });

  const networkSeries = buildSeries(`${source.id}:net-in`, {
    base: inboundBase,
    amplitude: running ? 35 : 0,
    noise: running ? 16 : 0,
    count: points,
    sample,
    spikeChance: running ? 0.05 : 0,
    min: 0,
    max: 480,
  });

  const outboundSeries = buildSeries(`${source.id}:net-out`, {
    base: outboundBase,
    amplitude: running ? 22 : 0,
    noise: running ? 11 : 0,
    count: points,
    sample,
    min: 0,
    max: 320,
  });

  return {
    cpu: round(lastOf(cpuSeries)),
    memory: round(lastOf(memorySeries)),
    disk: round(lastOf(diskSeries)),
    netIn: Math.round(lastOf(networkSeries)),
    netOut: Math.round(lastOf(outboundSeries)),
    series: {
      cpu: cpuSeries,
      memory: memorySeries,
      disk: diskSeries,
      network: networkSeries,
    },
  };
}

export function computeServerMetrics(server: Server, sample: number, points = 40): ServerMetrics {
  return computeMetrics({
    id: server.id,
    status: server.status,
    cpuCores: server.cpuCores,
    ramGb: server.ramGb,
    diskGb: server.diskGb,
    sample,
    points,
  });
}

export interface FleetTotals {
  vcpu: number;
  ramGb: number;
  diskGb: number;
  running: number;
  stopped: number;
  transient: number;
  total: number;
  avgCpu: number;
  avgMemory: number;
  avgDisk: number;
}

export function fleetTotals(servers: readonly Server[], sample: number): FleetTotals {
  let vcpu = 0;
  let ramGb = 0;
  let diskGb = 0;
  let running = 0;
  let stopped = 0;
  let transient = 0;
  let cpuSum = 0;
  let memorySum = 0;
  let diskSum = 0;

  for (const server of servers) {
    vcpu += server.cpuCores;
    ramGb += server.ramGb;
    diskGb += server.diskGb;
    if (server.status === 'running') running += 1;
    else if (server.status === 'stopped') stopped += 1;
    else transient += 1;

    const metrics = computeServerMetrics(server, sample, 1);
    cpuSum += metrics.cpu;
    memorySum += metrics.memory;
    diskSum += metrics.disk;
  }

  const total = servers.length;
  return {
    vcpu,
    ramGb,
    diskGb,
    running,
    stopped,
    transient,
    total,
    avgCpu: total === 0 ? 0 : Math.round((cpuSum / total) * 10) / 10,
    avgMemory: total === 0 ? 0 : Math.round((memorySum / total) * 10) / 10,
    avgDisk: total === 0 ? 0 : Math.round((diskSum / total) * 10) / 10,
  };
}

/** Element-wise average of per-server series, for dashboard-level charts. */
export function fleetSeries(
  servers: readonly Server[],
  kind: 'cpu' | 'memory' | 'disk' | 'network',
  sample: number,
  points = 40,
): number[] {
  if (servers.length === 0) return buildSeries('empty-fleet', { base: 0, amplitude: 0, noise: 0, count: points, min: 0, max: 0 });
  const result = new Array<number>(points).fill(0);
  for (const server of servers) {
    const metrics = computeServerMetrics(server, sample, points);
    const series = metrics.series[kind];
    for (let index = 0; index < points; index += 1) {
      result[index] = (result[index] ?? 0) + (series[index] ?? 0);
    }
  }
  return result.map((value) => Math.round((value / servers.length) * 10) / 10);
}

/** Deterministic sample index derived from wall-clock time (4 s buckets). */
export function sampleFromTime(nowMs: number): number {
  return Math.floor(nowMs / 4000);
}

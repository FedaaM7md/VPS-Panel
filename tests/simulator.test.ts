/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { describe, expect, it } from 'vitest';
import {
  computeMetrics,
  fleetSeries,
  fleetTotals,
  buildSeries,
  hashString,
  mulberry32,
  sampleFromTime,
} from '../src/lib/simulator';
import { createSeedState } from '../src/data/seed';

const NOW = Date.UTC(2026, 10, 23, 12, 0, 0);

describe('seeded simulator', () => {
  it('hashes strings deterministically', () => {
    expect(hashString('web-fra-01')).toBe(hashString('web-fra-01'));
    expect(hashString('web-fra-01')).not.toBe(hashString('web-fra-02'));
    expect(hashString('')).toBeGreaterThanOrEqual(0);
  });

  it('produces a repeatable PRNG stream within [0, 1)', () => {
    const first = mulberry32(12345);
    const second = mulberry32(12345);
    const values = Array.from({ length: 20 }, () => first());
    const repeated = Array.from({ length: 20 }, () => second());
    expect(values).toEqual(repeated);
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(new Set(values).size).toBeGreaterThan(1);
  });

  it('builds identical series for the same seed and sample', () => {
    const options = { base: 40, amplitude: 10, noise: 4, count: 30, sample: 12, min: 0, max: 100 };
    expect(buildSeries('db-dxb-01:cpu', options)).toEqual(buildSeries('db-dxb-01:cpu', options));
  });

  it('changes the series when seed or sample changes', () => {
    const options = { base: 40, amplitude: 10, noise: 4, count: 30, sample: 12 };
    const base = buildSeries('db-dxb-01:cpu', options);
    expect(buildSeries('db-dxb-02:cpu', options)).not.toEqual(base);
    expect(buildSeries('db-dxb-01:cpu', { ...options, sample: 13 })).not.toEqual(base);
  });

  it('respects bounds, count and numeric output', () => {
    const series = buildSeries('edge', {
      base: 50,
      amplitude: 100,
      noise: 100,
      count: 64,
      sample: 3,
      min: 5,
      max: 95,
      spikeChance: 0.5,
    });
    expect(series).toHaveLength(64);
    for (const value of series) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(95);
    }
  });

  it('computes deterministic per-server metrics with realistic ranges', () => {
    const input = {
      id: 'srv_web_fra_01',
      status: 'running' as const,
      cpuCores: 4,
      ramGb: 8,
      diskGb: 160,
      sample: 99,
      points: 40,
    };
    const first = computeMetrics(input);
    const second = computeMetrics(input);
    expect(first).toEqual(second);
    expect(first.series.cpu).toHaveLength(40);
    expect(first.series.memory).toHaveLength(40);
    expect(first.series.disk).toHaveLength(40);
    expect(first.series.network).toHaveLength(40);
    expect(first.cpu).toBeGreaterThan(0);
    expect(first.memory).toBeGreaterThan(0);
    expect(first.disk).toBeGreaterThan(0);
    expect(first.netIn).toBeGreaterThan(0);
  });

  it('keeps stopped servers idle but retains disk values', () => {
    const metrics = computeMetrics({
      id: 'srv_stage_ams_01',
      status: 'stopped',
      cpuCores: 2,
      ramGb: 4,
      diskGb: 80,
      sample: 4,
    });
    expect(metrics.cpu).toBeLessThan(5);
    expect(metrics.memory).toBeLessThan(5);
    expect(metrics.netIn).toBe(0);
    expect(metrics.netOut).toBe(0);
    expect(metrics.disk).toBeGreaterThan(10);
  });

  it('moves metrics with the sample index', () => {
    const base = { id: 'srv_api_fra_02', status: 'running' as const, cpuCores: 8, ramGb: 16, diskGb: 320 };
    const first = computeMetrics({ ...base, sample: 10 });
    const later = computeMetrics({ ...base, sample: 80 });
    expect(first.series.cpu).not.toEqual(later.series.cpu);
  });

  it('aggregates fleet totals from the seeded demo fleet', () => {
    const state = createSeedState(NOW);
    const totals = fleetTotals(state.servers, 42);
    expect(totals.total).toBe(state.servers.length);
    expect(totals.running + totals.stopped + totals.transient).toBe(totals.total);
    expect(totals.vcpu).toBeGreaterThan(0);
    expect(totals.avgCpu).toBeGreaterThanOrEqual(0);
    expect(totals.avgCpu).toBeLessThanOrEqual(100);
  });

  it('averages fleet series and handles an empty fleet', () => {
    const state = createSeedState(NOW);
    const series = fleetSeries(state.servers, 'cpu', 7, 24);
    expect(series).toHaveLength(24);
    expect(series.every((value) => value >= 0 && value <= 100)).toBe(true);
    const empty = fleetSeries([], 'cpu', 7, 12);
    expect(empty).toHaveLength(12);
    expect(empty.every((value) => value === 0)).toBe(true);
  });

  it('derives a stable 4-second sample index', () => {
    expect(sampleFromTime(0)).toBe(0);
    expect(sampleFromTime(3999)).toBe(0);
    expect(sampleFromTime(4000)).toBe(1);
  });
});

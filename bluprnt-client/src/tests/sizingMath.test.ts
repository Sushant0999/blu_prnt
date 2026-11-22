import { describe, it, expect } from 'vitest';
import {
  calculateServerCount,
  calculateStorage,
  calculateBandwidth,
  calculateCacheRam,
} from '../core/algorithms/sizingMath';

describe('Back-of-the-Envelope Capacity Calculators', () => {
  it('calculates QPS and server count accurately with N+2 headroom', () => {
    // 10M DAU * 30 req/day = 300M req/day -> ~3472 avg QPS. Peak 3x = ~10416 peak QPS.
    // Single server 1500 QPS -> ceil(10416 / 1500) = 7 base servers. Headroom 1.25x -> ceil(7 * 1.25) = 9 servers.
    const res = calculateServerCount({
      dau: 10_000_000,
      requestsPerUserPerDay: 30,
      peakToAvgRatio: 3.0,
      serverCapacityQps: 1500,
      redundancyBuffer: 1.25,
    });

    expect(res.totalDailyRequests).toBe(300_000_000);
    expect(res.avgQps).toBe(3472);
    expect(res.peakQps).toBe(10416);
    expect(res.baseServersRequired).toBe(7);
    expect(res.recommendedServers).toBe(9);
    expect(res.costPerHourEstimate).toBeGreaterThan(0);
  });

  it('calculates storage sizing with multi-year retention and replication', () => {
    // 50M records * 2 KB = 100M KB/day = ~95.37 GB/day
    const res = calculateStorage({
      dailyNewRecords: 50_000_000,
      avgRecordSizeKb: 2,
      retentionYears: 3,
      replicationFactor: 3,
      indexAndMetadataOverheadPct: 20,
    });

    expect(res.dailyRawGb).toBeCloseTo(95.37, 1);
    expect(res.totalWithReplicationTb).toBeGreaterThan(res.totalRawTb);
    expect(res.totalWithOverheadTb).toBeGreaterThan(res.totalWithReplicationTb);
    expect(res.monthlyStorageCostUsd).toBeGreaterThan(0);
  });

  it('calculates CDN offload and origin bandwidth', () => {
    // 10,000 RPS * 64 KB * 8 = 5,120,000 Kbps = 5,120 Mbps = 5.12 Gbps.
    // 85% cache hit -> CDN offloads 85%, Origin handles 15%.
    const res = calculateBandwidth({
      peakRps: 10_000,
      avgResponseSizeKb: 64,
      cdnCacheHitRatePct: 85,
    });

    expect(res.peakTotalEgressGbps).toBeCloseTo(5.12, 1);
    expect(res.cdnOffloadedMbps).toBeCloseTo(5120 * 0.85, 0);
    expect(res.originEgressMbps).toBeCloseTo(5120 * 0.15, 0);
  });

  it('calculates cache RAM working set and database fallthrough QPS', () => {
    // 100M keys * 20% hot = 20M hot keys.
    // Value 500B + 64B overhead = 564 bytes * 20M = 11,280,000,000 bytes = ~10.5 GB RAM.
    const res = calculateCacheRam({
      totalUniqueKeys: 100_000_000,
      hotDataPercent: 20,
      avgValueSizeBytes: 500,
      overheadPerKeyBytes: 64,
      totalReadQps: 20_000,
      expectedHitRatePct: 90,
    });

    expect(res.hotKeyCount).toBe(20_000_000);
    expect(res.workingSetRamGb).toBeCloseTo(10.5, 0);
    expect(res.recommendedRamWithHeadroomGb).toBeGreaterThan(res.workingSetRamGb);
    expect(res.cacheHitQps).toBe(18000);
    expect(res.databaseFallthroughQps).toBe(2000);
    expect(res.estimatedInstancesRequired).toBe(1);
  });
});

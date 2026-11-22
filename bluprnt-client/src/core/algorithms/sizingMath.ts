/**
 * Pure back-of-the-envelope mathematical calculators for distributed systems sizing.
 * All functions are deterministic and unit-testable.
 */

export interface ServerCountInput {
  dau: number; // Daily Active Users
  requestsPerUserPerDay: number;
  peakToAvgRatio: number; // e.g. 2.5x to 4x
  serverCapacityQps: number; // QPS a single server instance can handle comfortably
  redundancyBuffer: number; // e.g. 1.2 for 20% headroom / N+2
}

export interface ServerCountResult {
  totalDailyRequests: number;
  avgQps: number;
  peakQps: number;
  baseServersRequired: number;
  recommendedServers: number;
  costPerHourEstimate: number; // assuming ~$0.08/hr per 4-vCPU unit
}

export function calculateServerCount(input: ServerCountInput): ServerCountResult {
  const totalDailyRequests = input.dau * input.requestsPerUserPerDay;
  const secondsInDay = 86400;
  const avgQps = Math.round(totalDailyRequests / secondsInDay);
  const peakQps = Math.round(avgQps * input.peakToAvgRatio);
  
  const baseServersRequired = Math.max(1, Math.ceil(peakQps / Math.max(1, input.serverCapacityQps)));
  const recommendedServers = Math.ceil(baseServersRequired * Math.max(1, input.redundancyBuffer));
  const costPerHourEstimate = Number((recommendedServers * 0.08).toFixed(2));

  return {
    totalDailyRequests,
    avgQps,
    peakQps,
    baseServersRequired,
    recommendedServers,
    costPerHourEstimate,
  };
}

export interface StorageSizingInput {
  dailyNewRecords: number;
  avgRecordSizeKb: number;
  retentionYears: number;
  replicationFactor: number; // typically 3x
  indexAndMetadataOverheadPct: number; // e.g. 25%
}

export interface StorageSizingResult {
  dailyRawGb: number;
  annualRawTb: number;
  totalRawTb: number;
  totalWithReplicationTb: number;
  totalWithOverheadTb: number;
  monthlyStorageCostUsd: number; // assuming standard cloud storage ~$0.021/GB
}

export function calculateStorage(input: StorageSizingInput): StorageSizingResult {
  // 1 KB = 10^-6 GB
  const dailyRawKb = input.dailyNewRecords * input.avgRecordSizeKb;
  const dailyRawGb = dailyRawKb / (1024 * 1024);
  const annualRawTb = (dailyRawGb * 365) / 1024;
  const totalRawTb = annualRawTb * input.retentionYears;
  const totalWithReplicationTb = totalRawTb * input.replicationFactor;
  const totalWithOverheadTb = totalWithReplicationTb * (1 + input.indexAndMetadataOverheadPct / 100);
  
  const totalGb = totalWithOverheadTb * 1024;
  const monthlyStorageCostUsd = Math.round(totalGb * 0.021);

  return {
    dailyRawGb: Number(dailyRawGb.toFixed(2)),
    annualRawTb: Number(annualRawTb.toFixed(2)),
    totalRawTb: Number(totalRawTb.toFixed(2)),
    totalWithReplicationTb: Number(totalWithReplicationTb.toFixed(2)),
    totalWithOverheadTb: Number(totalWithOverheadTb.toFixed(2)),
    monthlyStorageCostUsd,
  };
}

export interface BandwidthInput {
  peakRps: number;
  avgResponseSizeKb: number;
  cdnCacheHitRatePct: number; // e.g. 85%
}

export interface BandwidthResult {
  peakTotalEgressMbps: number;
  peakTotalEgressGbps: number;
  cdnOffloadedMbps: number;
  originEgressMbps: number;
  monthlyTotalEgressTb: number;
  monthlyCdnCostUsd: number; // avg ~$0.05/GB
}

export function calculateBandwidth(input: BandwidthInput): BandwidthResult {
  // bits per second = RPS * size in KB * 8 * 1024
  const peakTotalKbps = input.peakRps * input.avgResponseSizeKb * 8;
  const peakTotalMbps = peakTotalKbps / 1000;
  const peakTotalGbps = peakTotalMbps / 1000;

  const hitRateFrac = Math.min(100, Math.max(0, input.cdnCacheHitRatePct)) / 100;
  const cdnOffloadedMbps = peakTotalMbps * hitRateFrac;
  const originEgressMbps = peakTotalMbps * (1 - hitRateFrac);

  // Approximate monthly volume assuming 40% duty cycle of peak
  const avgMonthlyMbps = peakTotalMbps * 0.4;
  const monthlyTotalBytes = (avgMonthlyMbps * 1_000_000 / 8) * (86400 * 30);
  const monthlyTotalEgressTb = monthlyTotalBytes / (1024 ** 4);
  const monthlyCdnCostUsd = Math.round((monthlyTotalBytes / (1024 ** 3)) * 0.05);

  return {
    peakTotalEgressMbps: Number(peakTotalMbps.toFixed(2)),
    peakTotalEgressGbps: Number(peakTotalGbps.toFixed(3)),
    cdnOffloadedMbps: Number(cdnOffloadedMbps.toFixed(2)),
    originEgressMbps: Number(originEgressMbps.toFixed(2)),
    monthlyTotalEgressTb: Number(monthlyTotalEgressTb.toFixed(2)),
    monthlyCdnCostUsd,
  };
}

export interface CacheRamInput {
  totalUniqueKeys: number;
  hotDataPercent: number; // Pareto: e.g. 20%
  avgValueSizeBytes: number;
  overheadPerKeyBytes: number; // Redis key overhead ~64 bytes
  totalReadQps: number;
  expectedHitRatePct: number; // e.g. 85%
}

export interface CacheRamResult {
  hotKeyCount: number;
  workingSetRamGb: number;
  recommendedRamWithHeadroomGb: number; // +30% for fragmentation & snapshots
  cacheHitQps: number;
  databaseFallthroughQps: number;
  estimatedInstancesRequired: number; // e.g. 16GB redis nodes
}

export function calculateCacheRam(input: CacheRamInput): CacheRamResult {
  const hotKeyCount = Math.round(input.totalUniqueKeys * (input.hotDataPercent / 100));
  const bytesPerKey = input.avgValueSizeBytes + input.overheadPerKeyBytes;
  const totalWorkingSetBytes = hotKeyCount * bytesPerKey;
  const workingSetRamGb = totalWorkingSetBytes / (1024 ** 3);
  
  // 30% safety buffer for jemalloc memory fragmentation, AOF buffers, and replication backlog
  const recommendedRamWithHeadroomGb = workingSetRamGb * 1.3;
  
  const hitRate = Math.min(100, Math.max(0, input.expectedHitRatePct)) / 100;
  const cacheHitQps = Math.round(input.totalReadQps * hitRate);
  const databaseFallthroughQps = Math.round(input.totalReadQps * (1 - hitRate));

  const nodeCapacityGb = 16;
  const estimatedInstancesRequired = Math.max(1, Math.ceil(recommendedRamWithHeadroomGb / nodeCapacityGb));

  return {
    hotKeyCount,
    workingSetRamGb: Number(workingSetRamGb.toFixed(2)),
    recommendedRamWithHeadroomGb: Number(recommendedRamWithHeadroomGb.toFixed(2)),
    cacheHitQps,
    databaseFallthroughQps,
    estimatedInstancesRequired,
  };
}

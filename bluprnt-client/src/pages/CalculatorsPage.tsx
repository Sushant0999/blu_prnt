import React, { useState } from 'react';
import { Calculator, Server, HardDrive, Wifi, MemoryStick, HelpCircle, DollarSign } from 'lucide-react';
import {
  calculateServerCount,
  calculateStorage,
  calculateBandwidth,
  calculateCacheRam,
} from '../core/algorithms/sizingMath';

export const CalculatorsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'servers' | 'storage' | 'bandwidth' | 'cache'>('servers');

  // 1. Server Sizing State
  const [dau, setDau] = useState<number>(10_000_000);
  const [rpd, setRpd] = useState<number>(30);
  const [peakFactor, setPeakFactor] = useState<number>(3.0);
  const [serverCap, setServerCap] = useState<number>(1_500);
  const [headroom, setHeadroom] = useState<number>(1.25);

  const serverResult = calculateServerCount({
    dau,
    requestsPerUserPerDay: rpd,
    peakToAvgRatio: peakFactor,
    serverCapacityQps: serverCap,
    redundancyBuffer: headroom,
  });

  // 2. Storage Sizing State
  const [dailyRecords, setDailyRecords] = useState<number>(50_000_000);
  const [recordSizeKb, setRecordSizeKb] = useState<number>(2.5);
  const [retentionYears, setRetentionYears] = useState<number>(5);
  const [replicationFactor, setReplicationFactor] = useState<number>(3);
  const [overheadPct, setOverheadPct] = useState<number>(25);

  const storageResult = calculateStorage({
    dailyNewRecords: dailyRecords,
    avgRecordSizeKb: recordSizeKb,
    retentionYears,
    replicationFactor,
    indexAndMetadataOverheadPct: overheadPct,
  });

  // 3. Bandwidth & CDN State
  const [peakRps, setPeakRps] = useState<number>(15_000);
  const [respSizeKb, setRespSizeKb] = useState<number>(64);
  const [cdnHitPct, setCdnHitPct] = useState<number>(85);

  const bandwidthResult = calculateBandwidth({
    peakRps,
    avgResponseSizeKb: respSizeKb,
    cdnCacheHitRatePct: cdnHitPct,
  });

  // 4. Cache RAM State
  const [totalKeys, setTotalKeys] = useState<number>(100_000_000);
  const [hotPct, setHotPct] = useState<number>(20);
  const [valBytes, setValBytes] = useState<number>(1024);
  const [overheadBytes, setOverheadBytes] = useState<number>(64);
  const [readQps, setReadQps] = useState<number>(25_000);
  const [expectedHitPct, setExpectedHitPct] = useState<number>(85);

  const cacheResult = calculateCacheRam({
    totalUniqueKeys: totalKeys,
    hotDataPercent: hotPct,
    avgValueSizeBytes: valBytes,
    overheadPerKeyBytes: overheadBytes,
    totalReadQps: readQps,
    expectedHitRatePct: expectedHitPct,
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
          <Calculator className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Back-of-the-Envelope Capacity Calculators
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            Deterministic architectural models for interview sizing, infrastructure cost estimation, and capacity planning.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setActiveTab('servers')}
          className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
            activeTab === 'servers'
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Server className="w-4 h-4" /> QPS to Servers
        </button>
        <button
          onClick={() => setActiveTab('storage')}
          className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
            activeTab === 'storage'
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <HardDrive className="w-4 h-4" /> Storage Sizing
        </button>
        <button
          onClick={() => setActiveTab('bandwidth')}
          className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
            activeTab === 'bandwidth'
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Wifi className="w-4 h-4" /> Bandwidth & CDN
        </button>
        <button
          onClick={() => setActiveTab('cache')}
          className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
            activeTab === 'cache'
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <MemoryStick className="w-4 h-4" /> Cache RAM & Hit Rate
        </button>
      </div>

      {/* Tab 1: QPS to Server Count */}
      {activeTab === 'servers' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3">
              Input Parameters
            </h3>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Daily Active Users (DAU):</span>
                <span className="font-mono text-brand-600 font-bold">{(dau / 1_000_000).toFixed(1)} Million</span>
              </div>
              <input
                type="range"
                min="100000"
                max="100000000"
                step="500000"
                value={dau}
                onChange={(e) => setDau(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Requests per User / Day:</span>
                <span className="font-mono text-brand-600 font-bold">{rpd}</span>
              </div>
              <input
                type="range"
                min="1"
                max="200"
                value={rpd}
                onChange={(e) => setRpd(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Peak-to-Average Traffic Ratio:</span>
                <span className="font-mono text-brand-600 font-bold">{peakFactor}x</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="6"
                step="0.5"
                value={peakFactor}
                onChange={(e) => setPeakFactor(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Single Instance Capacity (QPS):</span>
                <span className="font-mono text-brand-600 font-bold">{serverCap} QPS</span>
              </div>
              <input
                type="range"
                min="200"
                max="5000"
                step="100"
                value={serverCap}
                onChange={(e) => setServerCap(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>
          </div>

          <div className="md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3">
              Calculated Capacity Results
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Throughput</span>
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                  {serverResult.avgQps.toLocaleString()} QPS
                </div>
              </div>
              <div className="p-3 bg-brand-50 dark:bg-brand-950/40 rounded-xl border border-brand-200 dark:border-brand-900">
                <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase">Peak QPS</span>
                <div className="text-xl font-extrabold text-brand-700 dark:text-brand-300 font-mono mt-0.5">
                  {serverResult.peakQps.toLocaleString()} QPS
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 block">
                    Recommended Fleet Size (with N+2 Headroom)
                  </span>
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    {serverResult.recommendedServers} Instances
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase block">Est. Compute Cost</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    ${(serverResult.costPerHourEstimate * 730).toFixed(0)} / mo
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 space-y-1 pt-2 font-mono text-[11px]">
              <div>• Daily Requests: {(serverResult.totalDailyRequests / 1_000_000_000).toFixed(2)} Billion req/day</div>
              <div>• Base Compute Needed: {serverResult.baseServersRequired} nodes</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Storage Sizing */}
      {activeTab === 'storage' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3">
              Storage Sizing Inputs
            </h3>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Daily New Records / Writes:</span>
                <span className="font-mono text-brand-600 font-bold">{(dailyRecords / 1_000_000).toFixed(1)} Million</span>
              </div>
              <input
                type="range"
                min="1000000"
                max="200000000"
                step="1000000"
                value={dailyRecords}
                onChange={(e) => setDailyRecords(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Average Record Size (KB):</span>
                <span className="font-mono text-brand-600 font-bold">{recordSizeKb} KB</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="50"
                step="0.5"
                value={recordSizeKb}
                onChange={(e) => setRecordSizeKb(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Retention Horizon:</span>
                <span className="font-mono text-brand-600 font-bold">{retentionYears} Years</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={retentionYears}
                onChange={(e) => setRetentionYears(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Replication Factor:</span>
                <span className="font-mono text-brand-600 font-bold">{replicationFactor}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={replicationFactor}
                onChange={(e) => setReplicationFactor(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>
          </div>

          <div className="md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3">
              Storage Projection
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Daily Ingestion</span>
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                  {storageResult.dailyRawGb} GB/day
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Annual Ingestion</span>
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                  {storageResult.annualRawTb} TB/yr
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                Total Storage Provisioned ({retentionYears} yrs with {replicationFactor}x Replicas & Indexes)
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {storageResult.totalWithOverheadTb} TB
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  ~${storageResult.monthlyStorageCostUsd.toLocaleString()} / mo
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Bandwidth & CDN */}
      {activeTab === 'bandwidth' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3">
              Bandwidth Inputs
            </h3>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Peak Requests / Second (RPS):</span>
                <span className="font-mono text-brand-600 font-bold">{peakRps.toLocaleString()} RPS</span>
              </div>
              <input
                type="range"
                min="1000"
                max="100000"
                step="1000"
                value={peakRps}
                onChange={(e) => setPeakRps(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Average Response Payload (KB):</span>
                <span className="font-mono text-brand-600 font-bold">{respSizeKb} KB</span>
              </div>
              <input
                type="range"
                min="5"
                max="500"
                step="5"
                value={respSizeKb}
                onChange={(e) => setRespSizeKb(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>CDN Cache Hit Rate:</span>
                <span className="font-mono text-brand-600 font-bold">{cdnHitPct}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="99"
                value={cdnHitPct}
                onChange={(e) => setCdnHitPct(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>
          </div>

          <div className="md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3">
              Egress & Network Throughput
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Peak Total Egress</span>
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                  {bandwidthResult.peakTotalEgressGbps} Gbps
                </div>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">CDN Offloaded</span>
                <div className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200 font-mono mt-0.5">
                  {bandwidthResult.cdnOffloadedMbps} Mbps
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/30">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                Origin Egress Bandwidth Needed (Uncached Traffic)
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                  {bandwidthResult.originEgressMbps} Mbps
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Est. ${(bandwidthResult.monthlyCdnCostUsd).toLocaleString()} / mo CDN Egress
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Cache RAM & Hit Rate */}
      {activeTab === 'cache' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3">
              Cache Sizing Inputs
            </h3>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Total Unique Keys:</span>
                <span className="font-mono text-brand-600 font-bold">{(totalKeys / 1_000_000).toFixed(0)}M Keys</span>
              </div>
              <input
                type="range"
                min="5000000"
                max="500000000"
                step="5000000"
                value={totalKeys}
                onChange={(e) => setTotalKeys(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Hot Working Set (Pareto Principle):</span>
                <span className="font-mono text-brand-600 font-bold">{hotPct}% of Keys</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                value={hotPct}
                onChange={(e) => setHotPct(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Average Value Size:</span>
                <span className="font-mono text-brand-600 font-bold">{valBytes} Bytes</span>
              </div>
              <input
                type="range"
                min="128"
                max="8192"
                step="128"
                value={valBytes}
                onChange={(e) => setValBytes(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Total Read QPS:</span>
                <span className="font-mono text-brand-600 font-bold">{readQps.toLocaleString()} QPS</span>
              </div>
              <input
                type="range"
                min="1000"
                max="100000"
                step="1000"
                value={readQps}
                onChange={(e) => setReadQps(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>
          </div>

          <div className="md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3">
              Cache Memory Architecture
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Working Set RAM</span>
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                  {cacheResult.workingSetRamGb} GB
                </div>
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800">
                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase">Cache Hits</span>
                <div className="text-xl font-extrabold text-indigo-900 dark:text-indigo-200 font-mono mt-0.5">
                  {cacheResult.cacheHitQps.toLocaleString()} QPS
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-brand-200 dark:border-brand-900 bg-brand-50/50 dark:bg-brand-950/30">
              <span className="text-xs font-bold text-brand-900 dark:text-brand-200 block">
                Recommended Memory Provisioning (with +30% Buffer)
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-brand-600 dark:text-brand-400 font-mono">
                  {cacheResult.recommendedRamWithHeadroomGb} GB RAM
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {cacheResult.estimatedInstancesRequired}x 16GB Redis Shards
                </span>
              </div>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl">
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">
                Database Fallthrough (Miss Rate: {100 - expectedHitPct}%)
              </span>
              <div className="text-base font-bold text-rose-900 dark:text-rose-200 font-mono mt-0.5">
                {cacheResult.databaseFallthroughQps.toLocaleString()} QPS hits the persistent database
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export type MachineTierId = 'micro' | 'standard' | 'compute' | 'memory' | 'metal';

export interface MachineTierDef {
  id: MachineTierId;
  name: string;
  badge: string;
  vCpu: number;
  ramGb: number;
  capacityQps: number;
  latencyMultiplier: number;
  monthlyCostUsd: number;
  description: string;
}

export const MACHINE_TIERS: Record<MachineTierId, MachineTierDef> = {
  micro: {
    id: 'micro',
    name: 'Micro (t3.micro)',
    badge: '1 vCPU • 2GB',
    vCpu: 1,
    ramGb: 2,
    capacityQps: 500,
    latencyMultiplier: 1.4,
    monthlyCostUsd: 15,
    description: '1 vCPU • 2GB RAM • Constrained dev instance',
  },
  standard: {
    id: 'standard',
    name: 'Standard (c6i.large)',
    badge: '4 vCPU • 8GB',
    vCpu: 4,
    ramGb: 8,
    capacityQps: 2500,
    latencyMultiplier: 1.0,
    monthlyCostUsd: 65,
    description: '4 vCPU • 8GB RAM • Balanced production compute',
  },
  compute: {
    id: 'compute',
    name: 'Compute Optimized (c6i.4xlarge)',
    badge: '16 vCPU • 32GB',
    vCpu: 16,
    ramGb: 32,
    capacityQps: 10000,
    latencyMultiplier: 0.65,
    monthlyCostUsd: 260,
    description: '16 vCPU • 32GB RAM • High-frequency API services',
  },
  memory: {
    id: 'memory',
    name: 'Memory Optimized (r6i.8xlarge)',
    badge: '32 vCPU • 128GB',
    vCpu: 32,
    ramGb: 128,
    capacityQps: 25000,
    latencyMultiplier: 0.45,
    monthlyCostUsd: 680,
    description: '32 vCPU • 128GB RAM • Databases & Redis clusters',
  },
  metal: {
    id: 'metal',
    name: 'Bare Metal Ultra (c6i.metal)',
    badge: '64 vCPU • 256GB',
    vCpu: 64,
    ramGb: 256,
    capacityQps: 60000,
    latencyMultiplier: 0.3,
    monthlyCostUsd: 1650,
    description: '64 vCPU • 256GB RAM • Extreme real-time matching & Kafka brokers',
  },
};

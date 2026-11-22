import React, { useState, useEffect } from 'react';
import { Crown, Heart, Shield, RefreshCw, Skull, Radio } from 'lucide-react';

interface RaftNode {
  id: number;
  role: 'Leader' | 'Candidate' | 'Follower';
  term: number;
  votes: number;
  isAlive: boolean;
  timer: number; // election timer in ms
}

export const RaftConsensusSim: React.FC = () => {
  const [nodes, setNodes] = useState<RaftNode[]>([
    { id: 1, role: 'Leader', term: 1, votes: 3, isAlive: true, timer: 300 },
    { id: 2, role: 'Follower', term: 1, votes: 0, isAlive: true, timer: 220 },
    { id: 3, role: 'Follower', term: 1, votes: 0, isAlive: true, timer: 280 },
    { id: 4, role: 'Follower', term: 1, votes: 0, isAlive: true, timer: 250 },
    { id: 5, role: 'Follower', term: 1, votes: 0, isAlive: true, timer: 290 },
  ]);

  const [heartbeatActive, setHeartbeatActive] = useState(true);

  // Background ticker for Raft election timers & heartbeats
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes((prevNodes) => {
        const leader = prevNodes.find((n) => n.role === 'Leader' && n.isAlive);
        
        // If leader exists and alive, send heartbeats and reset follower timers
        if (leader) {
          return prevNodes.map((n) => {
            if (!n.isAlive) return n;
            if (n.role === 'Follower') {
              return { ...n, timer: Math.max(150, Math.floor(Math.random() * 200 + 200)) };
            }
            return n;
          });
        }

        // Leader dead: decrement timers for all alive followers
        let nextLeaderElected: RaftNode | null = null;
        const updated = prevNodes.map((n) => {
          if (!n.isAlive) return n;
          const nextTimer = n.timer - 50;
          if (nextTimer <= 0 && n.role === 'Follower') {
            // Becomes candidate, initiates election
            return {
              ...n,
              role: 'Candidate' as const,
              term: n.term + 1,
              votes: 1, // votes for self
              timer: 300,
            };
          }
          return { ...n, timer: Math.max(0, nextTimer) };
        });

        // Check if any candidate has quorum (> 5 / 2 = 3 votes)
        const candidate = updated.find((n) => n.role === 'Candidate');
        if (candidate) {
          const aliveCount = updated.filter((n) => n.isAlive).length;
          const majority = Math.floor(aliveCount / 2) + 1;
          // Grant votes from remaining alive followers
          return updated.map((n) => {
            if (n.id === candidate.id) {
              return { ...n, role: 'Leader' as const, votes: majority };
            }
            if (n.isAlive) {
              return { ...n, role: 'Follower' as const, term: candidate.term };
            }
            return n;
          });
        }

        return updated;
      });
    }, 800);

    return () => clearInterval(interval);
  }, []);

  const killLeader = () => {
    setNodes((prev) =>
      prev.map((n) => (n.role === 'Leader' ? { ...n, isAlive: false, role: 'Follower' } : n))
    );
  };

  const reviveNode = (id: number) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isAlive: true, timer: 300, role: 'Follower' } : n))
    );
  };

  const currentLeader = nodes.find((n) => n.role === 'Leader' && n.isAlive);

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <h4 className="font-bold text-slate-900 dark:text-slate-100">Raft Consensus & Leader Election</h4>
        <p className="text-xs text-slate-500 mt-1">
          A 5-node cluster maintains distributed agreement. The Leader streams periodic heartbeats to reset Follower election
          timers. If the Leader crashes, the first node whose randomized timer expires starts an election and gathers quorum.
        </p>
      </div>

      {/* Cluster Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <Radio className={`w-4 h-4 ${currentLeader ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
            <span>Leader: {currentLeader ? `Node #${currentLeader.id} (Term ${currentLeader.term})` : 'ELECTION IN PROGRESS...'}</span>
          </div>
        </div>

        <button
          onClick={killLeader}
          disabled={!currentLeader}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 shadow-sm"
        >
          <Skull className="w-3.5 h-3.5" /> Crash Active Leader
        </button>
      </div>

      {/* Cluster Nodes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {nodes.map((node) => {
          return (
            <div
              key={node.id}
              className={`p-4 rounded-2xl border text-center transition-all ${
                !node.isAlive
                  ? 'border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/40 opacity-50'
                  : node.role === 'Leader'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/50 shadow-lg'
                  : node.role === 'Candidate'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 animate-pulse'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex justify-center mb-2">
                {!node.isAlive ? (
                  <Skull className="w-6 h-6 text-slate-400" />
                ) : node.role === 'Leader' ? (
                  <Crown className="w-7 h-7 text-emerald-600" />
                ) : node.role === 'Candidate' ? (
                  <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                ) : (
                  <Shield className="w-6 h-6 text-slate-400" />
                )}
              </div>

              <div className="font-bold text-sm text-slate-800 dark:text-slate-200">Node #{node.id}</div>
              <div
                className={`text-[10px] font-extrabold uppercase mt-0.5 ${
                  node.role === 'Leader'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : node.role === 'Candidate'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-500'
                }`}
              >
                {node.isAlive ? node.role : 'CRASHED'}
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] font-mono text-slate-500 space-y-0.5">
                <div>Term: {node.term}</div>
                <div>Timer: {node.isAlive ? `${node.timer}ms` : '---'}</div>
              </div>

              {!node.isAlive && (
                <button
                  onClick={() => reviveNode(node.id)}
                  className="mt-3 w-full py-1 text-[10px] font-bold bg-slate-700 hover:bg-slate-600 text-white rounded"
                >
                  Revive
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

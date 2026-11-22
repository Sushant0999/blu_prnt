import React from 'react';
import { StatTileDef } from '../engine/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatTilesProps {
  stats: [StatTileDef, StatTileDef, StatTileDef];
}

export const StatTiles: React.FC<StatTilesProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
      {stats.map((tile, idx) => {
        return (
          <div
            key={`stat-tile-${idx}`}
            className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>{tile.label}</span>
              {tile.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
              {tile.trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
              {tile.trend === 'neutral' && <Minus className="w-3.5 h-3.5 text-slate-500" />}
            </div>
            <div className="mt-2 flex items-baseline">
              <span
                className="text-2xl font-bold font-mono tracking-tight"
                style={{ color: tile.color || '#f8fafc' }}
              >
                {tile.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

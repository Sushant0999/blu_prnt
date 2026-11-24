import React, { useState } from 'react';
import { Power, Coins, CheckCircle, Ban, RefreshCw } from 'lucide-react';

type MachineState = 'NO_COIN' | 'HAS_COIN' | 'DISPENSING' | 'SOLD_OUT';

export const StateDemo: React.FC = () => {
  const [state, setState] = useState<MachineState>('NO_COIN');
  const [stock, setStock] = useState<number>(3);
  const [statusLog, setStatusLog] = useState<string>('Vending Machine ready. Insert coin to begin.');

  const handleInsertCoin = () => {
    if (state === 'NO_COIN') {
      setState('HAS_COIN');
      setStatusLog('Coin accepted ($1.00). Please select your beverage.');
    } else if (state === 'HAS_COIN') {
      setStatusLog('Coin already inserted. Select an item or cancel.');
    } else if (state === 'SOLD_OUT') {
      setStatusLog('Machine is SOLD OUT. Coin returned.');
    }
  };

  const handleEjectCoin = () => {
    if (state === 'HAS_COIN') {
      setState('NO_COIN');
      setStatusLog('Transaction cancelled. Coin returned ($1.00).');
    } else {
      setStatusLog('No coin to return.');
    }
  };

  const handleSelectItem = () => {
    if (state === 'HAS_COIN') {
      setState('DISPENSING');
      setStatusLog('Item selected. Dispensing beverage...');

      setTimeout(() => {
        const nextStock = stock - 1;
        setStock(nextStock);
        if (nextStock <= 0) {
          setState('SOLD_OUT');
          setStatusLog('Dispensed cold drink! Machine is now SOLD OUT.');
        } else {
          setState('NO_COIN');
          setStatusLog('Dispensed cold drink! Thank you for purchasing.');
        }
      }, 1200);
    } else if (state === 'NO_COIN') {
      setStatusLog('Please insert a coin before selecting an item.');
    } else if (state === 'SOLD_OUT') {
      setStatusLog('Item is sold out.');
    }
  };

  const handleRestock = () => {
    setStock(3);
    setState('NO_COIN');
    setStatusLog('Machine restocked with 3 drinks.');
  };

  const getStateBadge = (s: MachineState) => {
    const isCurrent = state === s;
    return `px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
      isCurrent
        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 ring-2 ring-cyan-500/30'
        : 'border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50/50 dark:bg-slate-900/50'
    }`;
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Interactive State Demo: Vending Machine Finite State Machine
          </h4>
          <p className="text-xs text-slate-500">
            Behavior and legal transitions change polymorphically based on current internal State.
          </p>
        </div>
        <div className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
          Stock: <span className="text-cyan-600 dark:text-cyan-400">{stock}</span>
        </div>
      </div>

      {/* State Machine Status Nodes */}
      <div className="flex flex-wrap items-center justify-center gap-3 py-2">
        <div className={getStateBadge('NO_COIN')}>1. NoCoinState</div>
        <div className="text-slate-300 dark:text-slate-700 font-bold">→</div>
        <div className={getStateBadge('HAS_COIN')}>2. HasCoinState</div>
        <div className="text-slate-300 dark:text-slate-700 font-bold">→</div>
        <div className={getStateBadge('DISPENSING')}>3. DispensingState</div>
        <div className="text-slate-300 dark:text-slate-700 font-bold">→</div>
        <div className={getStateBadge('SOLD_OUT')}>4. SoldOutState</div>
      </div>

      {/* Machine Controls */}
      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={handleInsertCoin}
          disabled={state === 'DISPENSING'}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition disabled:opacity-50"
        >
          <Coins className="w-3.5 h-3.5" /> Insert $1 Coin
        </button>

        <button
          onClick={handleSelectItem}
          disabled={state === 'DISPENSING'}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 transition disabled:opacity-50"
        >
          <CheckCircle className="w-3.5 h-3.5" /> Select Drink
        </button>

        <button
          onClick={handleEjectCoin}
          disabled={state === 'DISPENSING'}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50"
        >
          <Ban className="w-3.5 h-3.5" /> Cancel / Refund
        </button>

        {stock <= 0 && (
          <button
            onClick={handleRestock}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Restock Drinks
          </button>
        )}
      </div>

      {/* Machine Screen Log */}
      <div className="p-3 rounded-xl bg-slate-900 text-cyan-400 font-mono text-xs shadow-inner flex items-center justify-between">
        <div>&gt; {statusLog}</div>
        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
      </div>
    </div>
  );
};

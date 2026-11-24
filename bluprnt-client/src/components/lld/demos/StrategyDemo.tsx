import React, { useState } from 'react';
import { ShoppingCart, Tag, Check, Sparkles } from 'lucide-react';

interface PricingStrategy {
  name: string;
  label: string;
  description: string;
  calculate: (subtotal: number) => { discount: number; finalTotal: number };
}

const strategies: PricingStrategy[] = [
  {
    name: 'standard',
    label: 'Standard Pricing',
    description: 'No discount applied. Standard catalog list price.',
    calculate: (subtotal: number) => ({ discount: 0, finalTotal: subtotal }),
  },
  {
    name: 'black_friday',
    label: 'Black Friday (30% Off)',
    description: 'Applies flat 30% reduction on all items in cart.',
    calculate: (subtotal: number) => {
      const discount = Math.round(subtotal * 0.3);
      return { discount, finalTotal: subtotal - discount };
    },
  },
  {
    name: 'vip_tiered',
    label: 'VIP Tiered ($20 off over $50)',
    description: 'Rewards high spenders with $20 immediate cash rebate when cart exceeds $50.',
    calculate: (subtotal: number) => {
      const discount = subtotal >= 50 ? 20 : 0;
      return { discount, finalTotal: Math.max(0, subtotal - discount) };
    },
  },
];

export const StrategyDemo: React.FC = () => {
  const [selectedStrategy, setSelectedStrategy] = useState<PricingStrategy>(strategies[0]);
  const [cartItems, setCartItems] = useState([
    { id: 1, name: 'System Design Interview Guide', price: 40 },
    { id: 2, name: 'High-Concurrency Architecture Course', price: 60 },
  ]);

  const subtotal = cartItems.reduce((acc, item) => acc + item.price, 0);
  const { discount, finalTotal } = selectedStrategy.calculate(subtotal);

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Interactive Strategy Demo: Dynamic Pricing & Discounts
            </h4>
            <p className="text-xs text-slate-500">
              The ShoppingCart context stays constant while swapping pricing calculation algorithms at runtime.
            </p>
          </div>
        </div>
      </div>

      {/* Strategy selector pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {strategies.map((strat) => {
          const isSelected = selectedStrategy.name === strat.name;
          return (
            <button
              key={strat.name}
              onClick={() => setSelectedStrategy(strat)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/40 ring-1 ring-cyan-500/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-950/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${isSelected ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-700 dark:text-slate-300'}`}>
                  {strat.label}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                {strat.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Cart Bill Details */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
        <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Cart Items:</div>
        {cartItems.map((item) => (
          <div key={item.id} className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>• {item.name}</span>
            <span className="font-mono">${item.price}</span>
          </div>
        ))}

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1 font-mono">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal:</span>
            <span>${subtotal}</span>
          </div>
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
            <span>Discount ({selectedStrategy.label}):</span>
            <span>-${discount}</span>
          </div>
          <div className="flex justify-between text-slate-900 dark:text-slate-100 font-bold text-sm pt-1 border-t border-slate-200 dark:border-slate-800">
            <span>Final Charged Total:</span>
            <span className="text-cyan-600 dark:text-cyan-400">${finalTotal}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

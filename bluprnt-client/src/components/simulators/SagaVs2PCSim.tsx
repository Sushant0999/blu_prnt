import React, { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, AlertTriangle, ArrowRight, Play } from 'lucide-react';

export const SagaVs2PCSim: React.FC = () => {
  const [protocol, setProtocol] = useState<'2pc' | 'saga'>('saga');
  const [failStep, setFailStep] = useState<'none' | 'payment'>('payment');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Ready to initiate distributed transaction');

  // Steps definition for 2PC
  // 1: Coordinator sends PREPARE -> 2: Services VOTE (fail or ok) -> 3: Coordinator COMMIT or ROLLBACK
  // Steps definition for SAGA
  // 1: Order created -> 2: Payment executed (or fails) -> 3: Compensate if failed, or Inventory reserved

  const runSimulation = () => {
    setCurrentStep(1);
    if (protocol === '2pc') {
      setStatusText('Coordinator sending PREPARE to Order, Payment, and Inventory services (locks acquired)...');
      setTimeout(() => {
        if (failStep === 'payment') {
          setCurrentStep(2);
          setStatusText('Payment Service rejected vote (Insufficient Funds). Coordinator issues GLOBAL ROLLBACK.');
        } else {
          setCurrentStep(2);
          setStatusText('All participants voted YES. Coordinator issues GLOBAL COMMIT.');
        }
      }, 1500);
    } else {
      // SAGA
      setStatusText('Step 1: Order Service created PENDING order (local commit #1)...');
      setTimeout(() => {
        if (failStep === 'payment') {
          setCurrentStep(2);
          setStatusText('Step 2: Payment Service failed! Triggering COMPENSATING TRANSACTIONS...');
          setTimeout(() => {
            setCurrentStep(3);
            setStatusText('Compensation complete: Order Service set status to CANCELLED. No distributed lock held.');
          }, 1500);
        } else {
          setCurrentStep(2);
          setStatusText('Step 2: Payment processed successfully.');
          setTimeout(() => {
            setCurrentStep(3);
            setStatusText('Step 3: Inventory reserved. Saga choreography completed successfully.');
          }, 1500);
        }
      }, 1500);
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setStatusText('Ready to initiate distributed transaction');
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <h4 className="font-bold text-slate-900 dark:text-slate-100">Distributed Transactions: 2PC vs Saga</h4>
        <p className="text-xs text-slate-500 mt-1">
          Two-Phase Commit (2PC) guarantees strong ACID consistency but holds distributed blocking locks. Saga uses
          eventual consistency with backward compensating actions, preventing system-wide lock contention.
        </p>
      </div>

      {/* Protocol Toggle & Failure Scenario Selection */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setProtocol('saga');
              reset();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              protocol === 'saga'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Saga Pattern (Compensating)
          </button>
          <button
            onClick={() => {
              setProtocol('2pc');
              reset();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              protocol === '2pc'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Two-Phase Commit (2PC)
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Simulation Scenario:</label>
          <select
            value={failStep}
            onChange={(e) => {
              setFailStep(e.target.value as any);
              reset();
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
          >
            <option value="none">Happy Path (All Succeed)</option>
            <option value="payment">Failure (Payment Fails)</option>
          </select>
        </div>
      </div>

      {/* Visual Service Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Order Service */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Service 1</span>
            <h5 className="font-bold text-slate-800 dark:text-slate-200 mt-1">Order Service</h5>
            <p className="text-xs text-slate-500 mt-1">Manages order lifecycle & user checkout intents.</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            {currentStep >= 1 ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Order Created
              </span>
            ) : (
              <span className="text-xs text-slate-400">Idle</span>
            )}
            {protocol === 'saga' && currentStep === 3 && failStep === 'payment' && (
              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-1">
                ↺ Compensated: Status = Cancelled
              </div>
            )}
          </div>
        </div>

        {/* Payment Service */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Service 2</span>
            <h5 className="font-bold text-slate-800 dark:text-slate-200 mt-1">Payment Service</h5>
            <p className="text-xs text-slate-500 mt-1">Charges credit card / digital wallet.</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            {currentStep >= 2 ? (
              failStep === 'payment' ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                  <XCircle className="w-3.5 h-3.5" /> Declined ($0 Balance)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Payment Captured
                </span>
              )
            ) : (
              <span className="text-xs text-slate-400">Waiting...</span>
            )}
          </div>
        </div>

        {/* Inventory Service */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Service 3</span>
            <h5 className="font-bold text-slate-800 dark:text-slate-200 mt-1">Inventory Service</h5>
            <p className="text-xs text-slate-500 mt-1">Decrements SKU warehouse quantities.</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            {currentStep >= 3 && failStep === 'none' ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> Stock Reserved
              </span>
            ) : (
              <span className="text-xs text-slate-400">Unmodified</span>
            )}
          </div>
        </div>
      </div>

      {/* Execution Console */}
      <div className="p-4 rounded-xl bg-slate-900 text-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs shadow-md">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
          <span>{statusText}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runSimulation}
            disabled={currentStep > 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-sans font-semibold text-xs"
          >
            <Play className="w-3.5 h-3.5" /> Start Transaction
          </button>
          <button
            onClick={reset}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

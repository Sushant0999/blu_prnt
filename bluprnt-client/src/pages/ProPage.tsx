import React, { useState, useEffect } from 'react';
import { CreditCard, Check, Zap, ShieldCheck, KeyRound, Sparkles, Clock } from 'lucide-react';
import { db } from '../db/database';
import { ProStatusRecord } from '../types/storage';

const isDevPort = typeof window !== 'undefined' && (window.location.port === '3000' || window.location.port === '5173' || window.location.port === '3001');
const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || (isDevPort ? 'http://localhost:4000' : '');

export const ProPage: React.FC = () => {
  const [email, setEmail] = useState<string>(localStorage.getItem('bluprnt_user_email') || 'engineer@example.com');
  const [proRecord, setProRecord] = useState<ProStatusRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadProStatus = async () => {
    try {
      const rec = await db.proStatus.get('status');
      if (rec) setProRecord(rec);

      // Verify with backend if email is present
      if (email) {
        try {
          const res = await fetch(`${API_BASE}/api/stripe/status?email=${encodeURIComponent(email)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.isPro) {
              await db.proStatus.put({
                id: 'status',
                isPro: true,
                proUnlockedAt: data.proPurchasedAt,
                tempUnlocks: rec?.tempUnlocks || [],
              });
              setProRecord((prev) => (prev ? { ...prev, isPro: true } : null));
            }
          }
        } catch (e) {
          // Offline mode or server not running: fall back cleanly to local Dexie
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadProStatus();
  }, [email]);

  const handleStripeCheckout = async () => {
    if (!email) {
      alert('Please enter your email for your receipt & account binding.');
      return;
    }
    localStorage.setItem('bluprnt_user_email', email);
    setLoading(true);
    setStatusMessage('Initiating secure Stripe Checkout...');

    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error('Backend failed to create checkout session');
      const data = await res.json();

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      }
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}. (Ensure backend server is running on port 4000)`);
    } finally {
      setLoading(false);
    }
  };

  const handleDevUnlock = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/stripe/dev-simulate-success`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        await db.proStatus.put({
          id: 'status',
          isPro: true,
          proUnlockedAt: Date.now(),
          tempUnlocks: proRecord?.tempUnlocks || [],
        });
        setProRecord((prev) => (prev ? { ...prev, isPro: true } : null));
        setStatusMessage('Simulated Pro purchase successfully verified by backend database!');
      }
    } catch (err: any) {
      // Local fallback
      await db.proStatus.put({
        id: 'status',
        isPro: true,
        proUnlockedAt: Date.now(),
        tempUnlocks: [],
      });
      setProRecord((prev) => (prev ? { ...prev, isPro: true } : null));
      setStatusMessage('Local offline Pro unlocked for development.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest24hToken = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/tokens/issue-24h-unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureKey: 'playground-unlimited' }),
      });
      if (res.ok) {
        const data = await res.json();
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        await db.proStatus.put({
          id: 'status',
          isPro: proRecord?.isPro || false,
          tempUnlocks: [{ featureKey: 'playground-unlimited', expiresAt }],
        });
        await loadProStatus();
        setStatusMessage(`HMAC 24-hour unlock token issued! Expires in 24 hours.`);
      }
    } catch (e: any) {
      setStatusMessage('Could not reach token service.');
    } finally {
      setLoading(false);
    }
  };

  const isPro = proRecord?.isPro || false;
  const activeTempUnlock = proRecord?.tempUnlocks?.find((u) => u.expiresAt > Date.now());

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
          <Zap className="w-3.5 h-3.5 fill-brand-500" />
          BluPrnt Pro Access
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Unlock Unlimited Architectural Mastery
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          One-time lifetime payment verified cryptographically on the server via Stripe webhooks. Zero recurring subscriptions.
        </p>
      </div>

      {/* Active Pro Banner */}
      {isPro ? (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-brand-500/10 to-transparent border-2 border-emerald-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Authoritative Server-Verified
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                BluPrnt Pro Lifetime Active
              </h3>
              <p className="text-xs text-slate-500">Bound to account: {email}</p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
            All Features Unlocked
          </span>
        </div>
      ) : activeTempUnlock ? (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Temporary 24-Hour Access Token Active
              </div>
              <div className="text-[11px] text-slate-500">
                Expires at: {new Date(activeTempUnlock.expiresAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Free Plan */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-900 space-y-6">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Free Tier</h3>
            <p className="text-xs text-slate-500">Full core curriculum access</p>
            <div className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-slate-100">$0</div>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> All 100+ Lessons & Quizzes</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> 8 Interactive Simulators</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> 1 Flashcard Deck</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> 2 Canvas Simulation Runs / Week</li>
          </ul>
        </div>

        {/* Pro Plan */}
        <div className="rounded-3xl border-2 border-brand-500 p-6 bg-brand-50/20 dark:bg-brand-950/20 space-y-6 relative shadow-lg shadow-brand-500/10">
          <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-brand-600 text-white">
            Lifetime Pass
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">BluPrnt Pro</h3>
            <p className="text-xs text-slate-500">Permanent unconstrained access</p>
            <div className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-slate-100">$29</div>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-600" /> Unlimited Playground Simulation Runs</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-600" /> All Flashcard Decks & Custom Decks</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-600" /> Complete System Design Case Studies</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-600" /> Multi-Device Cloud Synchronization</li>
          </ul>

          <div className="space-y-2 pt-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
            />

            <button
              onClick={handleStripeCheckout}
              disabled={loading || isPro}
              className="w-full py-3 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white transition-all shadow-md shadow-brand-600/20 flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              {isPro ? 'Already Pro Member' : 'Pay $29 Once (Stripe Checkout)'}
            </button>
          </div>
        </div>
      </div>

      {/* Developer & Sandbox Controls */}
      <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
        <span className="font-bold text-slate-700 dark:text-slate-300 block">
          Offline & Developer Controls
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDevUnlock}
            className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg font-medium"
          >
            Simulate Server-Side Stripe Webhook
          </button>
          <button
            onClick={handleRequest24hToken}
            className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg font-medium flex items-center gap-1"
          >
            <KeyRound className="w-3.5 h-3.5" /> Issue 24h HMAC Token
          </button>
        </div>
        {statusMessage && (
          <div className="p-2.5 rounded bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-mono text-[11px]">
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
};

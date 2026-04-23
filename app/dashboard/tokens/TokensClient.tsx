'use client';

// ─── TokensClient ─────────────────────────────────────────────────────────────
// All interactive UI for the Tokens page. Initial data is server-fetched.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import type { TokenPack, Plan, TokenTransaction } from '@/types/dashboard';

const PLAN_FEATURES: Record<'starter' | 'growth', string[]> = {
  starter: ['2,000 tokens/month', '20% rollover', 'Email support', '3 websites max'],
  growth:  ['8,000 tokens/month', '20% rollover', 'Priority support', 'Unlimited websites', 'API access', 'White-label'],
};

interface Wallet {
  balance:        number;
  lifetimeEarned: number;
  lifetimeSpent:  number;
}

interface Subscription {
  plan:   string;
  status: string;
}

interface Props {
  packs:        TokenPack[];
  plans:        Plan[];
  wallet:       Wallet;
  transactions: TokenTransaction[];
  subscription: Subscription | null;
  userId:       string;
}

function TokensInner({ packs, plans, wallet, transactions, subscription, userId }: Props) {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [selectedPack, setSelectedPack]     = useState<TokenPack | null>(null);
  const [checkingOut, setCheckingOut]       = useState<string | null>(null);
  const [error, setError]                   = useState<string | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [successToast, setSuccessToast]     = useState(false);
  const [referralLink, setReferralLink]     = useState('');

  useEffect(() => {
    setReferralLink(`${window.location.origin}/ref/${userId}`);
  }, [userId]);

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 6000);
      router.replace('/dashboard/tokens');
    }
  }, [searchParams, router]);

  const handleCheckout = async (priceId: string, mode: 'payment' | 'subscription') => {
    setError(null);
    setCheckingOut(priceId);
    try {
      const res  = await fetch('/api/tokens/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ priceId, mode }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setCheckingOut(null);
    }
  };

  const balance = wallet.balance;

  return (
    <div className="space-y-6 max-w-4xl">
      {successToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 shadow-xl">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="font-semibold text-sm">Payment successful!</p>
            <p className="text-xs text-green-400/70">Your tokens have been credited to your account.</p>
          </div>
        </div>
      )}

      {/* Balance summary */}
      <div className="p-5 rounded-xl bg-[#111] border border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Token Balance</p>
            <p className="text-4xl font-black text-white tabular-nums">{balance.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">tokens available</p>
          </div>
          <div className="text-right space-y-2">
            <div><p className="text-xs text-gray-500">Lifetime earned</p><p className="text-lg font-bold text-green-400">{wallet.lifetimeEarned.toLocaleString()}</p></div>
            <div><p className="text-xs text-gray-500">Lifetime spent</p><p className="text-lg font-bold text-red-400">{wallet.lifetimeSpent.toLocaleString()}</p></div>
          </div>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-sm text-red-400">{error}</div>}

      {/* PAYG packs */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white">Top-Up Packs</h2>
          <p className="text-sm text-gray-400 mt-0.5">One-time purchase — tokens never expire · Prices in AUD</p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {packs.map((pack) => (
            <button key={pack.id}
              onClick={() => setSelectedPack(selectedPack?.id === pack.id ? null : pack)}
              className={`relative p-5 rounded-xl border text-left transition-all duration-200 ${
                selectedPack?.id === pack.id
                  ? 'bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/10'
                  : pack.popular
                  ? 'bg-amber-400/5 border-amber-400/30 hover:border-amber-400/50'
                  : 'bg-[#111] border-white/10 hover:border-white/20 hover:bg-[#1a1a1a]'
              }`}
            >
              {pack.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-400 text-black whitespace-nowrap">Best Value</span>
              )}
              <p className="text-2xl font-black text-white mb-1">${pack.price}</p>
              <p className="text-amber-400 font-bold text-lg tabular-nums">{pack.tokens.toLocaleString()}</p>
              <p className="text-gray-500 text-xs">tokens</p>
            </button>
          ))}
        </div>
        {selectedPack && (
          <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">{selectedPack.tokens.toLocaleString()} tokens for ${selectedPack.price} AUD</p>
              <p className="text-sm text-gray-400">Balance after: <span className="text-amber-400 font-bold">{(balance + selectedPack.tokens).toLocaleString()}</span> tokens</p>
            </div>
            <button
              onClick={() => selectedPack.priceId && handleCheckout(selectedPack.priceId, 'payment')}
              disabled={checkingOut === selectedPack.priceId || !selectedPack.priceId}
              className="px-5 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {checkingOut === selectedPack.priceId ? 'Loading...' : 'Buy Now'}
            </button>
          </div>
        )}
      </div>

      {/* Monthly plans */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white">Monthly Plans</h2>
          <p className="text-sm text-gray-400 mt-0.5">Tokens refresh monthly · Prices in AUD</p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {plans.map((plan) => {
            const isCurrentPlan = subscription?.plan?.toLowerCase() === plan.key?.toLowerCase() && subscription?.status === 'active';
            const features = PLAN_FEATURES[plan.id as 'starter' | 'growth'] || [];
            const isGrowth  = plan.id === 'growth';
            return (
              <div key={plan.id} className={`relative p-6 rounded-xl border transition-all ${isGrowth ? 'bg-blue-500/5 border-blue-500/30' : 'bg-[#111] border-white/10'}`}>
                {isCurrentPlan && <span className="absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Current Plan</span>}
                {isGrowth && !isCurrentPlan && <span className="absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Recommended</span>}
                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1.5 mb-1">
                  <span className="text-3xl font-black text-white">${plan.price}</span>
                  <span className="text-gray-500 mb-1">/month AUD</span>
                </div>
                <p className="text-amber-400 font-semibold mb-4">{plan.tokens.toLocaleString()} tokens/month</p>
                <ul className="space-y-2 mb-5">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => !isCurrentPlan && plan.priceId && handleCheckout(plan.priceId, 'subscription')}
                  disabled={isCurrentPlan || checkingOut === plan.priceId || !plan.priceId}
                  className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 ${isCurrentPlan ? 'bg-white/5 text-gray-400 border border-white/10 cursor-default' : isGrowth ? 'bg-blue-500 hover:bg-blue-400 text-white' : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'}`}
                >
                  {isCurrentPlan ? 'Current Plan' : checkingOut === plan.priceId ? 'Loading...' : `Subscribe to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Referral */}
      <div className="p-5 rounded-xl bg-[#111] border border-white/10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-400/10 flex items-center justify-center text-2xl flex-shrink-0">🎁</div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">Refer &amp; Earn</h3>
            <p className="text-sm text-gray-400 mb-4">Share your link and earn <span className="text-amber-400 font-semibold">50 tokens</span> for every new signup. They get 50 too.</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-sm text-gray-300 font-mono truncate">
                {referralLink || 'Loading...'}
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(referralLink); setReferralCopied(true); setTimeout(() => setReferralCopied(false), 2000); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${referralCopied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/10 text-white border border-white/10 hover:bg-white/15'}`}
              >
                {referralCopied ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Transaction History</h2>
        <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-sm">No transactions yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {['Date','Description','Tokens','Balance'].map((h, i) => (
                    <th key={h} className={`px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium ${i >= 2 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr key={tx.id} className={`${i < transactions.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/2 transition-colors`}>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-gray-300">{tx.description}</td>
                    <td className={`px-5 py-3.5 text-right font-bold tabular-nums ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right text-white tabular-nums">{tx.balanceAfter.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TokensClient(props: Props) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <TokensInner {...props} />
    </Suspense>
  );
}


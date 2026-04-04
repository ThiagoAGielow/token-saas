'use client';

import { useState } from 'react';
import TokenBalance from '@/components/TokenBalance';

// TODO: replace with real data from API
const MOCK_BALANCE = 650;

const PAYG_PACKS = [
  { id: 'p10', price: 10, tokens: 500, pricePerToken: '2.0¢', popular: false },
  { id: 'p25', price: 25, tokens: 1500, pricePerToken: '1.7¢', popular: false },
  { id: 'p50', price: 50, tokens: 3500, pricePerToken: '1.4¢', popular: true, badge: 'Best Value' },
  { id: 'p100', price: 100, tokens: 8000, pricePerToken: '1.25¢', popular: false },
];

const MONTHLY_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    tokens: 2000,
    perToken: '1.45¢',
    features: ['2,000 tokens/month', 'Tokens expire monthly', 'Email support', '3 websites max'],
    current: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 79,
    tokens: 8000,
    perToken: '0.99¢',
    features: ['8,000 tokens/month', 'Tokens expire monthly', 'Priority support', 'Unlimited websites', 'API access'],
    current: true,
    highlight: true,
  },
];

// TODO: replace with real transaction history from API
const MOCK_TRANSACTIONS = [
  { id: 1, date: 'Mar 31, 2026', type: 'spend', description: 'Website created — myshop.tokenflow.app', tokens: -50, balance: 650 },
  { id: 2, date: 'Mar 31, 2026', type: 'spend', description: 'AI Rewrite × 3', tokens: -9, balance: 700 },
  { id: 3, date: 'Mar 30, 2026', type: 'spend', description: 'Email account setup', tokens: -10, balance: 709 },
  { id: 4, date: 'Mar 30, 2026', type: 'spend', description: 'Domain connected — myshop.com', tokens: -20, balance: 719 },
  { id: 5, date: 'Mar 28, 2026', type: 'topup', description: '$25 pack purchased', tokens: +1500, balance: 739 },
  { id: 6, date: 'Mar 25, 2026', type: 'spend', description: 'Website created — portfolio.tokenflow.app', tokens: -50, balance: -761 },
  { id: 7, date: 'Mar 1, 2026', type: 'plan', description: 'Growth plan — monthly allocation', tokens: +8000, balance: 811 },
];

export default function TokensPage() {
  const [selectedPack, setSelectedPack] = useState(null);
  const [autoTopUp, setAutoTopUp] = useState(false);
  const [autoThreshold, setAutoThreshold] = useState(100);
  const [autoPack, setAutoPack] = useState('p10');
  const [referralCopied, setReferralCopied] = useState(false);

  // TODO: replace with real referral link
  const referralLink = 'https://tokenflow.app/ref/thiago-abc123';

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Current balance hero */}
      <TokenBalance />

      {/* PAYG Packs */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white">Top-Up Packs</h2>
          <p className="text-sm text-gray-400 mt-0.5">One-time purchase — tokens never expire</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {PAYG_PACKS.map((pack) => (
            <button
              key={pack.id}
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
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-400 text-black whitespace-nowrap">
                  {pack.badge}
                </span>
              )}
              <p className="text-2xl font-black text-white mb-1">${pack.price}</p>
              <p className="text-amber-400 font-bold text-lg tabular-nums">{pack.tokens.toLocaleString()}</p>
              <p className="text-gray-500 text-xs">tokens</p>
              <p className="text-gray-500 text-xs mt-2">{pack.pricePerToken}/token</p>
            </button>
          ))}
        </div>

        {selectedPack && (
          <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">
                {selectedPack.tokens.toLocaleString()} tokens for ${selectedPack.price}
              </p>
              <p className="text-sm text-gray-400">
                New balance after purchase: <span className="text-amber-400 font-bold">{(MOCK_BALANCE + selectedPack.tokens).toLocaleString()}</span> tokens
              </p>
            </div>
            <button className="px-5 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-colors">
              {/* TODO: integrate Stripe/payment */}
              Buy Now
            </button>
          </div>
        )}
      </div>

      {/* Monthly Plans */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white">Monthly Plans</h2>
          <p className="text-sm text-gray-400 mt-0.5">Tokens refresh monthly — best for consistent usage</p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {MONTHLY_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative p-6 rounded-xl border transition-all ${
                plan.highlight
                  ? 'bg-blue-500/5 border-blue-500/30'
                  : 'bg-[#111] border-white/10'
              }`}
            >
              {plan.current && (
                <span className="absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  Current Plan
                </span>
              )}
              {plan.highlight && !plan.current && (
                <span className="absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Recommended
                </span>
              )}

              <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
              <div className="flex items-end gap-1.5 mb-1">
                <span className="text-3xl font-black text-white">${plan.price}</span>
                <span className="text-gray-500 mb-1">/month</span>
              </div>
              <p className="text-amber-400 font-semibold mb-4">
                {plan.tokens.toLocaleString()} tokens/month
                <span className="text-gray-500 font-normal text-xs ml-2">({plan.perToken}/token)</span>
              </p>

              <ul className="space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="p-3 rounded-lg bg-amber-400/5 border border-amber-400/10 text-xs text-amber-300/70 mb-4">
                Monthly tokens expire at the end of each billing period. Top-up packs never expire.
              </div>

              <button
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                  plan.current
                    ? 'bg-white/5 text-gray-400 border border-white/10 cursor-default'
                    : plan.highlight
                    ? 'bg-blue-500 hover:bg-blue-400 text-white'
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                }`}
                disabled={plan.current}
              >
                {/* TODO: integrate Stripe subscription */}
                {plan.current ? 'Current Plan' : `Switch to ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Auto top-up */}
      <div className="p-5 rounded-xl bg-[#111] border border-white/10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white">Auto Top-Up</h3>
            <p className="text-sm text-gray-400 mt-0.5">Automatically purchase tokens when your balance runs low</p>
          </div>
          <button
            onClick={() => setAutoTopUp(!autoTopUp)}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${autoTopUp ? 'bg-blue-500' : 'bg-white/10'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${autoTopUp ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {autoTopUp && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">
                Trigger when balance falls below
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={autoThreshold}
                  onChange={(e) => setAutoThreshold(Number(e.target.value))}
                  className="w-24 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500"
                />
                <span className="text-gray-400 text-sm">tokens</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">
                Auto-purchase pack
              </label>
              <select
                value={autoPack}
                onChange={(e) => setAutoPack(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {PAYG_PACKS.map((p) => (
                  <option key={p.id} value={p.id}>
                    ${p.price} — {p.tokens.toLocaleString()} tokens
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Referral section */}
      <div className="p-5 rounded-xl bg-[#111] border border-white/10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-400/10 flex items-center justify-center text-2xl flex-shrink-0">
            🎁
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">Refer & Earn</h3>
            <p className="text-sm text-gray-400 mb-4">
              Share your referral link and earn <span className="text-amber-400 font-semibold">50 tokens</span> for every new user who signs up. They get 50 bonus tokens too.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-sm text-gray-300 font-mono truncate">
                {referralLink}
              </div>
              <button
                onClick={handleCopyReferral}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  referralCopied
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/10 text-white border border-white/10 hover:bg-white/15'
                }`}
              >
                {referralCopied ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">You have referred 0 users · Earned 0 bonus tokens</p>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Transaction History</h2>
        <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Date</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Description</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Tokens</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_TRANSACTIONS.map((tx, i) => (
                <tr key={tx.id} className={`${i < MOCK_TRANSACTIONS.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/2 transition-colors`}>
                  <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{tx.date}</td>
                  <td className="px-5 py-3.5 text-gray-300">{tx.description}</td>
                  <td className={`px-5 py-3.5 text-right font-bold tabular-nums ${tx.tokens > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.tokens > 0 ? '+' : ''}{tx.tokens.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-right text-white tabular-nums">{Math.abs(tx.balance).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

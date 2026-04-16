'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type IconProps = { className?: string };

type Transaction = {
  id: string;
  description: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
};

type DashboardData = {
  tokens?: {
    wallet?: { balance?: number; lifetimeSpent?: number };
    daysRemaining?: number;
    transactions?: Transaction[];
  };
  websites?: { websites?: unknown[] };
  domains?: { domains?: Array<{ verified?: boolean }> };
  emails?: { emails?: unknown[] };
};

type ActionCost = { label: string; cost: number; icon: React.ReactNode };

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconCoin({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconGlobe({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function IconLink({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function IconMail({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function IconSparkle({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3l1.5 3.5L10 8l-3.5 1.5L5 13l-1.5-3.5L0 8l3.5-1.5L5 3zm14 11l1 2.5L22.5 17l-2.5 1L19 20.5l-1-2.5L15.5 17l2.5-1L19 14zm-7-9l.75 1.75L14.5 7.5l-1.75.75L12 10l-.75-1.75L9.5 7.5l1.75-.75L12 5z" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function txIcon(tx: Transaction): { icon: React.ReactNode; color: string } {
  const d = (tx.description ?? '').toLowerCase();
  if (d.includes('website'))          return { icon: <IconGlobe />,   color: 'text-blue-400' };
  if (d.includes('domain'))           return { icon: <IconLink />,    color: 'text-purple-400' };
  if (d.includes('email'))            return { icon: <IconMail />,    color: 'text-green-400' };
  if (d.includes('ai') || d.includes('rewrite')) return { icon: <IconSparkle />, color: 'text-pink-400' };
  return { icon: <IconCoin />, color: 'text-amber-400' };
}

const ACTION_COSTS: ActionCost[] = [
  { label: 'Create a Website', cost: 50, icon: <IconGlobe /> },
  { label: 'Connect a Domain', cost: 20, icon: <IconLink /> },
  { label: 'Set Up an Email',  cost: 10, icon: <IconMail /> },
  { label: 'AI Content Rewrite', cost: 3, icon: <IconSparkle /> },
];

// ─── Components ───────────────────────────────────────────────────────────────

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accent: string;
  href?: string;
  loading?: boolean;
};

function StatCard({ title, value, subtitle, icon, accent, href, loading }: StatCardProps) {
  const content = (
    <div className={`p-5 rounded-xl bg-[#111] border border-white/10 hover:border-white/20 transition-all duration-200 group ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
          {icon}
        </div>
        {href && (
          <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-white/10 rounded animate-pulse mb-1" />
      ) : (
        <p className="text-3xl font-black text-white tabular-nums mb-1">{value}</p>
      )}
      <p className="text-sm font-medium text-gray-300">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [selectedAction, setSelectedAction] = useState<ActionCost>(ACTION_COSTS[0]);
  const [loading, setLoading]               = useState<boolean>(true);
  const [data, setData]                     = useState<DashboardData | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/tokens').then((r) => r.json()),
      fetch('/api/websites').then((r) => r.json()),
      fetch('/api/domains').then((r) => r.json()),
      fetch('/api/emails').then((r) => r.json()),
    ]).then(([tokens, websites, domains, emails]) => {
      setData({ tokens, websites, domains, emails });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const tokenBalance    = data?.tokens?.wallet?.balance ?? 0;
  const lifetimeSpent   = data?.tokens?.wallet?.lifetimeSpent ?? 0;
  const daysRemaining   = data?.tokens?.daysRemaining ?? 0;
  const transactions    = data?.tokens?.transactions ?? [];
  const websiteCount    = data?.websites?.websites?.length ?? 0;
  const domainCount     = data?.domains?.domains?.filter((d) => d.verified)?.length ?? 0;
  const emailCount      = data?.emails?.emails?.length ?? 0;
  const canAfford       = tokenBalance >= selectedAction.cost;

  // Compute this-month spend breakdown from transactions
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthTx = transactions.filter(
    (t) => t.amount < 0 && new Date(t.createdAt) >= monthStart
  );
  const monthSpent = monthTx.reduce((s, t) => s + Math.abs(t.amount), 0);

  const breakdown = { websites: 0, domains: 0, emails: 0, ai: 0, other: 0 };
  for (const t of monthTx) {
    const d = (t.description ?? '').toLowerCase();
    if (d.includes('website'))                   breakdown.websites += Math.abs(t.amount);
    else if (d.includes('domain'))               breakdown.domains  += Math.abs(t.amount);
    else if (d.includes('email'))                breakdown.emails   += Math.abs(t.amount);
    else if (d.includes('ai') || d.includes('rewrite')) breakdown.ai += Math.abs(t.amount);
    else                                         breakdown.other    += Math.abs(t.amount);
  }

  const recentActivity = transactions.slice(0, 6);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{greeting}</h2>
          <p className="text-gray-400 mt-1 text-sm">
            Here&apos;s what&apos;s happening with your account today.
          </p>
        </div>
        {!loading && daysRemaining > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Projected empty</p>
            <p className="text-2xl font-black text-amber-400 tabular-nums">{daysRemaining}d</p>
            <p className="text-xs text-gray-500">at current usage rate</p>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Token Balance"
          value={tokenBalance.toLocaleString()}
          subtitle="tokens remaining"
          icon={<IconCoin className="w-5 h-5 text-amber-400" />}
          accent="bg-amber-400/10"
          href="/dashboard/tokens"
          loading={loading}
        />
        <StatCard
          title="Websites Created"
          value={websiteCount}
          subtitle="active sites"
          icon={<IconGlobe className="w-5 h-5 text-blue-400" />}
          accent="bg-blue-500/10"
          href="/dashboard/websites"
          loading={loading}
        />
        <StatCard
          title="Domains Connected"
          value={domainCount}
          subtitle="verified domains"
          icon={<IconLink className="w-5 h-5 text-purple-400" />}
          accent="bg-purple-500/10"
          href="/dashboard/domains"
          loading={loading}
        />
        <StatCard
          title="Emails Active"
          value={emailCount}
          subtitle="mailboxes"
          icon={<IconMail className="w-5 h-5 text-green-400" />}
          accent="bg-green-500/10"
          href="/dashboard/emails"
          loading={loading}
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Token usage this month */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#111] border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">This Month&apos;s Usage</h3>
            <Link href="/dashboard/usage" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              View details →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-8 w-32 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-full bg-white/10 rounded-full animate-pulse" />
            </div>
          ) : monthSpent === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No tokens spent this month yet.</p>
              <p className="text-gray-600 text-xs mt-1">Create a site or add a domain to get started.</p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-3xl font-black text-white tabular-nums">{monthSpent.toLocaleString()}</span>
                <span className="text-gray-500 mb-1">tokens spent this month</span>
              </div>

              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mb-3 flex">
                {breakdown.websites > 0 && <div className="h-full bg-blue-500"   style={{ width: `${(breakdown.websites / monthSpent) * 100}%` }} />}
                {breakdown.domains  > 0 && <div className="h-full bg-purple-500 ml-0.5" style={{ width: `${(breakdown.domains  / monthSpent) * 100}%` }} />}
                {breakdown.emails   > 0 && <div className="h-full bg-green-500  ml-0.5" style={{ width: `${(breakdown.emails   / monthSpent) * 100}%` }} />}
                {breakdown.ai       > 0 && <div className="h-full bg-pink-500   ml-0.5" style={{ width: `${(breakdown.ai       / monthSpent) * 100}%` }} />}
                {breakdown.other    > 0 && <div className="h-full bg-gray-500   ml-0.5" style={{ width: `${(breakdown.other    / monthSpent) * 100}%` }} />}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                {breakdown.websites > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Websites ({breakdown.websites})</span>}
                {breakdown.domains  > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />Domains ({breakdown.domains})</span>}
                {breakdown.emails   > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Emails ({breakdown.emails})</span>}
                {breakdown.ai       > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />AI ({breakdown.ai})</span>}
                {breakdown.other    > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />Other ({breakdown.other})</span>}
              </div>
            </>
          )}

          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-sm text-gray-400">{tokenBalance.toLocaleString()} tokens remaining</span>
            <span className="text-xs text-gray-500">{lifetimeSpent.toLocaleString()} spent all time</span>
          </div>
        </div>

        {/* Cost preview widget */}
        <div className="p-5 rounded-xl bg-[#111] border border-white/10">
          <h3 className="font-semibold text-white mb-4">Cost Before Action</h3>
          <p className="text-xs text-gray-500 mb-3">Select an action to see its token cost</p>

          <div className="space-y-1.5 mb-4">
            {ACTION_COSTS.map((action) => (
              <button
                key={action.label}
                onClick={() => setSelectedAction(action)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all border ${
                  selectedAction.label === action.label
                    ? 'bg-blue-500/15 border-blue-500/30 text-white'
                    : 'border-transparent hover:border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={selectedAction.label === action.label ? 'text-blue-400' : 'text-gray-500'}>{action.icon}</span>
                  <span>{action.label}</span>
                </span>
                <span className={`font-bold tabular-nums ${selectedAction.label === action.label ? 'text-amber-400' : 'text-gray-500'}`}>
                  {action.cost}
                </span>
              </button>
            ))}
          </div>

          <div className={`p-3 rounded-lg border ${canAfford ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Token cost</span>
              <span className="text-sm font-bold text-amber-400">−{selectedAction.cost} tokens</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Balance after</span>
              <span className={`text-sm font-bold tabular-nums ${canAfford ? 'text-white' : 'text-red-400'}`}>
                {(tokenBalance - selectedAction.cost).toLocaleString()}
              </span>
            </div>
            <div className={`text-xs font-semibold text-center py-1 rounded ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
              {loading ? '…' : canAfford ? 'You can afford this action' : 'Insufficient tokens'}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent activity */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#111] border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Recent Activity</h3>
            <Link href="/dashboard/usage" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 bg-white/10 rounded-lg animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-40 bg-white/10 rounded animate-pulse" />
                    <div className="h-2.5 w-24 bg-white/10 rounded animate-pulse" />
                  </div>
                  <div className="h-3 w-12 bg-white/10 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No activity yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((tx, i) => {
                const { icon, color } = txIcon(tx);
                return (
                  <div key={tx.id} className={`flex items-center gap-3 py-3 ${i < recentActivity.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center flex-shrink-0 ${color}`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{tx.description}</p>
                      <p className="text-xs text-gray-500">{timeAgo(tx.createdAt)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold tabular-nums ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </p>
                      <p className="text-xs text-gray-600">{tx.balanceAfter} left</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="p-5 rounded-xl bg-[#111] border border-white/10">
          <h3 className="font-semibold text-white mb-4">Quick Actions</h3>

          <div className="space-y-3">
            <Link
              href="/dashboard/websites"
              className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/30 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0 group-hover:bg-blue-500/30 transition-colors">
                <IconGlobe className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Create Website</p>
                <p className="text-xs text-gray-500">50 tokens</p>
              </div>
              <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/dashboard/domains"
              className="flex items-center gap-3 p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/30 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
                <IconLink className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Add Domain</p>
                <p className="text-xs text-gray-500">20 tokens</p>
              </div>
              <svg className="w-4 h-4 text-gray-600 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/dashboard/emails"
              className="flex items-center gap-3 p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 hover:border-green-500/30 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 flex-shrink-0 group-hover:bg-green-500/30 transition-colors">
                <IconMail className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Set Up Email</p>
                <p className="text-xs text-gray-500">10 tokens</p>
              </div>
              <svg className="w-4 h-4 text-gray-600 group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <div className="pt-2 border-t border-white/5">
              <Link
                href="/dashboard/tokens"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 hover:bg-amber-400/15 hover:border-amber-400/30 text-amber-400 text-sm font-semibold transition-all"
              >
                <IconCoin className="w-4 h-4" />
                Top Up Tokens
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import Link from 'next/link';

// TODO: replace with real data from API
const MOCK_DATA = {
  user: { name: 'Thiago' },
  tokenBalance: 650,
  monthlyAllowance: 2000,
  tokensUsedThisMonth: 1350,
  websitesCreated: 3,
  domainsConnected: 2,
  emailsActive: 5,
  avgDailyUsage: 32,
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconCoin({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconGlobe({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function IconLink({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function IconMail({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function IconSparkle({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3l1.5 3.5L10 8l-3.5 1.5L5 13l-1.5-3.5L0 8l3.5-1.5L5 3zm14 11l1 2.5L22.5 17l-2.5 1L19 20.5l-1-2.5L15.5 17l2.5-1L19 14zm-7-9l.75 1.75L14.5 7.5l-1.75.75L12 10l-.75-1.75L9.5 7.5l1.75-.75L12 5z" />
    </svg>
  );
}

const ACTION_COSTS = [
  { label: 'Create a Website', cost: 50, icon: <IconGlobe /> },
  { label: 'Connect a Domain', cost: 20, icon: <IconLink /> },
  { label: 'Set Up an Email', cost: 10, icon: <IconMail /> },
  { label: 'AI Content Rewrite', cost: 3, icon: <IconSparkle /> },
];

// TODO: replace with real activity feed from API
const MOCK_ACTIVITY = [
  { id: 1, action: 'Website created', detail: 'myshop.tokenflow.app', tokens: -50, balance: 650, time: '2 hours ago', icon: <IconGlobe />, color: 'text-blue-400' },
  { id: 2, action: 'AI Rewrite', detail: 'Homepage hero text', tokens: -3, balance: 700, time: '5 hours ago', icon: <IconSparkle />, color: 'text-pink-400' },
  { id: 3, action: 'Email account setup', detail: 'hello@myshop.com', tokens: -10, balance: 703, time: '1 day ago', icon: <IconMail />, color: 'text-green-400' },
  { id: 4, action: 'Domain connected', detail: 'myshop.com', tokens: -20, balance: 713, time: '1 day ago', icon: <IconLink />, color: 'text-purple-400' },
  { id: 5, action: 'Token top-up', detail: '$25 pack — 1500 tokens', tokens: +1500, balance: 733, time: '3 days ago', icon: <IconCoin />, color: 'text-amber-400' },
];

function StatCard({ title, value, subtitle, icon, accent, href }) {
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
      <p className="text-3xl font-black text-white tabular-nums mb-1">{value}</p>
      <p className="text-sm font-medium text-gray-300">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

export default function DashboardPage() {
  const [selectedAction, setSelectedAction] = useState(ACTION_COSTS[0]);
  const { tokenBalance, monthlyAllowance, tokensUsedThisMonth, avgDailyUsage, user } = MOCK_DATA;
  const daysRemaining = Math.floor(tokenBalance / avgDailyUsage);
  const percentUsed = Math.round((tokensUsedThisMonth / monthlyAllowance) * 100);
  const canAfford = tokenBalance >= selectedAction.cost;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {greeting}, {user.name}
          </h2>
          <p className="text-gray-400 mt-1 text-sm">
            Here&apos;s what&apos;s happening with your account today.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Projected empty</p>
          <p className="text-2xl font-black text-amber-400 tabular-nums">
            {daysRemaining}d
          </p>
          <p className="text-xs text-gray-500">at {avgDailyUsage} tokens/day</p>
        </div>
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
        />
        <StatCard
          title="Websites Created"
          value={MOCK_DATA.websitesCreated}
          subtitle="active sites"
          icon={<IconGlobe className="w-5 h-5 text-blue-400" />}
          accent="bg-blue-500/10"
          href="/dashboard/websites"
        />
        <StatCard
          title="Domains Connected"
          value={MOCK_DATA.domainsConnected}
          subtitle="verified domains"
          icon={<IconLink className="w-5 h-5 text-purple-400" />}
          accent="bg-purple-500/10"
          href="/dashboard/domains"
        />
        <StatCard
          title="Emails Active"
          value={MOCK_DATA.emailsActive}
          subtitle="mailboxes"
          icon={<IconMail className="w-5 h-5 text-green-400" />}
          accent="bg-green-500/10"
          href="/dashboard/emails"
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Token usage progress */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#111] border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Monthly Token Usage</h3>
            <Link href="/dashboard/usage" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              View details →
            </Link>
          </div>

          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-black text-white tabular-nums">{tokensUsedThisMonth.toLocaleString()}</span>
            <span className="text-gray-500 mb-1">/ {monthlyAllowance.toLocaleString()} tokens</span>
            <span className="ml-auto text-sm font-semibold text-gray-300">{percentUsed}%</span>
          </div>

          {/* Segmented usage bar */}
          <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mb-3 flex">
            <div className="h-full bg-blue-500" style={{ width: '18%' }} title="Websites: 360 tokens" />
            <div className="h-full bg-purple-500 ml-0.5" style={{ width: '3%' }} title="Domains: 60 tokens" />
            <div className="h-full bg-green-500 ml-0.5" style={{ width: '4%' }} title="Emails: 80 tokens" />
            <div className="h-full bg-pink-500 ml-0.5" style={{ width: '43%' }} title="AI Rewrites: 850 tokens" />
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Websites (360)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />Domains (60)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Emails (80)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />AI (850)</span>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-sm text-gray-400">{tokenBalance.toLocaleString()} tokens remaining this month</span>
            <span className="text-xs text-gray-500">Resets in 12 days</span>
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
              {canAfford ? 'You can afford this action' : 'Insufficient tokens'}
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

          <div className="space-y-1">
            {MOCK_ACTIVITY.map((item, i) => (
              <div key={item.id} className={`flex items-center gap-3 py-3 ${i < MOCK_ACTIVITY.length - 1 ? 'border-b border-white/5' : ''}`}>
                <div className={`w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{item.action}</p>
                  <p className="text-xs text-gray-500 truncate">{item.detail}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold tabular-nums ${item.tokens > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {item.tokens > 0 ? '+' : ''}{item.tokens}
                  </p>
                  <p className="text-xs text-gray-600">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
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

'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// TODO: replace with real data from API — last 30 days of token usage
const generateDailyData = () => {
  const data = [];
  const now = new Date('2026-03-31');
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const websites = Math.random() > 0.85 ? 50 : 0;
    const domains = Math.random() > 0.92 ? 20 : 0;
    const emails = Math.random() > 0.88 ? 10 : 0;
    const ai = Math.floor(Math.random() * 45);
    data.push({ date: label, websites, domains, emails, ai, total: websites + domains + emails + ai });
  }
  return data;
};

const DAILY_DATA = generateDailyData();

// TODO: replace with real breakdown from API
const DONUT_DATA = [
  { name: 'AI Rewrites', value: 850, color: '#ec4899' },
  { name: 'Websites', value: 360, color: '#3b82f6' },
  { name: 'Emails', value: 80, color: '#22c55e' },
  { name: 'Domains', value: 60, color: '#a855f7' },
];

// TODO: replace with real transaction log from API
const MOCK_TRANSACTIONS = [
  { id: 1, date: 'Mar 31, 2026', time: '14:32', action: 'Website created', detail: 'myshop.tokenflow.app', tokens: -50, balance: 650, category: 'websites' },
  { id: 2, date: 'Mar 31, 2026', time: '11:15', action: 'AI Rewrite', detail: 'Homepage hero', tokens: -3, balance: 700, category: 'ai' },
  { id: 3, date: 'Mar 31, 2026', time: '11:12', action: 'AI Rewrite', detail: 'Product description ×2', tokens: -6, balance: 703, category: 'ai' },
  { id: 4, date: 'Mar 30, 2026', time: '16:45', action: 'Email created', detail: 'hello@myshop.com', tokens: -10, balance: 709, category: 'emails' },
  { id: 5, date: 'Mar 30, 2026', time: '10:23', action: 'Domain connected', detail: 'myshop.com', tokens: -20, balance: 719, category: 'domains' },
  { id: 6, date: 'Mar 29, 2026', time: '09:55', action: 'AI Rewrite', detail: 'About page', tokens: -3, balance: 739, category: 'ai' },
  { id: 7, date: 'Mar 28, 2026', time: '13:10', action: 'Token top-up', detail: '$25 pack', tokens: +1500, balance: 742, category: 'topup' },
  { id: 8, date: 'Mar 27, 2026', time: '11:00', action: 'Website created', detail: 'portfolio.tokenflow.app', tokens: -50, balance: -758, category: 'websites' },
  { id: 9, date: 'Mar 25, 2026', time: '15:30', action: 'AI Rewrite', detail: 'Blog post intro', tokens: -3, balance: 808, category: 'ai' },
  { id: 10, date: 'Mar 24, 2026', time: '10:02', action: 'Email created', detail: 'orders@myshop.com', tokens: -10, balance: 811, category: 'emails' },
];

const CATEGORY_COLORS: Record<string, string> = {
  websites: '#3b82f6',
  domains: '#a855f7',
  emails: '#22c55e',
  ai: '#ec4899',
  topup: '#f59e0b',
};

const CATEGORY_ICONS: Record<string, string> = {
  websites: '🌐',
  domains: '🔗',
  emails: '✉️',
  ai: '✨',
  topup: '💰',
};

type TooltipPayload = { value?: number; dataKey?: string; fill?: string };

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string } = {}) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((s: number, p: TooltipPayload) => s + (p.value || 0), 0);
    return (
      <div className="bg-[#1a1a1a] border border-white/15 rounded-xl p-3 shadow-xl text-xs min-w-[140px]">
        <p className="text-gray-400 mb-2 font-medium">{label}</p>
        {payload.map((p: TooltipPayload) => (p.value ?? 0) > 0 && (
          <div key={p.dataKey} className="flex items-center justify-between gap-3 mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.fill }} />
              <span className="text-gray-300 capitalize">{p.dataKey}</span>
            </span>
            <span className="font-bold text-white">{p.value}</span>
          </div>
        ))}
        {total > 0 && (
          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-gray-400">Total</span>
            <span className="font-black text-amber-400">{total}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const DonutTooltip = ({ active, payload }: any = {}) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const total = DONUT_DATA.reduce((s, d) => s + d.value, 0);
    return (
      <div className="bg-[#1a1a1a] border border-white/15 rounded-xl p-3 shadow-xl text-xs">
        <p className="font-semibold text-white mb-1">{item.name}</p>
        <p className="text-amber-400 font-bold">{item.value} tokens</p>
        <p className="text-gray-400">{Math.round((item.value / total) * 100)}% of total</p>
      </div>
    );
  }
  return null;
};

export default function UsagePage() {
  const [activeCategory, setActiveCategory] = useState('all');

  const totalSpent = MOCK_TRANSACTIONS.filter((t) => t.tokens < 0).reduce((s, t) => s + Math.abs(t.tokens), 0);
  const avgDaily = Math.round(DAILY_DATA.reduce((s, d) => s + d.total, 0) / DAILY_DATA.length);
  const peakDay = DAILY_DATA.reduce((max, d) => (d.total > max.total ? d : max), DAILY_DATA[0]);
  const totalDonut = DONUT_DATA.reduce((s, d) => s + d.value, 0);

  const filteredTransactions = activeCategory === 'all'
    ? MOCK_TRANSACTIONS
    : MOCK_TRANSACTIONS.filter((t) => t.category === activeCategory);

  const handleExportCSV = () => {
    // TODO: generate real CSV from API data
    const headers = ['Date', 'Time', 'Action', 'Detail', 'Tokens', 'Balance'];
    const rows = MOCK_TRANSACTIONS.map((t) => [t.date, t.time, t.action, t.detail, t.tokens, Math.abs(t.balance)]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tokenflow-usage.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Tokens Used (30d)', value: totalSpent.toLocaleString(), sub: 'this period' },
          { label: 'Daily Average', value: avgDaily, sub: 'tokens/day' },
          { label: 'Peak Day', value: peakDay.total, sub: peakDay.date },
          { label: 'Most Used', value: 'AI Rewrites', sub: `${DONUT_DATA[0].value} tokens` },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl bg-[#111] border border-white/10">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">{stat.label}</p>
            <p className="text-2xl font-black text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Bar chart — daily spend */}
      <div className="p-5 rounded-xl bg-[#111] border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-white">Daily Token Spend</h3>
            <p className="text-xs text-gray-500 mt-0.5">Last 30 days</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {[
              { key: 'websites', color: '#3b82f6', label: 'Websites' },
              { key: 'domains', color: '#a855f7', label: 'Domains' },
              { key: 'emails', color: '#22c55e', label: 'Emails' },
              { key: 'ai', color: '#ec4899', label: 'AI' },
            ].map((item) => (
              <span key={item.key} className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DAILY_DATA} barSize={8} barGap={1}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="websites" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="domains" stackId="a" fill="#a855f7" />
              <Bar dataKey="emails" stackId="a" fill="#22c55e" />
              <Bar dataKey="ai" stackId="a" fill="#ec4899" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Donut chart */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#111] border border-white/10">
          <h3 className="font-semibold text-white mb-1">Breakdown by Feature</h3>
          <p className="text-xs text-gray-500 mb-4">All time</p>

          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={DONUT_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {DONUT_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 mt-2">
            {DONUT_DATA.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-white">{item.value}</span>
                  <span className="text-xs text-gray-500 ml-1">{Math.round((item.value / totalDonut) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction table */}
        <div className="lg:col-span-3 rounded-xl bg-[#111] border border-white/10 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
            <h3 className="font-semibold text-white">Transaction Log</h3>
            <div className="flex items-center gap-2">
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-gray-300 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="websites">Websites</option>
                <option value="domains">Domains</option>
                <option value="emails">Emails</option>
                <option value="ai">AI</option>
                <option value="topup">Top-ups</option>
              </select>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#111]">
                <tr className="border-b border-white/10">
                  <th className="text-left px-5 py-2.5 text-xs text-gray-500 uppercase tracking-wider font-medium">Date</th>
                  <th className="text-left px-5 py-2.5 text-xs text-gray-500 uppercase tracking-wider font-medium">Action</th>
                  <th className="text-right px-5 py-2.5 text-xs text-gray-500 uppercase tracking-wider font-medium">Tokens</th>
                  <th className="text-right px-5 py-2.5 text-xs text-gray-500 uppercase tracking-wider font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx, i) => (
                  <tr
                    key={tx.id}
                    className={`${i < filteredTransactions.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/2 transition-colors`}
                  >
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                      <span>{tx.date}</span>
                      <span className="ml-1 text-gray-600">{tx.time}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{CATEGORY_ICONS[tx.category]}</span>
                        <div>
                          <p className="text-white text-xs font-medium">{tx.action}</p>
                          <p className="text-gray-600 text-xs truncate max-w-[120px]">{tx.detail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className="font-bold text-sm tabular-nums"
                        style={{ color: tx.tokens > 0 ? '#22c55e' : CATEGORY_COLORS[tx.category] || '#ef4444' }}
                      >
                        {tx.tokens > 0 ? '+' : ''}{tx.tokens}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-white text-sm tabular-nums">
                      {Math.abs(tx.balance).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

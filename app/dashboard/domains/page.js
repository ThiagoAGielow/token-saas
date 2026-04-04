'use client';

import { useState } from 'react';

// TODO: replace with real data from API
const MOCK_DOMAINS = [
  {
    id: 1,
    domain: 'myshop.com',
    status: 'verified',
    connectedSite: 'myshop.tokenflow.app',
    connectedSiteName: 'My Shop',
    addedAt: 'Mar 28, 2026',
    tokensCost: 20,
    ssl: true,
  },
  {
    id: 2,
    domain: 'thiago.dev',
    status: 'pending',
    connectedSite: 'portfolio.tokenflow.app',
    connectedSiteName: 'Portfolio',
    addedAt: 'Mar 30, 2026',
    tokensCost: 20,
    ssl: false,
  },
];

// TODO: replace with real DNS instructions per provider
const DNS_INSTRUCTIONS = [
  { type: 'CNAME', name: 'www', value: 'cname.tokenflow.app', ttl: '3600' },
  { type: 'A', name: '@', value: '76.76.19.19', ttl: '3600' },
];

const STATUS_STYLES = {
  verified: 'bg-green-500/15 text-green-400 border-green-500/25',
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  failed: 'bg-red-500/15 text-red-400 border-red-500/25',
};

export default function DomainsPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [expandedDomain, setExpandedDomain] = useState(null);
  const tokenBalance = 650; // TODO: replace with real balance from context

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Connected Domains</h2>
          <p className="text-sm text-gray-400 mt-0.5">{MOCK_DOMAINS.length} domain{MOCK_DOMAINS.length !== 1 ? 's' : ''} connected · 20 tokens each</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Domain
        </button>
      </div>

      {/* Add domain form */}
      {showAddForm && (
        <div className="p-5 rounded-xl bg-[#111] border border-blue-500/20 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white">Add a Custom Domain</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
              20 tokens
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Domain Name</label>
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="yourdomain.com"
                className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Connect to Website</label>
              <select className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500">
                <option value="">Select website…</option>
                <option value="myshop">My Shop</option>
                <option value="portfolio">Portfolio</option>
                <option value="blog">Blog Draft</option>
              </select>
            </div>
          </div>

          {/* DNS instructions preview */}
          {newDomain && (
            <div className="p-4 rounded-lg bg-[#1a1a1a] border border-white/10">
              <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">DNS Records to Add</p>
              <div className="space-y-2">
                {DNS_INSTRUCTIONS.map((record) => (
                  <div key={record.type + record.name} className="flex items-center gap-3 text-xs font-mono">
                    <span className="w-12 px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-center font-bold">{record.type}</span>
                    <span className="w-8 text-gray-400">{record.name}</span>
                    <span className="flex-1 text-white">{record.value}</span>
                    <span className="text-gray-600">TTL: {record.ttl}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">DNS changes can take up to 48 hours to propagate</p>
            </div>
          )}

          <div className="flex items-center gap-4 pt-1">
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span>Balance after:</span>
              <span className="text-white font-semibold">{(tokenBalance - 20).toLocaleString()} tokens</span>
            </div>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                disabled={!newDomain || tokenBalance < 20}
              >
                {/* TODO: call add domain API */}
                Add Domain (−20 tokens)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Domains table */}
      <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden">
        {MOCK_DOMAINS.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-3xl mb-4">🔗</div>
            <h3 className="text-lg font-bold text-white mb-1">No domains yet</h3>
            <p className="text-gray-400 text-sm text-center max-w-xs mb-1">Connect a custom domain to your website.</p>
            <p className="text-amber-400 font-semibold text-sm">20 tokens per domain</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Domain</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Status</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Connected Site</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Added</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">SSL</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_DOMAINS.map((domain, i) => (
                <>
                  <tr
                    key={domain.id}
                    className={`${i < MOCK_DOMAINS.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/2 transition-colors cursor-pointer`}
                    onClick={() => setExpandedDomain(expandedDomain === domain.id ? null : domain.id)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{domain.domain}</span>
                        <span className="text-xs text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full border border-amber-400/20">
                          {domain.tokensCost}t
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[domain.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${domain.status === 'verified' ? 'bg-green-400' : domain.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                        {domain.status.charAt(0).toUpperCase() + domain.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-white">{domain.connectedSiteName}</p>
                        <p className="text-xs text-gray-500">{domain.connectedSite}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-400">{domain.addedAt}</td>
                    <td className="px-5 py-4">
                      {domain.ssl ? (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {domain.status === 'pending' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); /* TODO: re-check DNS */ }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors"
                          >
                            Verify DNS
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); /* TODO: remove domain */ }}
                          className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded DNS row */}
                  {expandedDomain === domain.id && (
                    <tr key={`${domain.id}-dns`} className="bg-[#0d0d0d]">
                      <td colSpan={6} className="px-5 py-4">
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
                            {domain.status === 'verified' ? 'Active DNS Configuration' : 'Required DNS Records — Add these at your registrar'}
                          </p>
                          {DNS_INSTRUCTIONS.map((record) => (
                            <div key={record.type + record.name} className="flex items-center gap-4 text-xs font-mono bg-[#111] rounded-lg px-4 py-2.5 border border-white/5">
                              <span className="w-12 text-center px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">{record.type}</span>
                              <span className="w-8 text-gray-400">{record.name}</span>
                              <span className="flex-1 text-white">{record.value}</span>
                              <span className="text-gray-600">TTL: {record.ttl}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info box */}
      <div className="p-4 rounded-xl bg-[#111] border border-white/10 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm text-gray-400">
          <p className="font-medium text-white mb-0.5">Domain verification takes up to 48 hours</p>
          DNS propagation times vary by registrar. Once verified, SSL is provisioned automatically within a few minutes.
          Removing a domain does not refund tokens.
        </div>
      </div>
    </div>
  );
}

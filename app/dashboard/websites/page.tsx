'use client';

import { useState } from 'react';

// TODO: replace with real data from API
const MOCK_WEBSITES = [
  {
    id: 1,
    name: 'My Shop',
    subdomain: 'myshop.tokenflow.app',
    customDomain: 'myshop.com',
    status: 'live',
    template: 'E-commerce',
    tokensCost: 50,
    createdAt: 'Mar 28, 2026',
    lastUpdated: '2 hours ago',
    pageViews: 1284,
    thumbnail: null,
  },
  {
    id: 2,
    name: 'Portfolio',
    subdomain: 'portfolio.tokenflow.app',
    customDomain: null,
    status: 'live',
    template: 'Portfolio',
    tokensCost: 50,
    createdAt: 'Mar 15, 2026',
    lastUpdated: '5 days ago',
    pageViews: 342,
    thumbnail: null,
  },
  {
    id: 3,
    name: 'Blog Draft',
    subdomain: 'blog-draft.tokenflow.app',
    customDomain: null,
    status: 'draft',
    template: 'Blog',
    tokensCost: 50,
    createdAt: 'Mar 30, 2026',
    lastUpdated: '1 day ago',
    pageViews: 0,
    thumbnail: null,
  },
];

const STATUS_STYLES: Record<string, string> = {
  live: 'bg-green-500/15 text-green-400 border-green-500/25',
  draft: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  offline: 'bg-red-500/15 text-red-400 border-red-500/25',
};

const STATUS_DOT: Record<string, string> = {
  live: 'bg-green-400',
  draft: 'bg-yellow-400',
  offline: 'bg-red-400',
};

export default function WebsitesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const tokenBalance = 650; // TODO: replace with real balance from context

  if (MOCK_WEBSITES.length === 0) {
    return (
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Your Websites</h2>
            <p className="text-sm text-gray-400 mt-0.5">Each website costs 50 tokens to create</p>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-24 rounded-xl bg-[#111] border border-white/10 border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-3xl mb-4">
            🌐
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Create your first website</h3>
          <p className="text-gray-400 text-sm text-center max-w-sm mb-2">
            Get a free subdomain on tokenflow.app or connect your own custom domain.
          </p>
          <p className="text-amber-400 font-semibold text-sm mb-6">50 tokens per website</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Website
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Your Websites</h2>
          <p className="text-sm text-gray-400 mt-0.5">{MOCK_WEBSITES.length} website{MOCK_WEBSITES.length !== 1 ? 's' : ''} created · 50 tokens each</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Website
        </button>
      </div>

      {/* Websites grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {MOCK_WEBSITES.map((site) => (
          <div
            key={site.id}
            className="rounded-xl bg-[#111] border border-white/10 hover:border-white/20 transition-all duration-200 overflow-hidden group"
          >
            {/* Thumbnail placeholder */}
            <div className="h-36 bg-gradient-to-br from-[#1a1a1a] to-[#111] border-b border-white/10 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'radial-gradient(circle at 20% 50%, #0ea5e9 0%, transparent 50%), radial-gradient(circle at 80% 20%, #8b5cf6 0%, transparent 50%)',
                }}
              />
              <div className="text-4xl opacity-30">🌐</div>
              <div className="absolute top-3 right-3">
                <span className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border ${STATUS_STYLES[site.status]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[site.status]}`} />
                  {site.status.charAt(0).toUpperCase() + site.status.slice(1)}
                </span>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-white">{site.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{site.template} template</p>
                </div>
                <span className="text-xs text-amber-400 font-semibold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                  {site.tokensCost}t
                </span>
              </div>

              <div className="space-y-1 mb-3">
                <a
                  href={`https://${site.subdomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors group/link"
                >
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span className="truncate">{site.subdomain}</span>
                </a>
                {site.customDomain && (
                  <p className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    </svg>
                    <span className="truncate">{site.customDomain}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-3 pb-3 border-b border-white/5">
                <span>{site.pageViews.toLocaleString()} views</span>
                <span>Updated {site.lastUpdated}</span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://${site.subdomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 font-medium text-center transition-colors"
                >
                  Preview
                </a>
                <button className="flex-1 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-xs text-blue-400 font-medium transition-colors">
                  {/* TODO: link to site editor */}
                  Edit
                </button>
                <button className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-gray-500 hover:text-red-400 transition-all">
                  {/* TODO: implement delete with confirmation */}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add new card */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-xl border border-dashed border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-200 flex flex-col items-center justify-center gap-3 min-h-[280px] text-gray-500 hover:text-blue-400 group"
        >
          <div className="w-12 h-12 rounded-xl border-2 border-dashed border-current flex items-center justify-center group-hover:border-blue-500/50 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">New Website</p>
            <p className="text-xs text-amber-400/70 mt-0.5">50 tokens</p>
          </div>
        </button>
      </div>

      {/* Create website modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111] border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Create New Website</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Site Name</label>
                <input
                  type="text"
                  placeholder="My Awesome Site"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Subdomain</label>
                <div className="flex items-center rounded-lg bg-[#1a1a1a] border border-white/10 overflow-hidden focus-within:border-blue-500">
                  <input
                    type="text"
                    placeholder="my-site"
                    className="flex-1 px-3 py-2.5 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
                  />
                  <span className="px-3 py-2.5 text-sm text-gray-500 bg-white/5 border-l border-white/10">.tokenflow.app</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Template</label>
                <select className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500">
                  <option>Portfolio</option>
                  <option>Blog</option>
                  <option>E-commerce</option>
                  <option>Landing Page</option>
                  <option>Blank</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-amber-400/5 border border-amber-400/10 flex items-center justify-between">
                <span className="text-sm text-gray-300">Token cost</span>
                <span className="text-amber-400 font-bold">−50 tokens</span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>Current balance</span>
                <span className="text-white font-semibold">{tokenBalance.toLocaleString()} tokens</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>Balance after</span>
                <span className={`font-semibold ${tokenBalance >= 50 ? 'text-white' : 'text-red-400'}`}>
                  {(tokenBalance - 50).toLocaleString()} tokens
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                className="flex-1 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                disabled={tokenBalance < 50}
              >
                {/* TODO: call create website API */}
                Create Website
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

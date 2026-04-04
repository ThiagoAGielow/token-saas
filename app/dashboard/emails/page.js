'use client';

import { useState } from 'react';

// TODO: replace with real data from API
const MOCK_EMAILS = [
  {
    id: 1,
    address: 'hello@myshop.com',
    name: 'Hello — My Shop',
    domain: 'myshop.com',
    storageUsed: 142, // MB
    storageLimit: 500,
    createdAt: 'Mar 28, 2026',
    status: 'active',
    tokensCost: 10,
    lastActivity: '1 hour ago',
  },
  {
    id: 2,
    address: 'orders@myshop.com',
    name: 'Orders — My Shop',
    domain: 'myshop.com',
    storageUsed: 89,
    storageLimit: 500,
    createdAt: 'Mar 28, 2026',
    status: 'active',
    tokensCost: 10,
    lastActivity: '3 hours ago',
  },
  {
    id: 3,
    address: 'support@myshop.com',
    name: 'Support — My Shop',
    domain: 'myshop.com',
    storageUsed: 23,
    storageLimit: 500,
    createdAt: 'Mar 29, 2026',
    status: 'active',
    tokensCost: 10,
    lastActivity: '2 days ago',
  },
  {
    id: 4,
    address: 'me@thiago.dev',
    name: 'Personal — Thiago',
    domain: 'thiago.dev',
    storageUsed: 512,
    storageLimit: 500,
    createdAt: 'Mar 30, 2026',
    status: 'over_quota',
    tokensCost: 10,
    lastActivity: 'Just now',
  },
  {
    id: 5,
    address: 'noreply@thiago.dev',
    name: 'No Reply — Thiago',
    domain: 'thiago.dev',
    storageUsed: 0,
    storageLimit: 500,
    createdAt: 'Mar 31, 2026',
    status: 'active',
    tokensCost: 10,
    lastActivity: 'Never',
  },
];

const STATUS_STYLES = {
  active: 'bg-green-500/15 text-green-400 border-green-500/25',
  over_quota: 'bg-red-500/15 text-red-400 border-red-500/25',
  suspended: 'bg-gray-500/15 text-gray-400 border-gray-500/25',
};

const STATUS_LABEL = {
  active: 'Active',
  over_quota: 'Over Quota',
  suspended: 'Suspended',
};

function StorageBar({ used, limit }) {
  const pct = Math.min((used / limit) * 100, 100);
  const isOver = used > limit;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={isOver ? 'text-red-400 font-medium' : 'text-gray-500'}>
          {used} MB / {limit} MB
        </span>
        <span className={isOver ? 'text-red-400 font-medium' : 'text-gray-600'}>{Math.round(pct)}%</span>
      </div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function EmailsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDomain, setNewDomain] = useState('myshop.com');
  const tokenBalance = 650; // TODO: replace with real balance from context

  const groupedByDomain = MOCK_EMAILS.reduce((acc, email) => {
    if (!acc[email.domain]) acc[email.domain] = [];
    acc[email.domain].push(email);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Email Accounts</h2>
          <p className="text-sm text-gray-400 mt-0.5">{MOCK_EMAILS.length} mailboxes active · 10 tokens each</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Mailbox
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#111] border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">Total Mailboxes</p>
          <p className="text-2xl font-black text-white">{MOCK_EMAILS.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#111] border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">Domains Covered</p>
          <p className="text-2xl font-black text-white">{Object.keys(groupedByDomain).length}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#111] border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">Total Storage Used</p>
          <p className="text-2xl font-black text-white">
            {(MOCK_EMAILS.reduce((s, e) => s + e.storageUsed, 0) / 1024).toFixed(1)}
            <span className="text-base font-normal text-gray-500 ml-1">GB</span>
          </p>
        </div>
      </div>

      {/* Emails table */}
      <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Mailbox</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Status</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium w-52">Storage</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Created</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Last Activity</th>
              <th className="text-right px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_EMAILS.map((email, i) => (
              <tr
                key={email.id}
                className={`${i < MOCK_EMAILS.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/2 transition-colors`}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500/30 to-blue-500/30 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 border border-white/10">
                      {email.address.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white">{email.address}</p>
                      <p className="text-xs text-gray-500">{email.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[email.status]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${email.status === 'active' ? 'bg-green-400' : email.status === 'over_quota' ? 'bg-red-400' : 'bg-gray-400'}`} />
                    {STATUS_LABEL[email.status]}
                  </span>
                </td>
                <td className="px-5 py-4 w-52">
                  <StorageBar used={email.storageUsed} limit={email.storageLimit} />
                </td>
                <td className="px-5 py-4 text-gray-400">{email.createdAt}</td>
                <td className="px-5 py-4 text-gray-400">{email.lastActivity}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white transition-all">
                      {/* TODO: link to webmail or settings */}
                      Settings
                    </button>
                    <button className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all">
                      {/* TODO: implement delete with confirmation */}
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create mailbox modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111] border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">Create Mailbox</h3>
                <p className="text-xs text-amber-400 mt-0.5 font-semibold">−10 tokens</p>
              </div>
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
                <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Email Address</label>
                <div className="flex items-center rounded-lg bg-[#1a1a1a] border border-white/10 overflow-hidden focus-within:border-blue-500">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="hello"
                    className="flex-1 px-3 py-2.5 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
                  />
                  <span className="px-1 py-2.5 text-sm text-gray-500">@</span>
                  <select
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="px-2 py-2.5 bg-white/5 border-l border-white/10 text-gray-300 text-sm focus:outline-none"
                  >
                    <option value="myshop.com">myshop.com</option>
                    <option value="thiago.dev">thiago.dev</option>
                  </select>
                </div>
                <p className="text-xs text-gray-600 mt-1.5">
                  Full address: {newUsername || 'hello'}@{newDomain}
                </p>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Customer Support"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  placeholder="Set a secure password"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-[#1a1a1a] border border-white/10 text-xs text-gray-400 space-y-1">
                <div className="flex justify-between"><span>Storage included</span><span className="text-white">500 MB</span></div>
                <div className="flex justify-between"><span>IMAP / SMTP</span><span className="text-green-400">Included</span></div>
                <div className="flex justify-between"><span>Webmail access</span><span className="text-green-400">Included</span></div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Balance after</span>
                <span className={`font-semibold ${tokenBalance >= 10 ? 'text-white' : 'text-red-400'}`}>
                  {(tokenBalance - 10).toLocaleString()} tokens
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
                disabled={!newUsername || tokenBalance < 10}
              >
                {/* TODO: call create mailbox API */}
                Create Mailbox
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

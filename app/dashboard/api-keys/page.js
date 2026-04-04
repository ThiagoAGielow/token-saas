'use client';

import { useState } from 'react';

// TODO: replace with real data from API
const MOCK_API_KEYS = [
  {
    id: 1,
    name: 'Production App',
    prefix: 'sk_live_aK9m2',
    suffix: '...xQ7p',
    fullKey: 'sk_live_aK9m2xNpR3tVwYjLqBdCeHoFsZu8iG6mK4vQ7p', // only shown once at creation
    environment: 'live',
    createdAt: 'Mar 15, 2026',
    lastUsed: '2 minutes ago',
    requests: 12847,
    status: 'active',
  },
  {
    id: 2,
    name: 'Development Testing',
    prefix: 'sk_test_bP4r7',
    suffix: '...nW2k',
    fullKey: null,
    environment: 'test',
    createdAt: 'Mar 20, 2026',
    lastUsed: '1 hour ago',
    requests: 3241,
    status: 'active',
  },
  {
    id: 3,
    name: 'Staging Environment',
    prefix: 'sk_live_cT8j1',
    suffix: '...yR5x',
    fullKey: null,
    environment: 'live',
    createdAt: 'Mar 22, 2026',
    lastUsed: '3 days ago',
    requests: 589,
    status: 'active',
  },
  {
    id: 4,
    name: 'Old Integration',
    prefix: 'sk_live_dE2q9',
    suffix: '...mU8v',
    fullKey: null,
    environment: 'live',
    createdAt: 'Feb 10, 2026',
    lastUsed: '12 days ago',
    requests: 45123,
    status: 'revoked',
  },
];

const CODE_EXAMPLE = `// Install the SDK
// npm install @tokenflow/sdk

import { TokenFlow } from '@tokenflow/sdk';

const client = new TokenFlow({
  apiKey: process.env.TOKENFLOW_API_KEY,
});

// Create a new website
const website = await client.websites.create({
  name: 'My New Site',
  template: 'portfolio',
  subdomain: 'my-new-site',
});

// List your websites
const websites = await client.websites.list();

// Rewrite content with AI
const result = await client.ai.rewrite({
  content: 'Your existing content here...',
  tone: 'professional',
});

console.log(result.rewritten); // costs 3 tokens`;

export default function ApiKeysPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState('live');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const activeKeys = MOCK_API_KEYS.filter((k) => k.status === 'active');
  const revokedKeys = MOCK_API_KEYS.filter((k) => k.status === 'revoked');

  const handleCreateKey = () => {
    // TODO: call create API key endpoint
    const mockNewKey = `sk_${newKeyEnv === 'live' ? 'live' : 'test'}_${Math.random().toString(36).slice(2, 14)}...${Math.random().toString(36).slice(2, 6)}`;
    setNewlyCreatedKey(mockNewKey);
    setShowCreateModal(false);
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(CODE_EXAMPLE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">API Keys</h2>
          <p className="text-sm text-gray-400 mt-0.5">{activeKeys.length} active key{activeKeys.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create API Key
        </button>
      </div>

      {/* Newly created key banner */}
      {newlyCreatedKey && (
        <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/30">
          <div className="flex items-start gap-3 mb-3">
            <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-green-400 font-semibold text-sm">API key created successfully</p>
              <p className="text-gray-400 text-xs mt-0.5">
                Copy this key now — it will never be shown again for security reasons.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-green-500/20 text-green-300 text-sm font-mono truncate">
              {newlyCreatedKey}
            </code>
            <button
              onClick={() => handleCopyKey(newlyCreatedKey)}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                keyCopied
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-green-500 hover:bg-green-400 text-white'
              }`}
            >
              {keyCopied ? '✓ Copied!' : 'Copy Key'}
            </button>
            <button
              onClick={() => setNewlyCreatedKey(null)}
              className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Active keys table */}
      <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white">Active Keys</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Name</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Key</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Created</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Last Used</th>
              <th className="text-right px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Requests</th>
              <th className="text-right px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeKeys.map((key, i) => (
              <tr key={key.id} className={`${i < activeKeys.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/2 transition-colors`}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{key.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${key.environment === 'live' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                      {key.environment}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <code className="text-xs font-mono text-gray-300 bg-white/5 px-2 py-1 rounded">
                    {key.prefix}••••••{key.suffix}
                  </code>
                </td>
                <td className="px-5 py-4 text-gray-400">{key.createdAt}</td>
                <td className="px-5 py-4 text-gray-400">{key.lastUsed}</td>
                <td className="px-5 py-4 text-right text-white tabular-nums font-medium">{key.requests.toLocaleString()}</td>
                <td className="px-5 py-4 text-right">
                  {revokeConfirm === key.id ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-xs text-red-400 mr-1">Confirm?</span>
                      <button
                        onClick={() => {/* TODO: revoke key API call */ setRevokeConfirm(null);}}
                        className="text-xs px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                      >
                        Revoke
                      </button>
                      <button
                        onClick={() => setRevokeConfirm(null)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRevokeConfirm(key.id)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden opacity-60">
          <div className="px-5 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-gray-400">Revoked Keys</h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {revokedKeys.map((key, i) => (
                <tr key={key.id} className={`${i < revokedKeys.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <td className="px-5 py-3">
                    <span className="text-gray-500 line-through">{key.name}</span>
                  </td>
                  <td className="px-5 py-3">
                    <code className="text-xs font-mono text-gray-600 bg-white/5 px-2 py-1 rounded">
                      {key.prefix}••••••{key.suffix}
                    </code>
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-xs">Created {key.createdAt}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-500/10 text-gray-600 border border-gray-500/20">Revoked</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Code example */}
      <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <h3 className="text-sm font-semibold text-white">Quick Start</h3>
            <span className="text-xs text-gray-500 font-mono bg-white/5 px-1.5 py-0.5 rounded">JavaScript / Node.js</span>
          </div>
          <button
            onClick={handleCopyCode}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
              copiedCode
                ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            {copiedCode ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="p-5 text-sm font-mono overflow-x-auto text-gray-300 leading-relaxed">
          <code>{CODE_EXAMPLE}</code>
        </pre>
      </div>

      {/* Security notice */}
      <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 flex items-start gap-3">
        <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="text-sm">
          <p className="text-yellow-400 font-semibold mb-0.5">Keep your API keys secret</p>
          <p className="text-gray-400">
            Never expose API keys in client-side code or public repositories. Use environment variables.
            If you suspect a key has been compromised, revoke it immediately and create a new one.
          </p>
        </div>
      </div>

      {/* Create key modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111] border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Create API Key</h3>
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
                <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production App"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Environment</label>
                <div className="grid grid-cols-2 gap-2">
                  {['live', 'test'].map((env) => (
                    <button
                      key={env}
                      onClick={() => setNewKeyEnv(env)}
                      className={`py-2 rounded-lg text-sm font-medium transition-all border ${
                        newKeyEnv === env
                          ? env === 'live'
                            ? 'bg-green-500/15 border-green-500/30 text-green-400'
                            : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {env.charAt(0).toUpperCase() + env.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#1a1a1a] border border-white/10 text-xs text-gray-400">
                The full key will be shown <strong className="text-white">once</strong> immediately after creation. Make sure to copy it.
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
                onClick={handleCreateKey}
                className="flex-1 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                disabled={!newKeyName.trim()}
              >
                {/* TODO: call create API key endpoint */}
                Create Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';

const PROVIDERS: ReadonlyArray<{
  id: 'claude' | 'openai' | 'gemini';
  name: string;
  description: string;
  placeholder: string;
  color: 'orange' | 'green' | 'blue';
  logo: string;
  docsUrl: string;
}> = [
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    description: 'Powers AI website generation and content rewrites',
    placeholder: 'sk-ant-api03-...',
    color: 'orange',
    logo: '🟠',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT-4)',
    description: 'Alternative AI provider for all platform features',
    placeholder: 'sk-proj-...',
    color: 'green',
    logo: '🟢',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'gemini',
    name: 'Gemini (Google)',
    description: 'Google AI — another option for generation tasks',
    placeholder: 'AIzaSy...',
    color: 'blue',
    logo: '🔵',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
];

type ColorKey = 'orange' | 'green' | 'blue';
type ColorConfig = { border: string; bg: string; badge: string; btn: string; focus: string; dot: string };

interface Provider {
  id: 'claude' | 'openai' | 'gemini';
  name: string;
  description: string;
  placeholder: string;
  color: ColorKey;
  logo: string;
  docsUrl: string;
}

interface ConnectedKey {
  id: string;
  provider: string;
  keyHint: string;
  createdAt: string;
  updatedAt: string;
}

interface ORKey {
  id: string;
  keyHint: string;
  name: string;
  limitUsd: number | null;
  usedUsd: number;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const COLOR_MAP: Record<ColorKey, ColorConfig> = {
  orange: {
    border:    'border-orange-500/20',
    bg:        'bg-orange-500/5',
    badge:     'bg-orange-500/15 text-orange-400 border border-orange-500/25',
    btn:       'bg-orange-500 hover:bg-orange-400',
    focus:     'focus:border-orange-500',
    dot:       'bg-orange-400',
  },
  green: {
    border:    'border-green-500/20',
    bg:        'bg-green-500/5',
    badge:     'bg-green-500/15 text-green-400 border border-green-500/25',
    btn:       'bg-green-600 hover:bg-green-500',
    focus:     'focus:border-green-500',
    dot:       'bg-green-400',
  },
  blue: {
    border:    'border-blue-500/20',
    bg:        'bg-blue-500/5',
    badge:     'bg-blue-500/15 text-blue-400 border border-blue-500/25',
    btn:       'bg-blue-500 hover:bg-blue-400',
    focus:     'focus:border-blue-500',
    dot:       'bg-blue-400',
  },
};

interface ProviderCardProps {
  provider: Provider;
  connectedKey: ConnectedKey | null;
  onSave: (provider: Provider['id'], key: string) => Promise<void>;
  onDelete: (provider: Provider['id']) => Promise<void>;
}

function ProviderCard({ provider, connectedKey, onSave, onDelete }: ProviderCardProps) {
  const [inputValue, setInputValue]   = useState('');
  const [showInput, setShowInput]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const c = COLOR_MAP[provider.color];
  const isConnected = !!connectedKey;

  const handleSave = async () => {
    if (!inputValue.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(provider.id, inputValue.trim());
      setInputValue('');
      setShowInput(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onDelete(provider.id);
      setConfirmDelete(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`rounded-xl border bg-[#111] overflow-hidden ${isConnected ? c.border : 'border-white/10'}`}>
      {/* Header */}
      <div className={`px-5 py-4 flex items-center gap-4 ${isConnected ? c.bg : ''}`}>
        <div className="text-2xl flex-shrink-0">{provider.logo}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white text-sm">{provider.name}</h3>
            {isConnected && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>
                Connected ···{connectedKey.keyHint}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{provider.description}</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isConnected ? (
            <>
              <button
                onClick={() => { setShowInput(!showInput); setConfirmDelete(false); setError(null); }}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                Replace
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-red-400">Remove?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    {deleting ? '...' : 'Yes'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setConfirmDelete(true); setShowInput(false); }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10 transition-all"
                >
                  Remove
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => { setShowInput(!showInput); setError(null); }}
              className={`text-xs px-3 py-1.5 rounded-lg text-white font-medium transition-all ${c.btn}`}
            >
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Input panel */}
      {showInput && (
        <div className="px-5 pb-4 pt-3 border-t border-white/5">
          <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
            {isConnected ? 'New API Key' : 'API Key'}
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder={provider.placeholder}
              autoFocus
              className={`flex-1 px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm font-mono placeholder-gray-600 focus:outline-none ${c.focus} transition-colors`}
            />
            <button
              onClick={handleSave}
              disabled={saving || !inputValue.trim()}
              className={`px-4 py-2.5 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-40 ${c.btn}`}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { setShowInput(false); setInputValue(''); setError(null); }}
              className="px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          <p className="text-xs text-gray-600 mt-2">
            Key is encrypted with AES-256 before storage. We never log or expose it.{' '}
            <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              Get your key →
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)    return 'Just now';
  if (mins < 60)   return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}

function OpenRouterSection() {
  const [orKey, setOrKey]           = useState<ORKey | null | undefined>(undefined);
  const [syncing, setSyncing]       = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const fetchKey = useCallback(async () => {
    try {
      const res  = await fetch('/api/openrouter-keys');
      const data = await res.json() as { key?: ORKey | null };
      setOrKey(data.key ?? null);
    } catch {
      setOrKey(null);
    }
  }, []);

  useEffect(() => { void fetchKey(); }, [fetchKey]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res  = await fetch('/api/openrouter-keys/sync', { method: 'POST' });
      const data = await res.json() as { key?: ORKey; error?: string };
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setOrKey(data.key ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const handleProvision = async () => {
    setProvisioning(true);
    setError(null);
    try {
      const res  = await fetch('/api/openrouter-keys/provision', { method: 'POST' });
      const data = await res.json() as { key?: ORKey; error?: string };
      if (!res.ok) throw new Error(data.error || 'Provisioning failed');
      setOrKey(data.key ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProvisioning(false);
    }
  };

  const isLoading = orKey === undefined;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-white">OpenRouter AI</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Your dedicated AI sub-key — provisioned automatically on signup.
          </p>
        </div>
        {orKey?.isActive && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
          >
            {syncing ? 'Syncing…' : 'Sync usage'}
          </button>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#111] overflow-hidden">
        {isLoading ? (
          <div className="px-5 py-4 text-sm text-gray-500">Loading…</div>
        ) : orKey?.isActive ? (
          <div className="px-5 py-4 space-y-3">
            {/* Status row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-white">Active</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25 font-medium">
                  ···{orKey.keyHint}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                Synced: {formatTimeAgo(orKey.lastSyncAt)}
              </span>
            </div>

            {/* Usage row */}
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wider">Used</span>
                <p className="text-white font-mono font-semibold mt-0.5">
                  ${orKey.usedUsd.toFixed(4)}
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wider">Limit</span>
                <p className="text-white font-mono font-semibold mt-0.5">
                  {orKey.limitUsd != null ? `$${orKey.limitUsd.toFixed(2)}` : 'Unlimited'}
                </p>
              </div>
            </div>

            {/* Progress bar — only shown when a limit is set */}
            {orKey.limitUsd != null && orKey.limitUsd > 0 && (
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-500 transition-all"
                  style={{ width: `${Math.min((orKey.usedUsd / orKey.limitUsd) * 100, 100)}%` }}
                />
              </div>
            )}

            <p className="text-xs text-gray-600">
              All your AI calls on VelocitySites use this key. Usage is billed directly to the VelocitySites platform account.
            </p>
          </div>
        ) : (
          <div className="px-5 py-5 flex items-start gap-4">
            <span className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0 mt-1.5" />
            <div className="flex-1">
              <p className="text-sm text-white font-semibold">Not provisioned</p>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                Your AI key wasn&apos;t created at signup. Click below to activate it now.
              </p>
              <button
                onClick={handleProvision}
                disabled={provisioning}
                className="text-sm px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all disabled:opacity-40"
              >
                {provisioning ? 'Activating…' : 'Activate AI Key'}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-2">{error}</p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [connectedKeys, setConnectedKeys] = useState<Record<string, ConnectedKey>>({});
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [githubUsername, setGithubUsername]   = useState('');
  const [githubInput, setGithubInput]         = useState('');
  const [githubSaving, setGithubSaving]       = useState(false);
  const [githubError, setGithubError]         = useState<string | null>(null);
  const [githubSuccess, setGithubSuccess]     = useState(false);

  useEffect(() => {
    fetch('/api/ai-keys')
      .then((r) => r.json() as Promise<{ keys?: ConnectedKey[] }>)
      .then((data) => {
        const map: Record<string, ConnectedKey> = {};
        (data.keys || []).forEach((k) => { map[k.provider] = k; });
        setConnectedKeys(map);
      })
      .catch(() => setGlobalError('Failed to load AI keys'))
      .finally(() => setLoading(false));

    fetch('/api/profile')
      .then((r) => r.json() as Promise<{ githubUsername?: string | null }>)
      .then((d) => {
        const u = d.githubUsername ?? '';
        setGithubUsername(u);
        setGithubInput(u);
      })
      .catch(() => {});
  }, []);

  const handleSave = async (provider: Provider['id'], key: string) => {
    const res = await fetch('/api/ai-keys', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ provider, key }),
    });
    const data = (await res.json()) as { key?: ConnectedKey; error?: string };
    if (!res.ok || !data.key) throw new Error(data.error || 'Failed to save key');
    const saved = data.key;
    setConnectedKeys((prev) => ({ ...prev, [provider]: saved }));
  };

  const handleDelete = async (provider: Provider['id']) => {
    const res = await fetch(`/api/ai-keys?provider=${provider}`, { method: 'DELETE' });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error || 'Failed to remove key');
    setConnectedKeys((prev) => {
      const next = { ...prev };
      delete next[provider];
      return next;
    });
  };

  const handleGithubSave = async () => {
    setGithubSaving(true);
    setGithubError(null);
    setGithubSuccess(false);
    try {
      const res  = await fetch('/api/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ githubUsername: githubInput }),
      });
      const data = (await res.json()) as { githubUsername?: string | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      setGithubUsername(data.githubUsername ?? '');
      setGithubSuccess(true);
      setTimeout(() => setGithubSuccess(false), 3000);
    } catch (err) {
      setGithubError((err as Error).message);
    } finally {
      setGithubSaving(false);
    }
  };

  const connectedCount = Object.keys(connectedKeys).length;

  return (
    <div className="max-w-2xl space-y-6">
      {/* OpenRouter provisioned key */}
      <OpenRouterSection />

      <div className="border-t border-white/10 pt-6" />

      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white">BYOK — Bring Your Own Key</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Optionally connect your own AI provider keys. VelocitySites will use them instead of the shared platform key.
        </p>
      </div>

      {/* Status summary */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-[#111] border border-white/10">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${connectedCount > 0 ? 'bg-green-400' : 'bg-gray-600'}`} />
        <p className="text-sm text-gray-300">
          {loading
            ? 'Loading...'
            : connectedCount > 0
            ? `${connectedCount} provider${connectedCount > 1 ? 's' : ''} connected — AI features are active`
            : 'No providers connected — connect at least one to use AI features'}
        </p>
      </div>

      {globalError && (
        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-sm text-red-400">
          {globalError}
        </div>
      )}

      {/* Provider cards */}
      <div className="space-y-3">
        {PROVIDERS.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            connectedKey={connectedKeys[provider.id] || null}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Info box */}
      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm">
          <p className="text-blue-400 font-semibold mb-0.5">How BYOK works</p>
          <p className="text-gray-400">
            Your API key is encrypted with AES-256-GCM before being stored. It is only decrypted server-side at the moment an AI call is made on your behalf. TokenFlow never stores keys in plaintext or logs them.
          </p>
        </div>
      </div>

      {/* GitHub section */}
      <div className="border-t border-white/10 pt-6">
        <h2 className="text-lg font-bold text-white mb-1">GitHub Access</h2>
        <p className="text-sm text-gray-400 mb-4">
          Save your GitHub username so you can be invited as a collaborator to your site repos.
        </p>

        <div className="rounded-xl border border-white/10 bg-[#111] p-5 space-y-4">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-white/60 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">
                {githubUsername ? `Connected as @${githubUsername}` : 'Not connected'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Used when you click &quot;Invite to GitHub&quot; on a website
              </p>
            </div>
            {githubUsername && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 font-medium">
                Saved ✓
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
              GitHub Username
            </label>
            <div className="flex gap-2">
              <div className="flex items-center flex-1 rounded-lg bg-[#1a1a1a] border border-white/10 overflow-hidden focus-within:border-blue-500 transition-colors">
                <span className="px-3 text-gray-500 text-sm select-none">@</span>
                <input
                  type="text"
                  value={githubInput}
                  onChange={(e) => setGithubInput(e.target.value.trim())}
                  onKeyDown={(e) => e.key === 'Enter' && handleGithubSave()}
                  placeholder="yourusername"
                  className="flex-1 py-2.5 pr-3 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
                />
              </div>
              <button
                onClick={handleGithubSave}
                disabled={githubSaving || !githubInput.trim()}
                className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold transition-all disabled:opacity-40"
              >
                {githubSaving ? 'Saving…' : githubSuccess ? '✓ Saved' : 'Save'}
              </button>
            </div>
            {githubError && <p className="text-xs text-red-400 mt-2">{githubError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

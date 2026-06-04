'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Website } from '@/types/dashboard';

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'velocitysites.com.au';

type WebsiteStatus = 'ACTIVE' | 'DRAFT' | 'BUILDING' | 'PAUSED';

const STATUS_STYLES: Record<WebsiteStatus, string> = {
  ACTIVE:   'bg-green-500/15 text-green-400 border-green-500/25',
  DRAFT:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
  BUILDING: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  PAUSED:   'bg-red-500/15 text-red-400 border-red-500/25',
};

const STATUS_DOT: Record<WebsiteStatus, string> = {
  ACTIVE:   'bg-green-400',
  DRAFT:    'bg-blue-400',
  BUILDING: 'bg-yellow-400 animate-pulse',
  PAUSED:   'bg-red-400',
};

const STATUS_LABEL: Record<WebsiteStatus, string> = { ACTIVE: 'Live', DRAFT: 'Draft', BUILDING: 'Building', PAUSED: 'Paused' };

const PROVIDERS = [
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'GPT-4o (OpenAI)' },
  { value: 'gemini', label: 'Gemini (Google)' },
];

const TEMPLATES = [
  { id: '',             label: 'Blank',        tag: 'From scratch',  gradient: 'from-gray-800 to-gray-900' },
  { id: 'trades',       label: 'Trades',       tag: 'Construction',  gradient: 'from-orange-950 to-slate-900' },
  { id: 'restaurant',   label: 'Restaurant',   tag: 'Food & Dining', gradient: 'from-amber-950 to-red-950' },
  { id: 'wellness',     label: 'Wellness',     tag: 'Health & Life', gradient: 'from-emerald-950 to-teal-900' },
  { id: 'professional', label: 'Professional', tag: 'Corporate',     gradient: 'from-blue-950 to-indigo-950' },
  { id: 'portfolio',    label: 'Portfolio',    tag: 'Creative',      gradient: 'from-purple-950 to-pink-950' },
  { id: 'startup',      label: 'Startup',      tag: 'SaaS / Tech',   gradient: 'from-cyan-950 to-blue-950' },
];

interface CreateForm {
  name: string;
  subdomain: string;
  prompt: string;
  provider: string;
  templateId: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)   return 'just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}

export default function WebsitesPage() {
  const [websites, setWebsites]     = useState<Website[]>([]);
  const [balance, setBalance]       = useState<number | null>(null);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [creating, setCreating]       = useState(false);
  const [publishing, setPublishing]   = useState<string | null>(null);
  const [deleting, setDeleting]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateForm>({
    name:       '',
    subdomain:  '',
    prompt:     '',
    provider:   'claude',
    templateId: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sitesRes, tokensRes] = await Promise.all([
        fetch('/api/websites'),
        fetch('/api/tokens'),
      ]);
      const sitesData  = (await sitesRes.json()) as { websites?: Website[]; error?: string };
      const tokensData = (await tokensRes.json()) as { wallet?: { balance: number }; error?: string };
      if (!sitesRes.ok)  throw new Error(sitesData.error || 'Failed to load websites');
      if (!tokensRes.ok) throw new Error(tokensData.error || 'Failed to load balance');
      setWebsites(sitesData.websites || []);
      setBalance(tokensData.wallet?.balance ?? 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  async function handlePublish(siteId: string) {
    setPublishing(siteId);
    try {
      const res = await fetch(`/api/websites/${siteId}`, { method: 'PATCH' });
      if (res.ok) await loadData();
    } finally {
      setPublishing(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/websites/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        await loadData();
      }
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => { loadData(); }, [loadData]);

  function handleNameChange(value: string) {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    setForm(f => ({ ...f, name: value, subdomain: slug }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const res  = await fetch('/api/websites', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setCreateError(data.error || 'Failed to create website');
        return;
      }

      setShowModal(false);
      setForm({ name: '', subdomain: '', prompt: '', provider: 'claude', templateId: '' });
      await loadData();
    } catch {
      setCreateError('Something went wrong. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  const cost    = 50;
  const canAfford = balance !== null && balance >= cost;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-5xl space-y-4">
        <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl bg-[#111] border border-white/10 overflow-hidden">
              <div className="h-36 bg-white/5 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-5xl">
        <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <p className="font-semibold mb-1">Failed to load websites</p>
          <p className="text-sm opacity-80">{error}</p>
          <button onClick={loadData} className="mt-3 text-sm underline opacity-70 hover:opacity-100">
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (websites.length === 0) {
    return (
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Your Websites</h2>
            <p className="text-sm text-gray-400 mt-0.5">Each website costs {cost} tokens to create</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 rounded-xl bg-[#111] border border-white/10 border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Create your first website</h3>
          <p className="text-gray-400 text-sm text-center max-w-sm mb-2">
            Describe your website and AI will build it for you — live on your own subdomain.
          </p>
          <p className="text-amber-400 font-semibold text-sm mb-6">{cost} tokens per website</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Website
          </button>
        </div>
        {showModal && <CreateModal {...{ form, setForm, handleNameChange, handleCreate, creating, createError, balance, cost, canAfford, onClose: () => { setShowModal(false); setCreateError(null); } }} />}
      </div>
    );
  }

  // ── Websites list ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Your Websites</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {websites.length} website{websites.length !== 1 ? 's' : ''} · {cost} tokens each
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Website
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {websites.map((site) => (
          <div
            key={site.id}
            className="group rounded-xl bg-[#111] border border-white/10 hover:border-white/20 transition-all duration-200 overflow-hidden"
          >
            {/* Thumbnail */}
            <div className="h-36 border-b border-white/10 relative overflow-hidden bg-[#111]">
              {site.status !== 'BUILDING' ? (
                <iframe
                  src={`/api/websites/${site.id}/html`}
                  loading="lazy"
                  scrolling="no"
                  title={site.name}
                  style={{
                    width: '1024px',
                    height: '768px',
                    transform: 'scale(0.29)',
                    transformOrigin: 'top left',
                    pointerEvents: 'none',
                    border: 'none',
                    display: 'block',
                  }}
                />
              ) : (
                <>
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 50%, #0ea5e9 0%, transparent 50%), radial-gradient(circle at 80% 20%, #8b5cf6 0%, transparent 50%)',
                  }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                    </svg>
                  </div>
                </>
              )}
              <div className="absolute top-3 right-3 z-10">
                <span className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border ${STATUS_STYLES[site.status]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[site.status]}`} />
                  {STATUS_LABEL[site.status]}
                </span>
              </div>
              <button
                onClick={() => setDeleteTarget({ id: site.id, name: site.name })}
                className="absolute top-3 left-3 z-10 w-7 h-7 rounded-lg bg-black/50 hover:bg-red-500/80 flex items-center justify-center text-white/40 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                title="Delete website"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-white">{site.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{site.prompt}</p>
                </div>
                <span className="text-xs text-amber-400 font-semibold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 shrink-0 ml-2">
                  {site.tokenCost}t
                </span>
              </div>

              <div className="space-y-1 mb-3">
                <a
                  href={`https://${site.subdomain}.${PLATFORM_DOMAIN}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span className="truncate">{site.subdomain}.{PLATFORM_DOMAIN}</span>
                </a>
                {site.domain?.domain && (
                  <p className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    </svg>
                    <span className="truncate">{site.domain.domain}</span>
                    {site.domain.verified && <span className="text-green-400">✓</span>}
                  </p>
                )}
                {site.githubRepoUrl && (
                  <a
                    href={site.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    <span className="truncate">{site.githubRepo}</span>
                  </a>
                )}
                {site.vercelProjectId && (
                  site.vercelUrl
                    ? (
                      <a
                        href={site.vercelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L2 19.5h20L12 2z" />
                        </svg>
                        <span className="truncate">Vercel deployment</span>
                      </a>
                    ) : (
                      <p className="flex items-center gap-1.5 text-xs text-yellow-500/70">
                        <svg className="w-3 h-3 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Deploying to Vercel…
                      </p>
                    )
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-3 pb-3 border-b border-white/5">
                <span>Created {new Date(site.createdAt).toLocaleDateString()}</span>
                <span>Updated {timeAgo(site.updatedAt ?? site.createdAt)}</span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://${site.subdomain}.${PLATFORM_DOMAIN}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 font-medium text-center transition-colors"
                >
                  Preview
                </a>
                <Link
                  href={`/dashboard/websites/${site.id}`}
                  className="flex-1 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-xs text-blue-400 font-medium transition-colors text-center"
                >
                  Edit
                </Link>
                {site.status === 'DRAFT' && (
                  <button
                    onClick={() => handlePublish(site.id)}
                    disabled={publishing === site.id}
                    className="flex-1 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-xs text-green-400 font-semibold transition-colors disabled:opacity-50"
                  >
                    {publishing === site.id ? 'Publishing…' : 'Publish'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Add new card */}
        <button
          onClick={() => setShowModal(true)}
          className="rounded-xl border border-dashed border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-200 flex flex-col items-center justify-center gap-3 min-h-[280px] text-gray-500 hover:text-blue-400"
        >
          <div className="w-12 h-12 rounded-xl border-2 border-dashed border-current flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">New Website</p>
            <p className="text-xs text-amber-400/70 mt-0.5">{cost} tokens</p>
          </div>
        </button>
      </div>

      {showModal && (
        <CreateModal
          {...{ form, setForm, handleNameChange, handleCreate, creating, createError, balance, cost, canAfford,
                onClose: () => { setShowModal(false); setCreateError(null); } }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          siteName={deleteTarget.name}
          deleting={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Create Website Modal ─────────────────────────────────────────────────────

interface CreateModalProps {
  form: CreateForm;
  setForm: React.Dispatch<React.SetStateAction<CreateForm>>;
  handleNameChange: (value: string) => void;
  handleCreate: (e: React.FormEvent) => void;
  creating: boolean;
  createError: string | null;
  balance: number | null;
  cost: number;
  canAfford: boolean;
  onClose: () => void;
}

const TEMPLATE_PREVIEW_URLS: Record<string, string> = {
  trades:       'https://webmint-trades.vercel.app',
  restaurant:   'https://webmint-restaurant.vercel.app',
  wellness:     'https://webmint-wellness.vercel.app',
  professional: 'https://webmint-professional.vercel.app',
  portfolio:    'https://webmint-portfolio.vercel.app',
  startup:      'https://webmint-startup.vercel.app',
};

function CreateModal({ form, setForm, handleNameChange, handleCreate, creating, createError, balance, cost, canAfford, onClose }: CreateModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#111] border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white">Create New Website</h3>
            <p className="text-xs text-gray-500 mt-0.5">AI will generate your site from your description</p>
          </div>
          <button
            onClick={onClose}
            disabled={creating}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          {/* Template picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs text-gray-400 font-medium uppercase tracking-wider">
                Choose a Template
              </label>
              {form.templateId && (
                <a
                  href={TEMPLATE_PREVIEW_URLS[form.templateId]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Preview template ↗
                </a>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  disabled={creating}
                  onClick={() => setForm(f => ({ ...f, templateId: t.id }))}
                  className={`relative rounded-lg overflow-hidden h-16 flex flex-col items-center justify-center gap-0.5 border transition-all text-center px-1
                    ${form.templateId === t.id
                      ? 'border-blue-500 ring-1 ring-blue-500'
                      : 'border-white/10 hover:border-white/25'
                    }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${t.gradient} opacity-80`} />
                  <span className="relative text-xs font-semibold text-white leading-tight">{t.label}</span>
                  <span className="relative text-[10px] text-white/50 leading-tight">{t.tag}</span>
                  {form.templateId === t.id && (
                    <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
              Site Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="My Awesome Business"
              required
              disabled={creating}
              className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Subdomain */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
              Subdomain
            </label>
            <div className="flex items-center rounded-lg bg-[#1a1a1a] border border-white/10 overflow-hidden focus-within:border-blue-500">
              <input
                type="text"
                value={form.subdomain}
                onChange={e => setForm(f => ({ ...f, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                placeholder="my-site"
                required
                disabled={creating}
                className="flex-1 px-3 py-2.5 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none disabled:opacity-50"
              />
              <span className="px-3 py-2.5 text-sm text-gray-500 bg-white/5 border-l border-white/10 shrink-0">
                .{process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'velocitysites.com.au'}
              </span>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
              Describe Your Website
            </label>
            <textarea
              value={form.prompt}
              onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
              placeholder="A modern landing page for a personal fitness coaching business. Include a hero section with a strong headline, services offered, testimonials, and a contact form."
              required
              disabled={creating}
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none disabled:opacity-50"
            />
          </div>

          {/* AI Provider */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
              AI Provider
            </label>
            <select
              value={form.provider}
              onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
              disabled={creating}
              className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
            >
              {PROVIDERS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-600 mt-1">Uses your BYOK key if set, otherwise the platform key.</p>
          </div>

          {/* Token cost summary */}
          <div className="p-3 rounded-lg bg-[#1a1a1a] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Cost</span>
              <span className="text-amber-400 font-bold">−{cost} tokens</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Your balance</span>
              <span className="text-white font-semibold">{balance?.toLocaleString() ?? '—'} tokens</span>
            </div>
            {balance !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">After creation</span>
                <span className={`font-semibold ${canAfford ? 'text-white' : 'text-red-400'}`}>
                  {(balance - cost).toLocaleString()} tokens
                </span>
              </div>
            )}
          </div>

          {!canAfford && (
            <p className="text-xs text-red-400 text-center">
              Not enough tokens. <a href="/dashboard/tokens" className="underline">Top up here.</a>
            </p>
          )}

          {createError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {createError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-sm transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canAfford || creating || !form.name || !form.subdomain || !form.prompt}
              className="flex-1 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Generating...
                </>
              ) : (
                'Generate Website'
              )}
            </button>
          </div>
        </form>

        {creating && (
          <p className="text-xs text-gray-500 text-center mt-3">
            AI is building your site — this takes 15–30 seconds
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  siteName: string;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function DeleteConfirmModal({ siteName, deleting, onConfirm, onClose }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#111] border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Delete this website?</h3>
            <p className="text-xs text-gray-500 mt-0.5">This cannot be undone</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15 mb-4">
          <p className="text-sm text-white font-semibold mb-1 truncate">{siteName}</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            The website record will be permanently deleted from your dashboard and the subdomain will go offline. Your GitHub repo and Vercel project will remain but will no longer be managed here.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-sm transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deleting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Deleting…
              </>
            ) : (
              'Delete Website'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

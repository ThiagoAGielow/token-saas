'use client';

import { useState, useEffect } from 'react';
import type { Website, CustomDomain, Availability } from '@/types/dashboard';

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'velocitysites.com.au';
const SUBDOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

type AvailabilityState = null | 'checking' | Availability;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface VerifyResult {
  verified: boolean
  message?: string
  alreadyVerified?: boolean
}

export default function DomainsPage() {
  const [sites, setSites]               = useState<Website[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [subdomain, setSubdomain]       = useState('');
  const [siteName, setSiteName]         = useState('');
  const [availability, setAvailability] = useState<AvailabilityState>(null);
  const [claiming, setClaiming]         = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const debouncedSubdomain = useDebounce(subdomain, 400);

  // Load claimed subdomains
  useEffect(() => {
    fetch('/api/websites')
      .then((r) => r.json() as Promise<{ websites?: Website[] }>)
      .then((d) => setSites(d.websites || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Check availability as user types
  useEffect(() => {
    const name = debouncedSubdomain.toLowerCase().trim();
    if (!name) { setAvailability(null); return; }
    if (!SUBDOMAIN_RE.test(name)) {
      setAvailability({ available: false, reason: 'Only letters, numbers, and hyphens' });
      return;
    }
    setAvailability('checking');
    fetch(`/api/subdomains?name=${encodeURIComponent(name)}`)
      .then((r) => r.json() as Promise<Availability>)
      .then((d) => setAvailability(d))
      .catch(() => setAvailability(null));
  }, [debouncedSubdomain]);

  const handleClaim = async () => {
    setError(null);
    setClaiming(true);
    try {
      const res = await fetch('/api/subdomains', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subdomain: subdomain.toLowerCase().trim(), siteName }),
      });
      const data = (await res.json()) as { website?: Website; error?: string };
      if (!res.ok || !data.website) throw new Error(data.error || 'Failed to claim subdomain');
      const created = data.website;
      setSites((prev) => [created, ...prev]);
      setShowForm(false);
      setSubdomain('');
      setSiteName('');
      setAvailability(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClaiming(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/subdomains?id=${id}`, { method: 'DELETE' });
      setSites((prev) => prev.filter((s) => s.id !== id));
      setDeleteConfirm(null);
    } catch {
      setError('Failed to remove site');
    }
  };

  // ── Custom domain state ────────────────────────────────────────────────────
  const [customDomains, setCustomDomains]     = useState<CustomDomain[]>([]);
  const [cdLoading, setCdLoading]             = useState(true);
  const [showCdForm, setShowCdForm]           = useState(false);
  const [cdInput, setCdInput]                 = useState('');
  const [cdAdding, setCdAdding]               = useState(false);
  const [cdError, setCdError]                 = useState<string | null>(null);
  const [verifying, setVerifying]             = useState<string | null>(null);
  const [verifyResult, setVerifyResult]       = useState<Record<string, VerifyResult>>({});
  const [cdDeleteConfirm, setCdDeleteConfirm] = useState<string | null>(null);
  const [copiedToken, setCopiedToken]         = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/domains')
      .then((r) => r.json() as Promise<{ domains?: CustomDomain[] }>)
      .then((d) => setCustomDomains(d.domains || []))
      .catch(() => {})
      .finally(() => setCdLoading(false));
  }, []);

  const handleAddDomain = async () => {
    setCdError(null);
    setCdAdding(true);
    try {
      const res = await fetch('/api/domains', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ domain: cdInput }),
      });
      const data = (await res.json()) as { domain?: CustomDomain; error?: string };
      if (!res.ok || !data.domain) throw new Error(data.error || 'Failed to add domain');
      const created = data.domain;
      setCustomDomains((prev) => [created, ...prev]);
      setShowCdForm(false);
      setCdInput('');
    } catch (err) {
      setCdError((err as Error).message);
    } finally {
      setCdAdding(false);
    }
  };

  const handleVerify = async (id: string) => {
    setVerifying(id);
    try {
      const res = await fetch('/api/domains/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id }),
      });
      const data = (await res.json()) as VerifyResult;
      setVerifyResult((prev) => ({ ...prev, [id]: data }));
      if (data.verified) {
        setCustomDomains((prev) =>
          prev.map((d) => d.id === id ? { ...d, verified: true } : d)
        );
      }
    } catch {
      setVerifyResult((prev) => ({ ...prev, [id]: { verified: false, message: 'Check failed' } }));
    } finally {
      setVerifying(null);
    }
  };

  const handleDeleteDomain = async (id: string) => {
    try {
      await fetch(`/api/domains?id=${id}`, { method: 'DELETE' });
      setCustomDomains((prev) => prev.filter((d) => d.id !== id));
      setCdDeleteConfirm(null);
    } catch {
      setCdError('Failed to remove domain');
    }
  };

  const copyToken = (token: string, id: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const PLATFORM_CNAME = `cname.vercel-dns.com`;

  const availabilityObj: Availability | null =
    availability && typeof availability === 'object' ? availability : null;
  const isValid = subdomain.trim().length > 0 &&
    SUBDOMAIN_RE.test(subdomain.trim()) &&
    availabilityObj?.available === true;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Your Sites</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading ? '...' : `${sites.length} site${sites.length !== 1 ? 's' : ''}`} · subdomains on {PLATFORM_DOMAIN}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Claim Subdomain
        </button>
      </div>

      {/* Claim form */}
      {showForm && (
        <div className="p-5 rounded-xl bg-[#111] border border-blue-500/20 space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">Claim a Subdomain</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
              {20} tokens
            </span>
          </div>

          {/* Subdomain input */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
              Subdomain
            </label>
            <div className="flex items-center rounded-lg bg-[#1a1a1a] border border-white/10 overflow-hidden focus-within:border-blue-500 transition-colors">
              <input
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="myshop"
                className="flex-1 px-3 py-2.5 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
              />
              <span className="px-3 py-2.5 text-gray-500 text-sm border-l border-white/10 whitespace-nowrap">
                .{PLATFORM_DOMAIN}
              </span>
            </div>

            {/* Availability indicator */}
            {subdomain && (
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                {availability === 'checking' && (
                  <span className="text-gray-500">Checking availability...</span>
                )}
                {availabilityObj?.available === true && (
                  <>
                    <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-400 font-medium">{subdomain}.{PLATFORM_DOMAIN} is available</span>
                  </>
                )}
                {availabilityObj?.available === false && (
                  <>
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-red-400">{availabilityObj.reason || 'Already taken'}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Site name */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
              Site Name <span className="text-gray-600 normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder={subdomain || 'My Website'}
              className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setShowForm(false); setSubdomain(''); setSiteName(''); setError(null); setAvailability(null); }}
              className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleClaim}
              disabled={!isValid || claiming}
              className="flex-1 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-colors disabled:opacity-40"
            >
              {claiming ? 'Claiming...' : `Claim ${subdomain || 'Subdomain'} (−20 tokens)`}
            </button>
          </div>
        </div>
      )}

      {/* Sites list */}
      <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 text-sm">Loading...</div>
        ) : sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-3xl mb-4">🌐</div>
            <h3 className="text-lg font-bold text-white mb-1">No sites yet</h3>
            <p className="text-gray-400 text-sm text-center max-w-xs mb-1">
              Claim a subdomain to get your site live in seconds.
            </p>
            <p className="text-amber-400 font-semibold text-sm">20 tokens per site</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Site</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">URL</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Status</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site, i) => (
                <tr key={site.id} className={`${i < sites.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/2 transition-colors`}>
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{site.name}</p>
                    <p className="text-xs text-gray-500">{site.subdomain}</p>
                  </td>
                  <td className="px-5 py-4">
                    <a
                      href={`https://${site.subdomain}.${PLATFORM_DOMAIN}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-xs font-mono transition-colors"
                    >
                      {site.subdomain}.{PLATFORM_DOMAIN} ↗
                    </a>
                  </td>
                  <td className="px-5 py-4">
                    {site.status === 'ACTIVE' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border bg-green-500/15 text-green-400 border-green-500/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        Live
                      </span>
                    )}
                    {site.status === 'DRAFT' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        Draft
                      </span>
                    )}
                    {(site.status === 'BUILDING' || site.status === 'PAUSED') && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border bg-yellow-500/15 text-yellow-400 border-yellow-500/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                        {site.status === 'PAUSED' ? 'Paused' : 'Building'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {deleteConfirm === site.id ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs text-red-400">Remove?</span>
                        <button
                          onClick={() => handleDelete(site.id)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(site.id)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Custom Domains ─────────────────────────────────────────────── */}
      <div className="border-t border-white/10 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Custom Domains</h2>
            <p className="text-sm text-gray-400 mt-0.5">Connect your own domain (e.g. myshop.com)</p>
          </div>
          <button
            onClick={() => { setShowCdForm(!showCdForm); setCdError(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors border border-white/10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Domain
          </button>
        </div>

        {/* Add domain form */}
        {showCdForm && (
          <div className="p-5 rounded-xl bg-[#111] border border-white/20 space-y-4 mb-4">
            <h3 className="font-semibold text-white text-sm">Add a custom domain</h3>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Domain</label>
              <input
                type="text"
                value={cdInput}
                onChange={(e) => setCdInput(e.target.value)}
                placeholder="myshop.com"
                className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1.5">Enter your root domain without www (e.g. myshop.com)</p>
            </div>
            {cdError && <p className="text-sm text-red-400">{cdError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowCdForm(false); setCdInput(''); setCdError(null); }}
                className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors"
              >Cancel</button>
              <button
                onClick={handleAddDomain}
                disabled={!cdInput.trim() || cdAdding}
                className="flex-1 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-colors disabled:opacity-40"
              >{cdAdding ? 'Adding...' : 'Add Domain'}</button>
            </div>
          </div>
        )}

        {/* Custom domains list */}
        {cdLoading ? (
          <div className="text-sm text-gray-500 py-4">Loading...</div>
        ) : customDomains.length === 0 ? (
          <div className="p-6 rounded-xl bg-[#111] border border-white/10 text-center">
            <p className="text-gray-500 text-sm">No custom domains yet.</p>
            <p className="text-gray-600 text-xs mt-1">Add your own domain to use it instead of a subdomain.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {customDomains.map((d) => (
              <div key={d.id} className={`p-4 rounded-xl border ${d.verified ? 'bg-green-500/5 border-green-500/20' : 'bg-[#111] border-white/10'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-white text-sm">{d.domain}</p>
                      {d.verified ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-semibold">Verified ✓</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 font-semibold">Pending</span>
                      )}
                    </div>

                    {/* Verification instructions */}
                    {!d.verified && (
                      <div className="mt-3 space-y-3">
                        <div className="p-3 rounded-lg bg-[#1a1a1a] border border-white/10">
                          <p className="text-xs font-semibold text-gray-300 mb-2">Step 1 — Add this TXT record to your DNS:</p>
                          <div className="space-y-1.5 font-mono text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-16 flex-shrink-0">Name</span>
                              <span className="text-blue-300">_velocitysites-verify.{d.domain}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-16 flex-shrink-0">Type</span>
                              <span className="text-gray-300">TXT</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-16 flex-shrink-0">Value</span>
                              <span className="text-amber-300 break-all">{d.verificationToken}</span>
                              <button
                                onClick={() => copyToken(d.verificationToken, d.id)}
                                className="ml-auto flex-shrink-0 text-xs px-2 py-0.5 rounded bg-white/10 hover:bg-white/15 text-gray-300 transition-colors"
                              >{copiedToken === d.id ? '✓' : 'Copy'}</button>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-[#1a1a1a] border border-white/10">
                          <p className="text-xs font-semibold text-gray-300 mb-2">Step 2 — Point your domain to us:</p>
                          <div className="space-y-1.5 font-mono text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-16 flex-shrink-0">Name</span>
                              <span className="text-blue-300">www</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-16 flex-shrink-0">Type</span>
                              <span className="text-gray-300">CNAME</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-16 flex-shrink-0">Value</span>
                              <span className="text-amber-300">{PLATFORM_CNAME}</span>
                            </div>
                          </div>
                        </div>

                        {verifyResult[d.id] && !verifyResult[d.id]!.verified && (
                          <p className="text-xs text-yellow-400">{verifyResult[d.id]!.message}</p>
                        )}

                        <button
                          onClick={() => handleVerify(d.id)}
                          disabled={verifying === d.id}
                          className="w-full py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                          {verifying === d.id ? 'Checking DNS...' : 'Verify Domain'}
                        </button>
                      </div>
                    )}

                    {/* Verified — show live domain */}
                    {d.verified && (
                      <a
                        href={`https://www.${d.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-400 hover:text-green-300 font-mono transition-colors"
                      >
                        www.{d.domain} ↗
                      </a>
                    )}
                  </div>

                  {/* Delete */}
                  <div className="flex-shrink-0">
                    {cdDeleteConfirm === d.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-red-400">Remove?</span>
                        <button onClick={() => handleDeleteDomain(d.id)} className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30">Yes</button>
                        <button onClick={() => setCdDeleteConfirm(null)} className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400 border border-white/10">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCdDeleteConfirm(d.id)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                      >Remove</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

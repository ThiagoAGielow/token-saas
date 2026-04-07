'use client';

import { useState, useEffect, useCallback } from 'react';

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'velocitysites.com.au';
const SUBDOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function DomainsPage() {
  const [sites, setSites]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [subdomain, setSubdomain]       = useState('');
  const [siteName, setSiteName]         = useState('');
  const [availability, setAvailability] = useState(null); // null | 'checking' | { available, reason }
  const [claiming, setClaiming]         = useState(false);
  const [error, setError]               = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const debouncedSubdomain = useDebounce(subdomain, 400);

  // Load claimed subdomains
  useEffect(() => {
    fetch('/api/websites')
      .then((r) => r.json())
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
      .then((r) => r.json())
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim subdomain');
      setSites((prev) => [data.website, ...prev]);
      setShowForm(false);
      setSubdomain('');
      setSiteName('');
      setAvailability(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/subdomains?id=${id}`, { method: 'DELETE' });
      setSites((prev) => prev.filter((s) => s.id !== id));
      setDeleteConfirm(null);
    } catch {
      setError('Failed to remove site');
    }
  };

  const isValid = subdomain.trim().length > 0 &&
    SUBDOMAIN_RE.test(subdomain.trim()) &&
    availability?.available === true;

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
                {availability?.available === true && (
                  <>
                    <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-400 font-medium">{subdomain}.{PLATFORM_DOMAIN} is available</span>
                  </>
                )}
                {availability?.available === false && (
                  <>
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-red-400">{availability.reason || 'Already taken'}</span>
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
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      site.status === 'ACTIVE'
                        ? 'bg-green-500/15 text-green-400 border-green-500/25'
                        : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${site.status === 'ACTIVE' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                      {site.status === 'ACTIVE' ? 'Live' : 'Building'}
                    </span>
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

      {/* Info box */}
      <div className="p-4 rounded-xl bg-[#111] border border-white/10 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm text-gray-400">
          <p className="font-medium text-white mb-0.5">Your subdomain goes live instantly</p>
          No DNS setup needed. Once claimed, <span className="text-gray-300">yourname.{PLATFORM_DOMAIN}</span> is active immediately.
          Custom domains (bring your own) coming soon.
        </div>
      </div>
    </div>
  );
}

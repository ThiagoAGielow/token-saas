'use client';

import { useState, useEffect, useCallback } from 'react';

type Domain = { id: string; domain: string; verified: boolean };
type Wallet = { balance: number } | null;
type EmailAccount = {
  id: string;
  address: string;
  createdAt: string;
  domain?: { domain: string } | null;
};

const ZOHO_DNS_RECORDS = [
  { type: 'MX',  host: '@', value: 'mx.zoho.com',                  priority: '10', ttl: '1h' },
  { type: 'MX',  host: '@', value: 'mx2.zoho.com',                 priority: '20', ttl: '1h' },
  { type: 'MX',  host: '@', value: 'mx3.zoho.com',                 priority: '50', ttl: '1h' },
  { type: 'TXT', host: '@', value: 'v=spf1 include:zoho.com ~all', priority: '—',  ttl: '1h' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`text-xs px-2 py-0.5 rounded font-medium transition-all ${copied ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
    >
      {copied ? '✓' : 'Copy'}
    </button>
  );
}

// ─── Create Wizard ────────────────────────────────────────────────────────────

type CreateWizardProps = {
  domains: Domain[];
  wallet: Wallet;
  onClose: () => void;
  onCreated: (email: EmailAccount) => void;
};

function CreateWizard({ domains, wallet, onClose, onCreated }: CreateWizardProps) {
  const [step, setStep]           = useState(1);
  const [domainId, setDomainId]   = useState(domains[0]?.id ?? '');
  const [username, setUsername]   = useState('');
  const [displayName, setDisplay] = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [mxChecking, setMxCheck]  = useState(false);
  const [mxOk, setMxOk]          = useState(false);

  const selectedDomain = domains.find((d) => d.id === domainId);
  const address = username ? `${username}@${selectedDomain?.domain ?? ''}` : '';
  const canAfford = (wallet?.balance ?? 0) >= 10;

  async function checkMx() {
    if (!selectedDomain) return;
    setMxCheck(true);
    try {
      const res = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(selectedDomain.domain)}&type=MX`,
        { headers: { Accept: 'application/dns-json' } }
      );
      const data = await res.json() as { Answer?: Array<{ data?: string }> };
      const records = (data.Answer ?? []).map((r) => r.data?.toLowerCase() ?? '');
      setMxOk(records.some((r) => r.includes('zoho.com')));
    } catch {
      setMxOk(false);
    } finally {
      setMxCheck(false);
    }
  }

  async function handleCreate() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/emails', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId, username, displayName, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create mailbox');
      onCreated(data.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#111] border border-white/10 shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 w-full bg-white/5">
          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-white">
                {step === 1 && 'New Mailbox'}
                {step === 2 && 'Add DNS Records'}
                {step === 3 && 'Creating Mailbox…'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Step {step} of 3</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Step 1: Details ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Domain</label>
                <select value={domainId} onChange={(e) => setDomainId(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500">
                  {domains.map((d) => <option key={d.id} value={d.id}>{d.domain}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Email Address</label>
                <div className="flex items-center rounded-lg bg-[#1a1a1a] border border-white/10 overflow-hidden focus-within:border-blue-500 transition-colors">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    placeholder="hello"
                    className="flex-1 px-3 py-2.5 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
                  />
                  <span className="px-3 py-2.5 text-sm text-gray-500 bg-white/5 border-l border-white/10 whitespace-nowrap">
                    @{selectedDomain?.domain ?? ''}
                  </span>
                </div>
                {username && <p className="text-xs text-gray-500 mt-1.5">Full address: <span className="text-white font-mono">{address}</span></p>}
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Display Name</label>
                <input type="text" value={displayName} onChange={(e) => setDisplay(e.target.value)} placeholder="e.g. Customer Support"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500" />
              </div>

              <div className="p-3 rounded-lg bg-[#1a1a1a] border border-white/10 text-xs text-gray-400 space-y-1.5">
                {[['Storage','500 MB'],['IMAP / SMTP','Included'],['Webmail','mail.zoho.com'],['Token cost','10 tokens']].map(([k,v]) => (
                  <div key={k} className="flex justify-between"><span>{k}</span><span className="text-white">{v}</span></div>
                ))}
              </div>

              {!canAfford && <p className="text-xs text-red-400 text-center">Insufficient token balance</p>}

              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors">Cancel</button>
                <button onClick={() => setStep(2)} disabled={!username || !displayName || password.length < 8 || !canAfford}
                  className="flex-1 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Next: DNS Setup →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: DNS Records ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/20">
                <p className="text-sm font-semibold text-amber-400 mb-1">Add these DNS records first</p>
                <p className="text-xs text-gray-400">
                  Add the records below to <span className="text-white font-mono">{selectedDomain?.domain}</span> in your DNS provider before continuing.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      {['Type','Host','Value','Priority',''].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-gray-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ZOHO_DNS_RECORDS.map((r, i) => (
                      <tr key={i} className={i < ZOHO_DNS_RECORDS.length - 1 ? 'border-b border-white/5' : ''}>
                        <td className="px-3 py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${r.type === 'MX' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>{r.type}</span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-gray-300">{r.host}</td>
                        <td className="px-3 py-2.5 font-mono text-white break-all">{r.value}</td>
                        <td className="px-3 py-2.5 text-gray-400">{r.priority}</td>
                        <td className="px-3 py-2.5"><CopyButton text={r.value} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] border border-white/10">
                <div>
                  <p className="text-sm text-white font-medium">Verify MX records</p>
                  <p className="text-xs text-gray-500 mt-0.5">{mxOk ? 'Zoho MX records detected!' : 'Check if records are live (optional)'}</p>
                </div>
                {mxOk ? (
                  <span className="flex items-center gap-1.5 text-xs text-green-400 font-semibold">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Verified
                  </span>
                ) : (
                  <button onClick={checkMx} disabled={mxChecking} className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/15 transition-colors disabled:opacity-50">
                    {mxChecking ? 'Checking…' : 'Check now'}
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-500 text-center">DNS can take up to 24h to propagate. You can continue without verifying.</p>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors">← Back</button>
                <button onClick={() => { setStep(3); handleCreate(); }} className="flex-1 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-colors">
                  Create Mailbox — 10 tokens
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Creating / Error ── */}
          {step === 3 && (
            <div className="py-4 space-y-4">
              {loading && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                  <p className="text-sm text-gray-400">Setting up your mailbox…</p>
                </div>
              )}
              {error && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-sm text-red-400">
                    <p className="font-semibold mb-1">Something went wrong</p>
                    <p>{error}</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { setStep(2); setError(null); }} className="flex-1 py-2.5 rounded-lg bg-white/5 text-gray-300 text-sm font-medium transition-colors">← Back</button>
                    <button onClick={() => { setError(null); setLoading(true); handleCreate(); }} className="flex-1 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-semibold transition-colors">Retry</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmailsPage() {
  const [emails, setEmails]         = useState<EmailAccount[]>([]);
  const [domains, setDomains]       = useState<Domain[]>([]);
  const [wallet, setWallet]         = useState<Wallet>(null);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [emailsRes, domainsRes, tokensRes] = await Promise.all([
        fetch('/api/emails'),
        fetch('/api/domains'),
        fetch('/api/tokens'),
      ]);
      const [emailsData, domainsData, tokensData] = await Promise.all([
        emailsRes.json(),
        domainsRes.json(),
        tokensRes.json(),
      ]);
      setEmails(emailsData.emails ?? []);
      setDomains((domainsData.domains ?? []).filter((d: Domain) => d.verified));
      setWallet(tokensData.wallet ?? null);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this mailbox? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/emails?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setEmails((prev) => prev.filter((e) => e.id !== id));
    } catch {
      alert('Failed to delete mailbox. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  const verifiedDomains = domains.filter((d) => d.verified);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Email Accounts</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {emails.length} mailbox{emails.length !== 1 ? 'es' : ''} · 10 tokens each · Powered by Zoho Mail
          </p>
        </div>
        <button
          onClick={() => {
            if (verifiedDomains.length === 0) {
              alert('You need at least one verified domain first. Go to the Domains page.');
              return;
            }
            setShowCreate(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-colors"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Mailbox
        </button>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-sm text-red-400">{error}</div>}

      {/* No verified domains warning */}
      {verifiedDomains.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/20 flex items-start gap-3">
          <svg width="20" height="20" className="text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-400">No verified domains</p>
            <p className="text-xs text-gray-400 mt-0.5">
              You need a verified custom domain to create email accounts.{' '}
              <a href="/dashboard/domains" className="text-blue-400 hover:underline">Verify a domain →</a>
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      {emails.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            ['Mailboxes', emails.length],
            ['Domains',   new Set(emails.map((e: EmailAccount) => e.domain?.domain)).size],
            ['Tokens spent', emails.length * 10],
          ].map(([label, val]) => (
            <div key={label} className="p-4 rounded-xl bg-[#111] border border-white/10">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">{label}</p>
              <p className="text-2xl font-black text-white">{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Email list */}
      {emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl bg-[#111] border border-white/10">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
            <svg width="24" height="24" className="text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-white font-semibold mb-1">No mailboxes yet</p>
          <p className="text-sm text-gray-500 mb-5">Create a professional email on your domain for 10 tokens</p>
          {verifiedDomains.length > 0 && (
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-colors">
              Create first mailbox
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Mailbox','Domain','Created',''].map((h) => (
                  <th key={h} className={`px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium ${h === '' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {emails.map((email, i) => (
                <tr key={email.id} className={`${i < emails.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/2 transition-colors`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500/30 to-blue-500/30 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 border border-white/10">
                        {email.address.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white font-mono text-sm">{email.address}</p>
                        <a href="https://mail.zoho.com" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">Open Webmail →</a>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-400 font-mono text-xs">{email.domain?.domain ?? '—'}</td>
                  <td className="px-5 py-4 text-gray-400 text-xs">
                    {new Date(email.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => handleDelete(email.id)} disabled={deletingId === email.id}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all disabled:opacity-50">
                      {deletingId === email.id ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Zoho info */}
      <div className="p-4 rounded-xl bg-[#111] border border-white/10 flex items-start gap-3">
        <svg width="20" height="20" className="text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-white mb-0.5">Powered by Zoho Mail</p>
          <p className="text-xs text-gray-400">
            Access webmail at <a href="https://mail.zoho.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">mail.zoho.com</a> or configure your email client via IMAP/SMTP.
          </p>
        </div>
      </div>

      {showCreate && (
        <CreateWizard
          domains={verifiedDomains}
          wallet={wallet}
          onClose={() => setShowCreate(false)}
          onCreated={(email) => { setEmails((prev) => [email, ...prev]); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

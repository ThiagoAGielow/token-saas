'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconUsers({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 11-8 0 4 4 0 018 0zm6 4a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function IconLink({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  )
}

function IconCopy({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

function IconTrash({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function IconPlus({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function IconBolt({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
}

// ─── Upgrade Banner ───────────────────────────────────────────────────────────

function UpgradeBanner({ onUpgrade }) {
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res = await fetch('/api/agency/upgrade', { method: 'POST' })
      const data = await res.json()
      if (data.success || data.message) {
        onUpgrade()
      }
    } catch {}
    setLoading(false)
  }

  return (
    <div className="bg-gradient-to-r from-violet-900/40 to-indigo-900/40 border border-violet-700/50 rounded-2xl p-8 text-center">
      <div className="w-14 h-14 bg-violet-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <IconBolt className="w-7 h-7 text-violet-400" />
      </div>
      <h2 className="text-white font-bold text-xl mb-2">Become an Agency</h2>
      <p className="text-gray-400 text-sm mb-2 max-w-md mx-auto">
        Manage multiple clients, invite them to your account, and oversee all their sites, domains, and emails from one place.
      </p>
      <p className="text-violet-300 text-sm font-medium mb-6">+ 400 bonus tokens when you upgrade</p>
      <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8 text-center">
        {[
          { label: 'Client accounts', value: 'Unlimited' },
          { label: 'Invite links', value: '7-day expiry' },
          { label: 'Bonus tokens', value: '400' },
        ].map((f) => (
          <div key={f.label} className="bg-gray-900/60 rounded-xl p-3">
            <div className="text-white font-semibold text-sm">{f.value}</div>
            <div className="text-gray-500 text-xs mt-0.5">{f.label}</div>
          </div>
        ))}
      </div>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
      >
        {loading ? 'Upgrading…' : 'Upgrade to Agency — Free'}
      </button>
    </div>
  )
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({ onClose, onCreated }) {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState(null)
  const [copied, setCopied]   = useState(false)

  async function handleCreate() {
    setLoading(true)
    try {
      const res = await fetch('/api/agency/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() || undefined }),
      })
      const data = await res.json()
      if (data.inviteUrl) {
        setInviteUrl(data.inviteUrl)
        onCreated()
      }
    } catch {}
    setLoading(false)
  }

  function copy() {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-white font-semibold text-lg mb-1">Invite a Client</h3>
        <p className="text-gray-400 text-sm mb-5">Send them a link — they sign up and get linked to your agency automatically.</p>

        {!inviteUrl ? (
          <>
            <label className="block text-sm text-gray-400 mb-1.5">Client email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500 mb-5"
            />
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {loading ? 'Creating…' : 'Create Invite Link'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-3">Share this link with your client. It expires in 7 days.</p>
            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 mb-5">
              <span className="text-violet-300 text-sm truncate flex-1">{inviteUrl}</span>
              <button onClick={copy} className="text-gray-400 hover:text-white transition-colors shrink-0">
                <IconCopy />
              </button>
            </div>
            {copied && <p className="text-green-400 text-xs mb-3">Copied to clipboard!</p>}
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgencyPage() {
  const [user, setUser]         = useState(null)
  const [clients, setClients]   = useState([])
  const [invites, setInvites]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [showInvite, setShowInvite] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Get current user role
      const meRes = await fetch('/api/tokens')
      const meData = await meRes.json()
      setUser(meData)

      // Only fetch agency data if agency account
      const roleRes = await fetch('/api/agency/clients')
      if (roleRes.ok) {
        const { clients: c } = await roleRes.json()
        setClients(c ?? [])
        const invRes = await fetch('/api/agency/invite')
        if (invRes.ok) {
          const { invites: inv } = await invRes.json()
          setInvites(inv ?? [])
        }
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const isAgency = user?.role === 'AGENCY'

  async function deleteInvite(id) {
    await fetch(`/api/agency/invite?id=${id}`, { method: 'DELETE' })
    setInvites((prev) => prev.filter((i) => i.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Agency Portal</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your clients and invite links</p>
      </div>

      {!isAgency ? (
        <UpgradeBanner onUpgrade={load} />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Clients', value: clients.length, icon: <IconUsers className="w-5 h-5 text-violet-400" /> },
              { label: 'Pending Invites', value: invites.filter((i) => !i.usedAt && new Date(i.expiresAt) > new Date()).length, icon: <IconLink className="w-5 h-5 text-blue-400" /> },
              { label: 'Total Sites Managed', value: clients.reduce((s, c) => s + (c._count?.websites ?? 0), 0), icon: <IconBolt className="w-5 h-5 text-emerald-400" /> },
            ].map((s) => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
                  {s.icon}
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-gray-500 text-xs">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Clients */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-white font-semibold">Clients</h2>
              <button
                onClick={() => setShowInvite(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <IconPlus />
                Invite Client
              </button>
            </div>

            {clients.length === 0 ? (
              <div className="p-12 text-center">
                <IconUsers className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No clients yet. Send an invite link to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {clients.map((c) => (
                  <div key={c.id} className="p-5 flex items-center gap-4">
                    <div
                      className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white font-semibold text-sm shrink-0"
                      style={{ width: '36px', height: '36px' }}
                    >
                      {(c.name ?? c.email ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm truncate">{c.name ?? '—'}</div>
                      <div className="text-gray-500 text-xs truncate">{c.email}</div>
                    </div>
                    <div className="hidden sm:flex items-center gap-6 text-center shrink-0">
                      {[
                        { label: 'Sites', value: c._count?.websites ?? 0 },
                        { label: 'Domains', value: c._count?.domains ?? 0 },
                        { label: 'Emails', value: c._count?.emailAccounts ?? 0 },
                        { label: 'Tokens left', value: c.wallet?.balance ?? 0 },
                      ].map((s) => (
                        <div key={s.label}>
                          <div className="text-white font-semibold text-sm">{s.value}</div>
                          <div className="text-gray-500 text-xs">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="text-gray-600 text-xs shrink-0">
                      {new Date(c.linkedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invite Links */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl">
            <div className="p-5 border-b border-gray-800">
              <h2 className="text-white font-semibold">Invite Links</h2>
            </div>
            {invites.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 text-sm">No invite links yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {invites.map((inv) => {
                  const expired = new Date(inv.expiresAt) < new Date()
                  const used    = !!inv.usedAt
                  return (
                    <div key={inv.id} className="p-5 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-gray-300 text-sm truncate font-mono">
                          {`/join?token=${inv.token}`}
                        </div>
                        <div className="text-gray-500 text-xs mt-0.5">
                          {inv.email ? `For: ${inv.email} · ` : ''}
                          Expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                        used    ? 'bg-green-900/40 text-green-400' :
                        expired ? 'bg-red-900/40 text-red-400' :
                                  'bg-blue-900/40 text-blue-400'
                      }`}>
                        {used ? 'Used' : expired ? 'Expired' : 'Active'}
                      </span>
                      <button
                        onClick={() => deleteInvite(inv.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onCreated={() => { load(); }}
        />
      )}
    </div>
  )
}

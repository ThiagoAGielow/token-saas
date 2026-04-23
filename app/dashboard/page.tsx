// ─── Dashboard overview — async Server Component ─────────────────────────────
// All data is fetched in parallel on the server. The only client component is
// OverviewClient (the "Cost Before Action" interactive widget).
// ─────────────────────────────────────────────────────────────────────────────

import Link                from 'next/link'
import { auth }            from '@clerk/nextjs/server'
import { redirect }        from 'next/navigation'
import { prisma }          from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import { estimateDaysRemaining } from '@/lib/tokens'
import OverviewClient      from './OverviewClient'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: Date | string) {
  const diff  = Date.now() - new Date(date).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

type TxRow = { id: string; description: string | null; amount: number; balanceAfter: number; createdAt: Date }

function txStyle(tx: TxRow) {
  const d = (tx.description ?? '').toLowerCase()
  if (d.includes('website'))               return { color: 'text-blue-400',   bg: 'bg-blue-500/10',   label: 'W' }
  if (d.includes('domain'))                return { color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'D' }
  if (d.includes('email'))                 return { color: 'text-green-400',  bg: 'bg-green-500/10',  label: 'E' }
  if (d.includes('ai') || d.includes('rewrite')) return { color: 'text-pink-400', bg: 'bg-pink-500/10', label: '✦' }
  return { color: 'text-amber-400', bg: 'bg-amber-500/10', label: '₮' }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user = await getOrCreateUser(clerkId)

  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [wallet, transactions, websiteCount, domainCount, emailCount, daysRemaining] = await Promise.all([
    prisma.tokenWallet.findUnique({ where: { userId: user.id }, select: { balance: true, lifetimeSpent: true } }),
    prisma.tokenTransaction.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take:    50,
      select:  { id: true, description: true, amount: true, balanceAfter: true, createdAt: true },
    }),
    prisma.website.count({ where: { userId: user.id } }),
    prisma.domain.count({ where: { userId: user.id, verified: true } }),
    prisma.emailAccount.count({ where: { userId: user.id } }),
    estimateDaysRemaining(user.id),
  ])

  const tokenBalance  = wallet?.balance       ?? 0
  const lifetimeSpent = wallet?.lifetimeSpent ?? 0

  // Month spend breakdown
  const monthTx = transactions.filter((t) => t.amount < 0 && new Date(t.createdAt) >= monthStart)
  const monthSpent = monthTx.reduce((s, t) => s + Math.abs(t.amount), 0)
  const breakdown = { websites: 0, domains: 0, emails: 0, ai: 0, other: 0 }
  for (const t of monthTx) {
    const d = (t.description ?? '').toLowerCase()
    if (d.includes('website'))                        breakdown.websites += Math.abs(t.amount)
    else if (d.includes('domain'))                    breakdown.domains  += Math.abs(t.amount)
    else if (d.includes('email'))                     breakdown.emails   += Math.abs(t.amount)
    else if (d.includes('ai') || d.includes('rewrite')) breakdown.ai     += Math.abs(t.amount)
    else                                              breakdown.other    += Math.abs(t.amount)
  }

  const recentActivity = transactions.slice(0, 6)
  const hour     = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{greeting}</h2>
          <p className="text-gray-400 mt-1 text-sm">Here&apos;s what&apos;s happening with your account today.</p>
        </div>
        {daysRemaining !== null && daysRemaining > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Projected empty</p>
            <p className="text-2xl font-black text-amber-400 tabular-nums">{daysRemaining}d</p>
            <p className="text-xs text-gray-500">at current usage rate</p>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { title: 'Token Balance',     value: tokenBalance.toLocaleString(), sub: 'tokens remaining', href: '/dashboard/tokens',   accent: 'bg-amber-400/10',  dot: 'bg-amber-400' },
          { title: 'Websites Created',  value: websiteCount,                  sub: 'active sites',     href: '/dashboard/websites', accent: 'bg-blue-500/10',   dot: 'bg-blue-400' },
          { title: 'Domains Connected', value: domainCount,                   sub: 'verified domains', href: '/dashboard/domains',  accent: 'bg-purple-500/10', dot: 'bg-purple-400' },
          { title: 'Emails Active',     value: emailCount,                    sub: 'mailboxes',        href: '/dashboard/emails',  accent: 'bg-green-500/10',  dot: 'bg-green-400' },
        ].map(({ title, value, sub, href, accent, dot }) => (
          <Link key={title} href={href} className={`p-5 rounded-xl bg-[#111] border border-white/10 hover:border-white/20 transition-all group`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
                <span className={`w-3 h-3 rounded-full ${dot}`} />
              </div>
              <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
            <p className="text-3xl font-black text-white tabular-nums mb-1">{value}</p>
            <p className="text-sm font-medium text-gray-300">{title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Usage this month */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#111] border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">This Month&apos;s Usage</h3>
            <Link href="/dashboard/usage" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View details →</Link>
          </div>
          {monthSpent === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No tokens spent this month yet.</p>
              <p className="text-gray-600 text-xs mt-1">Create a site or add a domain to get started.</p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-3xl font-black text-white tabular-nums">{monthSpent.toLocaleString()}</span>
                <span className="text-gray-500 mb-1">tokens spent this month</span>
              </div>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mb-3 flex">
                {breakdown.websites > 0 && <div className="h-full bg-blue-500"   style={{ width: `${(breakdown.websites / monthSpent) * 100}%` }} />}
                {breakdown.domains  > 0 && <div className="h-full bg-purple-500 ml-0.5" style={{ width: `${(breakdown.domains  / monthSpent) * 100}%` }} />}
                {breakdown.emails   > 0 && <div className="h-full bg-green-500  ml-0.5" style={{ width: `${(breakdown.emails   / monthSpent) * 100}%` }} />}
                {breakdown.ai       > 0 && <div className="h-full bg-pink-500   ml-0.5" style={{ width: `${(breakdown.ai       / monthSpent) * 100}%` }} />}
                {breakdown.other    > 0 && <div className="h-full bg-gray-500   ml-0.5" style={{ width: `${(breakdown.other    / monthSpent) * 100}%` }} />}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                {breakdown.websites > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Websites ({breakdown.websites})</span>}
                {breakdown.domains  > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />Domains ({breakdown.domains})</span>}
                {breakdown.emails   > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Emails ({breakdown.emails})</span>}
                {breakdown.ai       > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />AI ({breakdown.ai})</span>}
                {breakdown.other    > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />Other ({breakdown.other})</span>}
              </div>
            </>
          )}
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-sm text-gray-400">{tokenBalance.toLocaleString()} tokens remaining</span>
            <span className="text-xs text-gray-500">{lifetimeSpent.toLocaleString()} spent all time</span>
          </div>
        </div>

        {/* Interactive cost calculator — only client piece */}
        <OverviewClient tokenBalance={tokenBalance} />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent activity */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#111] border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Recent Activity</h3>
            <Link href="/dashboard/usage" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View all →</Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-center py-8 text-gray-500 text-sm">No activity yet.</p>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((tx, i) => {
                const { color, bg, label } = txStyle(tx)
                return (
                  <div key={tx.id} className={`flex items-center gap-3 py-3 ${i < recentActivity.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 ${color} text-xs font-bold`}>{label}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{tx.description}</p>
                      <p className="text-xs text-gray-500">{timeAgo(tx.createdAt)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold tabular-nums ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount}</p>
                      <p className="text-xs text-gray-600">{tx.balanceAfter} left</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="p-5 rounded-xl bg-[#111] border border-white/10">
          <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {[
              { href: '/dashboard/websites', label: 'Create Website', cost: '50 tokens', accent: 'blue' },
              { href: '/dashboard/domains',  label: 'Add Domain',     cost: '20 tokens', accent: 'purple' },
              { href: '/dashboard/emails',   label: 'Set Up Email',   cost: '10 tokens', accent: 'green' },
            ].map(({ href, label, cost, accent }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-3 p-3.5 rounded-xl bg-${accent}-500/10 border border-${accent}-500/20 hover:bg-${accent}-500/20 hover:border-${accent}-500/30 transition-all group`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-gray-500">{cost}</p>
                </div>
                <svg className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            ))}
            <div className="pt-2 border-t border-white/5">
              <Link href="/dashboard/tokens" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 hover:bg-amber-400/15 hover:border-amber-400/30 text-amber-400 text-sm font-semibold transition-all">
                Top Up Tokens
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


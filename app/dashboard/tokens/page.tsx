// ─── Tokens page — async Server Component ─────────────────────────────────────
// Fetches wallet, transactions, subscription, packs, and plans on the server.
// All interactive UI (checkout, copy) is in TokensClient.
// ─────────────────────────────────────────────────────────────────────────────

import { auth }            from '@clerk/nextjs/server'
import { redirect }        from 'next/navigation'
import { prisma }          from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import { TOKEN_PACKS, PLANS, type PlanKey, type PlanConfig } from '@/lib/stripe'
import TokensClient        from './TokensClient'
import type { TokenPack, Plan, TokenTransaction } from '@/types/dashboard'

export default async function TokensPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user = await getOrCreateUser(clerkId)

  const [walletRow, txRows, subRow] = await Promise.all([
    prisma.tokenWallet.findUnique({
      where:  { userId: user.id },
      select: { balance: true, lifetimeEarned: true, lifetimeSpent: true },
    }),
    prisma.tokenTransaction.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take:    50,
      select:  { id: true, type: true, amount: true, balanceAfter: true, description: true, metadata: true, expiresAt: true, createdAt: true },
    }),
    prisma.subscription.findUnique({
      where:  { userId: user.id },
      select: { plan: true, status: true },
    }),
  ])

  const wallet = {
    balance:        walletRow?.balance        ?? 0,
    lifetimeEarned: walletRow?.lifetimeEarned ?? 0,
    lifetimeSpent:  walletRow?.lifetimeSpent  ?? 0,
  }

  const transactions: TokenTransaction[] = txRows.map((t) => ({
    ...t,
    expiresAt: t.expiresAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  }))

  const subscription = subRow ? { plan: subRow.plan as string, status: subRow.status } : null

  const packs: TokenPack[] = TOKEN_PACKS.map((p) => ({
    id:      p.id,
    label:   p.label,
    price:   p.price,
    tokens:  p.tokens,
    popular: p.popular ?? false,
    priceId: p.priceId,
  }))

  const plans: Plan[] = (Object.entries(PLANS) as Array<[PlanKey, PlanConfig]>).map(([key, p]) => ({
    id:      key.toLowerCase(),
    key,
    name:    p.name,
    price:   p.price,
    tokens:  p.tokens,
    priceId: p.priceId,
  }))

  return (
    <TokensClient
      packs={packs}
      plans={plans}
      wallet={wallet}
      transactions={transactions}
      subscription={subscription}
      userId={user.id}
    />
  )
}

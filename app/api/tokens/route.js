// ─────────────────────────────────────────────────────────────────────────────
// app/api/tokens/route.js
//
// GET  /api/tokens       — wallet summary (balance, recent transactions, grants)
// POST /api/tokens/spend — deduct tokens for a platform action
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import {
  getWallet,
  spendTokens,
  estimateDaysRemaining,
  TOKEN_COSTS,
} from '@/lib/tokens'

// ─── GET /api/tokens ──────────────────────────────────────────────────────────

/**
 * Returns the authenticated user's full token wallet state:
 * balance, lifetime stats, recent transactions, and active grants.
 */
export async function GET() {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const user = await getOrCreateUser(clerkId)

    const [wallet, transactions, grants, daysRemaining] = await Promise.all([
      getWallet(user.id),

      prisma.tokenTransaction.findMany({
        where:   { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take:    50,
        select: {
          id:          true,
          type:        true,
          amount:      true,
          balanceAfter: true,
          description: true,
          metadata:    true,
          expiresAt:   true,
          createdAt:   true,
        },
      }),

      prisma.tokenGrant.findMany({
        where: {
          userId:    user.id,
          remaining: { gt: 0 },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id:        true,
          amount:    true,
          source:    true,
          remaining: true,
          expiresAt: true,
          createdAt: true,
        },
      }),

      estimateDaysRemaining(user.id),
    ])

    return NextResponse.json({
      wallet: {
        balance:        wallet.balance,
        lifetimeEarned: wallet.lifetimeEarned,
        lifetimeSpent:  wallet.lifetimeSpent,
        updatedAt:      wallet.updatedAt,
      },
      daysRemaining,
      transactions,
      grants,
      costs: TOKEN_COSTS,
    })
  } catch (error) {
    console.error('[GET /api/tokens]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

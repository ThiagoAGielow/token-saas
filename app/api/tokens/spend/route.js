// ─────────────────────────────────────────────────────────────────────────────
// app/api/tokens/spend/route.js
//
// POST /api/tokens/spend — spend tokens for a platform action
//
// Body: {
//   action:   'WEBSITE' | 'DOMAIN' | 'EMAIL' | 'AI_REWRITE' | 'AI_REGENERATE'
//   metadata: {}   (optional — e.g. { websiteId: 'abc' })
// }
//
// Returns: { success: true, newBalance: number, spent: number, action: string }
// ─────────────────────────────────────────────────────────────────────────────

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { spendTokens, getBalance, TOKEN_COSTS } from '@/lib/tokens'

const VALID_ACTIONS = Object.keys(TOKEN_COSTS)

/**
 * POST /api/tokens/spend
 * Validates the action, checks balance, deducts tokens, returns new balance.
 *
 * @param {Request} request
 */
export async function POST(request) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    /** @type {{ action?: string, metadata?: object }} */
    const body = await request.json().catch(() => ({}))
    const { action, metadata = {} } = body

    // ── Validate action ────────────────────────────────────────────────────
    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        {
          error:       'Invalid action',
          validActions: VALID_ACTIONS,
          costs:       TOKEN_COSTS,
        },
        { status: 400 }
      )
    }

    const cost = TOKEN_COSTS[action]

    // ── Resolve internal user ──────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where:  { clerkId },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ── Pre-flight balance check (friendly error before attempting debit) ──
    const currentBalance = await getBalance(user.id)

    if (currentBalance < cost) {
      return NextResponse.json(
        {
          error:          'Insufficient tokens',
          required:       cost,
          currentBalance,
          shortfall:      cost - currentBalance,
        },
        { status: 402 } // Payment Required
      )
    }

    // ── Deduct tokens ──────────────────────────────────────────────────────
    const description = `${action}: ${metadata?.description ?? action.toLowerCase().replace('_', ' ')}`
    const newBalance  = await spendTokens(user.id, cost, description, {
      action,
      ...metadata,
    })

    return NextResponse.json({
      success:    true,
      action,
      spent:      cost,
      newBalance,
    })
  } catch (error) {
    // spendTokens throws a typed error for insufficient balance (race condition edge case)
    if (error.message?.startsWith('Insufficient tokens')) {
      return NextResponse.json({ error: error.message }, { status: 402 })
    }

    console.error('[POST /api/tokens/spend]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

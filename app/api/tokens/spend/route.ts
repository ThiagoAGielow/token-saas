// ─────────────────────────────────────────────────────────────────────────────
// app/api/tokens/spend/route.ts
//
// POST /api/tokens/spend — spend tokens for a platform action
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { spendTokens, getBalance, TOKEN_COSTS } from '@/lib/tokens'

type Action = keyof typeof TOKEN_COSTS

const VALID_ACTIONS = Object.keys(TOKEN_COSTS) as Action[]

interface SpendBody {
  action?: string
  metadata?: Record<string, unknown>
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as SpendBody
    const action = body.action as Action | undefined
    const metadata = body.metadata ?? {}

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        {
          error:        'Invalid action',
          validActions: VALID_ACTIONS,
          costs:        TOKEN_COSTS,
        },
        { status: 400 }
      )
    }

    const cost = TOKEN_COSTS[action]

    const user = await prisma.user.findUnique({
      where:  { clerkId },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const currentBalance = await getBalance(user.id)

    if (currentBalance < cost) {
      return NextResponse.json(
        {
          error:          'Insufficient tokens',
          required:       cost,
          currentBalance,
          shortfall:      cost - currentBalance,
        },
        { status: 402 }
      )
    }

    const metaDescription = typeof metadata.description === 'string'
      ? metadata.description
      : action.toLowerCase().replace('_', ' ')
    const description = `${action}: ${metaDescription}`
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
    const message = (error as Error).message ?? ''
    if (message.startsWith('Insufficient tokens')) {
      return NextResponse.json({ error: message }, { status: 402 })
    }

    console.error('[POST /api/tokens/spend]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// app/api/tokens/checkout/route.ts
//
// POST /api/tokens/checkout — create a Stripe checkout session
//
// Body: {
//   priceId: string               — Stripe Price ID
//   mode:    'payment' | 'subscription'
// }
//
// Returns: { url: string }  — Redirect the user to this Stripe-hosted URL
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getOrCreateUser } from '@/lib/user'
import { createCheckoutSession, resolveTokensFromPriceId } from '@/lib/stripe'

interface CheckoutBody {
  priceId?: string
  mode?: string
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as CheckoutBody
    const { priceId, mode } = body

    if (!priceId || typeof priceId !== 'string') {
      return NextResponse.json(
        { error: 'priceId is required' },
        { status: 400 }
      )
    }

    if (mode !== 'payment' && mode !== 'subscription') {
      return NextResponse.json(
        { error: 'mode must be "payment" or "subscription"' },
        { status: 400 }
      )
    }

    const resolved = resolveTokensFromPriceId(priceId)

    if (!resolved) {
      return NextResponse.json(
        { error: 'Unrecognised priceId' },
        { status: 400 }
      )
    }

    const user = await getOrCreateUser(clerkId)
    const email = user.email ?? ''

    const session = await createCheckoutSession(user.id, priceId, mode, email)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[POST /api/tokens/checkout]', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

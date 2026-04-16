// ─────────────────────────────────────────────────────────────────────────────
// app/api/tokens/checkout/route.js
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

import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import { createCheckoutSession, resolveTokensFromPriceId } from '@/lib/stripe'

/**
 * POST /api/tokens/checkout
 * Validates the price ID, creates a Stripe Checkout session, returns the URL.
 *
 * @param {Request} request
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    /** @type {{ priceId?: string, mode?: string }} */
    const body = await request.json().catch(() => ({}))
    const { priceId, mode } = body

    // ── Validate inputs ────────────────────────────────────────────────────
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

    // ── Verify priceId is one we recognise ─────────────────────────────────
    const resolved = resolveTokensFromPriceId(priceId)

    if (!resolved) {
      return NextResponse.json(
        { error: 'Unrecognised priceId' },
        { status: 400 }
      )
    }

    // ── Resolve internal user ──────────────────────────────────────────────
    const user = await getOrCreateUser(clerkId)
    const email = user.email ?? ''

    // ── Create Stripe session ──────────────────────────────────────────────
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

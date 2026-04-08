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
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createCheckoutSession, resolveTokensFromPriceId } from '@/lib/stripe'

/**
 * POST /api/tokens/checkout
 * Validates the price ID, creates a Stripe Checkout session, returns the URL.
 *
 * @param {Request} request
 */
export async function POST(request) {
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

    if (!['payment', 'subscription'].includes(mode)) {
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
    const [user, clerkUser] = await Promise.all([
      prisma.user.findUnique({
        where:  { clerkId },
        select: { id: true, email: true },
      }),
      currentUser(),
    ])

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const email = user.email ?? clerkUser?.emailAddresses?.[0]?.emailAddress ?? ''

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

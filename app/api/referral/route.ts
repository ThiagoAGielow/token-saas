// ─────────────────────────────────────────────────────────────────────────────
// app/api/referral/route.js
//
// GET  /api/referral        — current user's referral code + stats
// POST /api/referral/apply  — apply a referral code during signup
// ─────────────────────────────────────────────────────────────────────────────

import { auth } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { grantReferralBonus } from '@/lib/tokens'

// ─── GET /api/referral ────────────────────────────────────────────────────────

/**
 * Returns the current user's referral code, how many users they've referred,
 * and total referral bonus tokens earned.
 */
export async function GET() {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where:  { clerkId },
      select: {
        id:           true,
        referralCode: true,
        referrals: {
          select: {
            id:        true,
            name:      true,
            email:     true,
            createdAt: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Sum all referral bonus transactions for this user
    const bonusAggregate = await prisma.tokenTransaction.aggregate({
      where: {
        userId: user.id,
        type:   'REFERRAL_BONUS',
      },
      _sum: { amount: true },
    })

    const tokensEarned = bonusAggregate._sum.amount ?? 0

    return NextResponse.json({
      referralCode:   user.referralCode,
      referralLink:   `${process.env.NEXT_PUBLIC_APP_URL}/sign-up?ref=${user.referralCode}`,
      referralsCount: user.referrals.length,
      tokensEarned,
      referrals:      user.referrals,
    })
  } catch (error) {
    console.error('[GET /api/referral]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── POST /api/referral/apply ─────────────────────────────────────────────────

// Note: Next.js App Router matches POST on this file when the path is
// /api/referral. The sub-path /apply is handled below using request.nextUrl.
// To keep things clean this file exports both GET and POST; the middleware
// routes /api/referral/apply → this handler too (see middleware.js).

/**
 * Applies a referral code for the currently authenticated user.
 * Can only be applied once and cannot self-refer.
 *
 * Body: { referralCode: string }
 *
 * @param {Request} request
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    /** @type {{ referralCode?: string }} */
    const body = await request.json().catch(() => ({}))
    const { referralCode } = body

    if (!referralCode || typeof referralCode !== 'string') {
      return NextResponse.json(
        { error: 'referralCode is required' },
        { status: 400 }
      )
    }

    const normalised = referralCode.trim().toUpperCase()

    // ── Load current user ──────────────────────────────────────────────────
    const currentUser = await prisma.user.findUnique({
      where:  { clerkId },
      select: { id: true, referredBy: true },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Already used a referral code
    if (currentUser.referredBy) {
      return NextResponse.json(
        { error: 'You have already applied a referral code' },
        { status: 409 }
      )
    }

    // ── Find referrer ──────────────────────────────────────────────────────
    const referrer = await prisma.user.findUnique({
      where:  { referralCode: normalised },
      select: { id: true },
    })

    if (!referrer) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 404 }
      )
    }

    // Prevent self-referral
    if (referrer.id === currentUser.id) {
      return NextResponse.json(
        { error: 'You cannot refer yourself' },
        { status: 400 }
      )
    }

    // ── Apply the referral ─────────────────────────────────────────────────
    await prisma.user.update({
      where: { id: currentUser.id },
      data:  { referredBy: referrer.id },
    })

    // Grant bonus tokens to both parties
    await grantReferralBonus(referrer.id, currentUser.id)

    return NextResponse.json({
      success:     true,
      message:     'Referral code applied — 50 bonus tokens added to your wallet!',
      tokensAdded: 50,
    })
  } catch (error) {
    console.error('[POST /api/referral]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

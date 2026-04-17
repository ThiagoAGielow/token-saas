// ─────────────────────────────────────────────────────────────────────────────
// app/api/referral/route.ts
// ─────────────────────────────────────────────────────────────────────────────

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { TransactionType } from '@prisma/client'
import { prisma } from '@/lib/db'
import { grantReferralBonus } from '@/lib/tokens'

// ─── GET /api/referral ────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
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

    const bonusAggregate = await prisma.tokenTransaction.aggregate({
      where: {
        userId: user.id,
        type:   TransactionType.REFERRAL_BONUS,
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

// ─── POST /api/referral ───────────────────────────────────────────────────────

interface ApplyReferralBody {
  referralCode?: string
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as ApplyReferralBody
    const { referralCode } = body

    if (!referralCode || typeof referralCode !== 'string') {
      return NextResponse.json(
        { error: 'referralCode is required' },
        { status: 400 }
      )
    }

    const normalised = referralCode.trim().toUpperCase()

    const currentUser = await prisma.user.findUnique({
      where:  { clerkId },
      select: { id: true, referredBy: true },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (currentUser.referredBy) {
      return NextResponse.json(
        { error: 'You have already applied a referral code' },
        { status: 409 }
      )
    }

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

    if (referrer.id === currentUser.id) {
      return NextResponse.json(
        { error: 'You cannot refer yourself' },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data:  { referredBy: referrer.id },
    })

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

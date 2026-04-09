// POST /api/agency/upgrade — upgrades the current user to AGENCY role
export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

export async function POST() {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const user = await getOrCreateUser(clerkId)

    if (user.role === 'AGENCY') {
      return NextResponse.json({ message: 'Already an agency account' })
    }

    // Upgrade role + bonus 400 tokens (total 500 for agencies)
    const wallet = await prisma.tokenWallet.findUnique({ where: { userId: user.id } })
    const bonus = 400

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { role: 'AGENCY' },
      }),
      prisma.tokenWallet.update({
        where: { userId: user.id },
        data: {
          balance:       { increment: bonus },
          lifetimeEarned: { increment: bonus },
        },
      }),
      prisma.tokenTransaction.create({
        data: {
          userId:      user.id,
          type:        'TRIAL_GRANT',
          amount:      bonus,
          balanceAfter: (wallet?.balance ?? 0) + bonus,
          description:  'Agency upgrade bonus — 400 tokens',
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/agency/upgrade]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

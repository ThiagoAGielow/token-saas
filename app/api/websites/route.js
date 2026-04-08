// ─────────────────────────────────────────────────────────────────────────────
// app/api/websites/route.js
//
// GET /api/websites — list the authenticated user's websites
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const user = await prisma.user.findUnique({
      where:  { clerkId },
      select: { id: true },
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const websites = await prisma.website.findMany({
      where:   { userId: user.id },
      select: {
        id:        true,
        name:      true,
        subdomain: true,
        status:    true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ websites })
  } catch (error) {
    console.error('[GET /api/websites]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

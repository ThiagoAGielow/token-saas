// POST /api/agency/join — accept an agency invite
export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

export async function POST(request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const { token } = body
    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

    const invite = await prisma.agencyInvite.findUnique({ where: { token } })

    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    if (invite.usedAt) return NextResponse.json({ error: 'Invite already used' }, { status: 409 })
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })

    const client = await getOrCreateUser(clerkId)

    // Can't join your own agency
    if (client.id === invite.agencyId) {
      return NextResponse.json({ error: 'Cannot join your own agency' }, { status: 400 })
    }

    // Already linked
    const existing = await prisma.agencyClient.findUnique({
      where: { agencyId_clientId: { agencyId: invite.agencyId, clientId: client.id } },
    })
    if (existing) return NextResponse.json({ message: 'Already linked' })

    await prisma.$transaction([
      prisma.agencyClient.create({
        data: { agencyId: invite.agencyId, clientId: client.id },
      }),
      prisma.agencyInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/agency/join]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

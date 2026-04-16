// POST /api/agency/invite — create an invite link
// GET  /api/agency/invite — list pending invites
export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

export async function GET() {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const user = await getOrCreateUser(clerkId)
    if (user.role !== 'AGENCY') {
      return NextResponse.json({ error: 'Agency account required' }, { status: 403 })
    }

    const invites = await prisma.agencyInvite.findMany({
      where: { agencyId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ invites })
  } catch (error) {
    console.error('[GET /api/agency/invite]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const user = await getOrCreateUser(clerkId)
    if (user.role !== 'AGENCY') {
      return NextResponse.json({ error: 'Agency account required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const email = body.email?.trim().toLowerCase() || null

    // Expires in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const invite = await prisma.agencyInvite.create({
      data: { agencyId: user.id, email, expiresAt },
    })

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join?token=${invite.token}`

    return NextResponse.json({ invite, inviteUrl }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/agency/invite]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const user = await getOrCreateUser(clerkId)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    await prisma.agencyInvite.deleteMany({ where: { id, agencyId: user.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/agency/invite]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

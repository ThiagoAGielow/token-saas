export const dynamic = 'force-dynamic'

import { auth }            from '@clerk/nextjs/server'
import { NextResponse }    from 'next/server'
import { prisma }          from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

// ─── GET /api/profile ─────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const user = await getOrCreateUser(clerkId)
    return NextResponse.json({ githubUsername: user.githubUsername ?? null })
  } catch (error) {
    console.error('[GET /api/profile]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH /api/profile ───────────────────────────────────────────────────────

interface PatchBody {
  githubUsername?: string
}

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = (await request.json()) as PatchBody
    const raw  = body.githubUsername

    const githubUsername = typeof raw === 'string'
      ? raw.trim().replace(/^@/, '') || null
      : null

    const user    = await getOrCreateUser(clerkId)
    const updated = await prisma.user.update({
      where:  { id: user.id },
      data:   { githubUsername },
      select: { githubUsername: true },
    })

    return NextResponse.json({ githubUsername: updated.githubUsername })
  } catch (error) {
    console.error('[PATCH /api/profile]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

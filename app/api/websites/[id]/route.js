// ─────────────────────────────────────────────────────────────────────────────
// app/api/websites/[id]/route.js
//
// PATCH /api/websites/[id] — publish a DRAFT site (DRAFT → ACTIVE)
// DELETE /api/websites/[id] — delete a site
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

import { auth }            from '@clerk/nextjs/server'
import { NextResponse }    from 'next/server'
import { prisma }          from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

// ─── PATCH — publish ──────────────────────────────────────────────────────────

export async function PATCH(request, { params }) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { id } = await params
    const user   = await getOrCreateUser(clerkId)

    const website = await prisma.website.findFirst({
      where:  { id, userId: user.id },
      select: { id: true, status: true, name: true },
    })

    if (!website) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (website.status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Cannot publish — site is currently "${website.status}"` },
        { status: 409 }
      )
    }

    const updated = await prisma.website.update({
      where: { id },
      data:  { status: 'ACTIVE', publishedAt: new Date() },
      select: { id: true, status: true, publishedAt: true },
    })

    return NextResponse.json({ website: updated })
  } catch (error) {
    console.error('[PATCH /api/websites/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE — remove site ─────────────────────────────────────────────────────

export async function DELETE(request, { params }) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { id } = await params
    const user   = await getOrCreateUser(clerkId)

    const website = await prisma.website.findFirst({
      where:  { id, userId: user.id },
      select: { id: true },
    })

    if (!website) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.website.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/websites/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

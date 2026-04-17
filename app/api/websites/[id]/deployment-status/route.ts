// ─────────────────────────────────────────────────────────────────────────────
// app/api/websites/[id]/deployment-status/route.ts
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

import { auth }                from '@clerk/nextjs/server'
import { NextResponse }        from 'next/server'
import { prisma }              from '@/lib/db'
import { getOrCreateUser }     from '@/lib/user'
import { getDeploymentStatus } from '@/lib/vercel'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { id } = await params
    const user   = await getOrCreateUser(clerkId)

    const website = await prisma.website.findFirst({
      where:  { id, userId: user.id },
      select: { id: true, vercelProjectId: true, vercelUrl: true },
    })

    if (!website) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!website.vercelProjectId) {
      return NextResponse.json({ status: 'NOT_CONFIGURED', vercelUrl: null })
    }

    if (website.vercelUrl) {
      return NextResponse.json({ status: 'READY', vercelUrl: website.vercelUrl })
    }

    const { status, url } = await getDeploymentStatus(website.vercelProjectId)

    if (status === 'READY' && url) {
      await prisma.website.update({
        where: { id },
        data:  { vercelUrl: url },
      })
    }

    return NextResponse.json({ status, vercelUrl: url })
  } catch (error) {
    console.error('[GET /api/websites/[id]/deployment-status]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

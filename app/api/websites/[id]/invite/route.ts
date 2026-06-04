export const dynamic = 'force-dynamic'

import { auth }            from '@clerk/nextjs/server'
import { NextResponse }    from 'next/server'
import { prisma }          from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import { addCollaborator } from '@/lib/github'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { id } = await params
    const user   = await getOrCreateUser(clerkId)

    if (!user.githubUsername) {
      return NextResponse.json(
        { error: 'No GitHub username saved. Add it in Settings first.' },
        { status: 400 }
      )
    }

    const website = await prisma.website.findFirst({
      where:  { id, userId: user.id },
      select: { githubRepo: true, name: true },
    })

    if (!website)            return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!website.githubRepo) return NextResponse.json({ error: 'No GitHub repo for this site yet.' }, { status: 400 })

    await addCollaborator(website.githubRepo, user.githubUsername)

    return NextResponse.json({ success: true, username: user.githubUsername })
  } catch (error) {
    console.error('[POST /api/websites/[id]/invite]', error)
    const msg = (error as Error).message ?? 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

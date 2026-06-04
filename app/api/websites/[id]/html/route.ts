export const dynamic = 'force-dynamic'

import { auth }            from '@clerk/nextjs/server'
import { prisma }          from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return new Response('Unauthorised', { status: 401 })

    const { id } = await params
    const user   = await getOrCreateUser(clerkId)

    const website = await prisma.website.findFirst({
      where:  { id, userId: user.id },
      select: { generatedHtml: true },
    })

    if (!website)               return new Response('Not found', { status: 404 })
    if (!website.generatedHtml) return new Response('No HTML yet', { status: 404 })

    return new Response(website.generatedHtml, {
      headers: {
        'Content-Type':  'text/html; charset=utf-8',
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    console.error('[GET /api/websites/[id]/html]', error)
    return new Response('Internal server error', { status: 500 })
  }
}

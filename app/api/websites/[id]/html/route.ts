export const dynamic = 'force-dynamic'

import { auth }            from '@clerk/nextjs/server'
import { prisma }          from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

interface RouteContext {
  params: Promise<{ id: string }>
}

// ─── PATCH — save direct HTML edits ──────────────────────────────────────────

export async function PATCH(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

    const { id } = await params
    const user   = await getOrCreateUser(clerkId)
    const html   = await request.text()

    if (!html.trim()) {
      return new Response(JSON.stringify({ error: 'HTML cannot be empty' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const website = await prisma.website.findFirst({
      where:  { id, userId: user.id },
      select: { id: true },
    })
    if (!website) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })

    await prisma.website.update({
      where: { id },
      data:  { generatedHtml: html },
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[PATCH /api/websites/[id]/html]', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

// ─── GET — serve raw HTML ─────────────────────────────────────────────────────

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

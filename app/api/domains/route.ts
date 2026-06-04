// ─────────────────────────────────────────────────────────────────────────────
// app/api/domains/route.ts
//
// GET    /api/domains       — list user's custom domains
// POST   /api/domains       — add a custom domain (generates verification token)
// DELETE /api/domains?id=x  — remove a custom domain
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import { removeDomainFromProject } from '@/lib/vercel'
import { randomBytes } from 'crypto'

function generateVerificationToken(): string {
  return 'velocitysites-verify=' + randomBytes(16).toString('hex')
}

function sanitizeDomain(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')
}

interface CreateDomainBody {
  domain?: unknown
  websiteId?: string
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const user = await getOrCreateUser(clerkId)

    const domains = await prisma.domain.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id:                true,
        domain:            true,
        verified:          true,
        verificationToken: true,
        verifiedAt:        true,
        createdAt:         true,
        websiteId:         true,
      },
    })

    return NextResponse.json({ domains })
  } catch (error) {
    console.error('[GET /api/domains]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body      = (await request.json().catch(() => ({}))) as CreateDomainBody
    const raw       = body.domain
    const websiteId = typeof body.websiteId === 'string' ? body.websiteId : undefined

    if (!raw || typeof raw !== 'string') {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 })
    }

    const domain = sanitizeDomain(raw)

    const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/
    if (!DOMAIN_RE.test(domain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
    }

    const existing = await prisma.domain.findUnique({ where: { domain } })
    if (existing) {
      return NextResponse.json({ error: 'Domain already registered' }, { status: 409 })
    }

    const user = await getOrCreateUser(clerkId)

    // Validate websiteId belongs to this user if provided
    if (websiteId) {
      const website = await prisma.website.findFirst({ where: { id: websiteId, userId: user.id }, select: { id: true } })
      if (!website) return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    const record = await prisma.domain.create({
      data: {
        userId:            user.id,
        domain,
        verified:          false,
        verificationToken: generateVerificationToken(),
        ...(websiteId ? { websiteId } : {}),
      },
      select: {
        id:                true,
        domain:            true,
        verified:          true,
        verificationToken: true,
        createdAt:         true,
      },
    })

    return NextResponse.json({ domain: record }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/domains]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const user = await getOrCreateUser(clerkId)

    const domain = await prisma.domain.findFirst({
      where:  { id, userId: user.id },
      include: { website: { select: { vercelProjectId: true } } },
    })
    if (!domain) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.domain.delete({ where: { id } })

    // Best-effort Vercel cleanup — don't block deletion if this fails
    const projectId = domain.website?.vercelProjectId
    if (projectId && domain.verified) {
      try {
        await Promise.allSettled([
          removeDomainFromProject(projectId, domain.domain),
          removeDomainFromProject(projectId, `www.${domain.domain}`),
        ])
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/domains]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// app/api/subdomains/route.ts
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { WebsiteStatus, type User } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import { spendTokens, TOKEN_COSTS } from '@/lib/tokens'

const RESERVED = new Set([
  'www', 'app', 'api', 'dashboard', 'admin', 'mail', 'smtp', 'ftp',
  'blog', 'shop', 'store', 'support', 'help', 'status', 'cdn', 'media',
])

const SUBDOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/

interface ClaimSubdomainBody {
  subdomain?: string
  siteName?: string
}

async function getInternalUser(): Promise<User | null> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null
  return getOrCreateUser(clerkId)
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')?.toLowerCase().trim()

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    if (!SUBDOMAIN_RE.test(name)) {
      return NextResponse.json({
        available: false,
        reason: 'Only lowercase letters, numbers, and hyphens allowed',
      })
    }

    if (RESERVED.has(name)) {
      return NextResponse.json({ available: false, reason: 'This subdomain is reserved' })
    }

    const existing = await prisma.website.findUnique({
      where: { subdomain: name },
      select: { id: true },
    })

    return NextResponse.json({ available: !existing })
  } catch (error) {
    console.error('[GET /api/subdomains]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getInternalUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = (await request.json()) as ClaimSubdomainBody
    const subdomain = body.subdomain?.toLowerCase().trim()
    const siteName = body.siteName?.trim() || subdomain

    if (!subdomain || !SUBDOMAIN_RE.test(subdomain)) {
      return NextResponse.json({ error: 'Invalid subdomain format' }, { status: 400 })
    }

    if (RESERVED.has(subdomain)) {
      return NextResponse.json({ error: 'This subdomain is reserved' }, { status: 400 })
    }

    const existing = await prisma.website.findUnique({
      where: { subdomain },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ error: 'Subdomain is already taken' }, { status: 409 })
    }

    await spendTokens(
      user.id,
      TOKEN_COSTS.DOMAIN,
      `Subdomain claimed: ${subdomain}.${process.env.PLATFORM_DOMAIN}`,
      { subdomain }
    )

    const website = await prisma.website.create({
      data: {
        userId:   user.id,
        name:     siteName ?? subdomain,
        subdomain,
        status:   WebsiteStatus.BUILDING,
        prompt:   '',
      },
      select: {
        id:        true,
        name:      true,
        subdomain: true,
        status:    true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      website,
      url: `https://${subdomain}.${process.env.PLATFORM_DOMAIN}`,
    }, { status: 201 })
  } catch (error) {
    const message = (error as Error).message ?? ''
    if (message.includes('Insufficient tokens')) {
      return NextResponse.json({ error: 'Insufficient tokens' }, { status: 402 })
    }
    console.error('[POST /api/subdomains]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const user = await getInternalUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const websiteId = searchParams.get('id')

    if (!websiteId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const website = await prisma.website.findFirst({
      where: { id: websiteId, userId: user.id },
      select: { id: true, subdomain: true },
    })

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    await prisma.website.delete({ where: { id: websiteId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/subdomains]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

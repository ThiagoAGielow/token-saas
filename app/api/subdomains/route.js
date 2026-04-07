// ─────────────────────────────────────────────────────────────────────────────
// app/api/subdomains/route.js
//
// GET  /api/subdomains?name=myshop  — check if subdomain is available
// POST /api/subdomains              — claim a subdomain (costs 20 tokens)
// DELETE /api/subdomains?id=xxx     — release a subdomain
// ─────────────────────────────────────────────────────────────────────────────

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { spendTokens, TOKEN_COSTS } from '@/lib/tokens'

// Reserved subdomains that can't be claimed by customers
const RESERVED = new Set([
  'www', 'app', 'api', 'dashboard', 'admin', 'mail', 'smtp', 'ftp',
  'blog', 'shop', 'store', 'support', 'help', 'status', 'cdn', 'media',
])

const SUBDOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/

async function getInternalUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null
  return prisma.user.findUnique({ where: { clerkId }, select: { id: true } })
}

// ─── GET /api/subdomains?name=myshop ─────────────────────────────────────────

export async function GET(request) {
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

// ─── POST /api/subdomains ─────────────────────────────────────────────────────

/**
 * Claims a subdomain for a website the user owns.
 * Body: { subdomain: 'myshop', websiteId: 'cuid...' }
 *
 * Creates the website record with the subdomain and spends 20 tokens.
 * The actual DNS wildcard record (*.velocitysites.com.au) is set up once
 * by the platform admin — no per-site Cloudflare call needed.
 */
export async function POST(request) {
  try {
    const user = await getInternalUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await request.json()
    const subdomain = body.subdomain?.toLowerCase().trim()
    const siteName = body.siteName?.trim() || subdomain

    if (!subdomain || !SUBDOMAIN_RE.test(subdomain)) {
      return NextResponse.json({ error: 'Invalid subdomain format' }, { status: 400 })
    }

    if (RESERVED.has(subdomain)) {
      return NextResponse.json({ error: 'This subdomain is reserved' }, { status: 400 })
    }

    // Check availability
    const existing = await prisma.website.findUnique({
      where: { subdomain },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ error: 'Subdomain is already taken' }, { status: 409 })
    }

    // Spend tokens
    await spendTokens(
      user.id,
      TOKEN_COSTS.DOMAIN,
      `Subdomain claimed: ${subdomain}.${process.env.PLATFORM_DOMAIN}`,
      { subdomain }
    )

    // Create website record with the subdomain
    const website = await prisma.website.create({
      data: {
        userId:   user.id,
        name:     siteName,
        subdomain,
        status:   'BUILDING',
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
    if (error.message?.includes('Insufficient tokens')) {
      return NextResponse.json({ error: 'Insufficient tokens' }, { status: 402 })
    }
    console.error('[POST /api/subdomains]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/subdomains?id=xxx ───────────────────────────────────────────

export async function DELETE(request) {
  try {
    const user = await getInternalUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const websiteId = searchParams.get('id')

    if (!websiteId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Verify ownership
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

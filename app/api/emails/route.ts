// ─────────────────────────────────────────────────────────────────────────────
// app/api/emails/route.js
//
// GET    /api/emails       — list user's email accounts
// POST   /api/emails       — create a new mailbox (deducts 10 tokens)
// DELETE /api/emails?id=x  — delete a mailbox
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import { createZohoAccount, addDomainToZoho, deleteZohoAccount } from '@/lib/zoho'

const EMAIL_TOKEN_COST = 10

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const user = await getOrCreateUser(clerkId)

    const emails = await prisma.emailAccount.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { domain: { select: { domain: true, verified: true } } },
    })

    return NextResponse.json({ emails })
  } catch (error) {
    console.error('[GET /api/emails]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const { domainId, username, displayName, password } = body

    // Validate inputs
    if (!domainId || !username || !displayName || !password) {
      return NextResponse.json({ error: 'domainId, username, displayName and password are required' }, { status: 400 })
    }

    const USERNAME_RE = /^[a-z0-9]([a-z0-9._-]{0,62}[a-z0-9])?$/i
    if (!USERNAME_RE.test(username)) {
      return NextResponse.json({ error: 'Invalid email username format' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const user = await getOrCreateUser(clerkId)

    // Verify the domain belongs to this user and is verified
    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id, verified: true },
    })
    if (!domain) {
      return NextResponse.json({ error: 'Domain not found or not verified' }, { status: 404 })
    }

    const address = `${username.toLowerCase()}@${domain.domain}`

    // Check the address isn't already taken
    const existing = await prisma.emailAccount.findUnique({ where: { address } })
    if (existing) {
      return NextResponse.json({ error: 'That email address already exists' }, { status: 409 })
    }

    // Check token balance
    const wallet = await prisma.tokenWallet.findUnique({ where: { userId: user.id } })
    if (!wallet || wallet.balance < EMAIL_TOKEN_COST) {
      return NextResponse.json({ error: 'Insufficient token balance' }, { status: 402 })
    }

    // ── Zoho API ──────────────────────────────────────────────────────────────
    let zohoAccountId: string | null = null

    // Add domain to Zoho org first (safe to call if already added — Zoho returns existing)
    try {
      await addDomainToZoho(domain.domain)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // "Domain already exists" is fine, other errors we surface
      if (!message.toLowerCase().includes('already')) {
        console.error('[Zoho addDomain]', message)
        // Don't block — maybe domain is already there and Zoho returned a non-200
      }
    }

    // Create the mailbox
    const zoho = await createZohoAccount({
      username: username.toLowerCase(),
      domain:   domain.domain,
      displayName,
      password,
    })
    zohoAccountId = zoho.accountId

    // ── Save to DB + deduct tokens (in a transaction) ─────────────────────────
    const [emailAccount] = await prisma.$transaction([
      prisma.emailAccount.create({
        data: {
          userId:        user.id,
          domainId:      domain.id,
          address,
          zohoAccountId,
          tokenCost:     EMAIL_TOKEN_COST,
        },
      }),
      prisma.tokenWallet.update({
        where: { userId: user.id },
        data: {
          balance:       { decrement: EMAIL_TOKEN_COST },
          lifetimeSpent: { increment: EMAIL_TOKEN_COST },
        },
      }),
      prisma.tokenTransaction.create({
        data: {
          userId:      user.id,
          type:        'SPEND',
          amount:      -EMAIL_TOKEN_COST,
          balanceAfter: wallet.balance - EMAIL_TOKEN_COST,
          description: `Email account created: ${address}`,
          metadata:    { address, domainId: domain.id },
        },
      }),
    ])

    return NextResponse.json({ email: emailAccount }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/emails]', error)

    // Surface Zoho-specific errors clearly
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('Zoho')) {
      return NextResponse.json({ error: message }, { status: 502 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const user = await getOrCreateUser(clerkId)

    const email = await prisma.emailAccount.findFirst({ where: { id, userId: user.id } })
    if (!email) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Delete from Zoho if we have the account ID
    if (email.zohoAccountId) {
      try {
        await deleteZohoAccount(email.zohoAccountId)
      } catch (err) {
        console.error('[Zoho deleteAccount]', err instanceof Error ? err.message : err)
        // Continue deletion from DB even if Zoho call fails
      }
    }

    await prisma.emailAccount.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/emails]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

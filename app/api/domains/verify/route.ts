// ─────────────────────────────────────────────────────────────────────────────
// app/api/domains/verify/route.js
//
// POST /api/domains/verify  — check TXT record and mark domain as verified
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

/**
 * Looks up TXT records for a domain using Cloudflare DNS over HTTPS.
 * @param {string} name - DNS name to query (e.g. "_velocitysites-verify.myshop.com")
 * @returns {Promise<string[]>} Array of TXT record values
 */
async function lookupTxt(name: string): Promise<string[]> {
  const res = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`,
    { headers: { Accept: 'application/dns-json' } }
  )
  if (!res.ok) return []
  const data = await res.json() as { Answer?: Array<{ type: number; data: string }> }
  return (data.Answer ?? [])
    .filter((r) => r.type === 16) // 16 = TXT
    .map((r) => r.data.replace(/^"|"$/g, '').replace(/"\s*"/g, '')) // strip quotes
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const { id } = body

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const user = await getOrCreateUser(clerkId)

    const domain = await prisma.domain.findFirst({
      where: { id, userId: user.id },
    })

    if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    if (domain.verified) return NextResponse.json({ verified: true, alreadyVerified: true })

    // Check TXT record: _velocitysites-verify.<domain>
    const txtName = `_velocitysites-verify.${domain.domain}`
    const records = await lookupTxt(txtName)

    const found = records.some((r: string) => r === domain.verificationToken)

    if (!found) {
      return NextResponse.json({
        verified: false,
        message:  `TXT record not found yet. DNS can take up to 24h to propagate.`,
        checked:  txtName,
        expected: domain.verificationToken,
        found:    records,
      })
    }

    // Mark as verified
    const updated = await prisma.domain.update({
      where: { id: domain.id },
      data:  { verified: true, verifiedAt: new Date() },
      select: { id: true, domain: true, verified: true, verifiedAt: true },
    })

    return NextResponse.json({ verified: true, domain: updated })
  } catch (error) {
    console.error('[POST /api/domains/verify]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

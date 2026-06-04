// ─────────────────────────────────────────────────────────────────────────────
// app/api/domains/verify/route.ts
//
// POST /api/domains/verify  — check TXT record and mark domain as verified
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import { addDomainToProject } from '@/lib/vercel'

interface DohAnswer {
  type: number
  data: string
}

interface DohResponse {
  Answer?: DohAnswer[]
}

async function lookupTxt(name: string): Promise<string[]> {
  const res = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`,
    { headers: { Accept: 'application/dns-json' } }
  )
  if (!res.ok) return []
  const data = (await res.json()) as DohResponse
  return (data.Answer ?? [])
    .filter((r) => r.type === 16)
    .map((r) => r.data.replace(/^"|"$/g, '').replace(/"\s*"/g, ''))
}

interface VerifyBody {
  id?: string
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = (await request.json().catch(() => ({}))) as VerifyBody
    const { id } = body

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const user = await getOrCreateUser(clerkId)

    const domain = await prisma.domain.findFirst({
      where:   { id, userId: user.id },
      include: { website: { select: { vercelProjectId: true } } },
    })

    if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    if (domain.verified) return NextResponse.json({ verified: true, alreadyVerified: true })

    const txtName = `_velocitysites-verify.${domain.domain}`
    const records = await lookupTxt(txtName)

    const found = records.some((r) => r === domain.verificationToken)

    if (!found) {
      return NextResponse.json({
        verified: false,
        message:  `TXT record not found yet. DNS can take up to 24h to propagate.`,
        checked:  txtName,
        expected: domain.verificationToken,
        found:    records,
      })
    }

    const updated = await prisma.domain.update({
      where: { id: domain.id },
      data:  { verified: true, verifiedAt: new Date() },
      select: { id: true, domain: true, verified: true, verifiedAt: true },
    })

    // Add both root and www to the linked Vercel project (best-effort)
    const projectId = domain.website?.vercelProjectId
    if (projectId) {
      try {
        await Promise.allSettled([
          addDomainToProject(projectId, domain.domain),
          addDomainToProject(projectId, `www.${domain.domain}`),
        ])
      } catch { /* non-fatal — domain is verified in DB regardless */ }
    }

    return NextResponse.json({ verified: true, domain: updated })
  } catch (error) {
    console.error('[POST /api/domains/verify]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

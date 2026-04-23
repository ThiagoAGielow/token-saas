// ─── Domains page — async Server Component ────────────────────────────────────
// Fetches websites + custom domains in parallel on the server.
// All interactive UI is in DomainsClient.
// ─────────────────────────────────────────────────────────────────────────────

import { auth }            from '@clerk/nextjs/server'
import { redirect }        from 'next/navigation'
import { prisma }          from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import DomainsClient       from './DomainsClient'
import type { Website, CustomDomain } from '@/types/dashboard'

export default async function DomainsPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user = await getOrCreateUser(clerkId)

  const [websiteRows, domainRows] = await Promise.all([
    prisma.website.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select:  { id: true, name: true, subdomain: true, status: true, createdAt: true },
    }),
    prisma.domain.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select:  { id: true, domain: true, verified: true, verificationToken: true, verifiedAt: true, createdAt: true, websiteId: true },
    }),
  ])

  const sites: Website[] = websiteRows.map((w) => ({
    ...w,
    status:    w.status as Website['status'],
    createdAt: w.createdAt.toISOString(),
  }))

  const domains: CustomDomain[] = domainRows.map((d) => ({
    ...d,
    verificationToken: d.verificationToken ?? '',
    verifiedAt:        d.verifiedAt?.toISOString() ?? null,
    createdAt:         d.createdAt.toISOString(),
    websiteId:         d.websiteId ?? null,
  }))

  return <DomainsClient initialSites={sites} initialDomains={domains} />
}


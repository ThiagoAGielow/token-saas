// ─── Emails page — async Server Component ─────────────────────────────────────
// Fetches emails, verified domains, and wallet balance in parallel on the server.
// All interactive UI is in EmailsClient.
// ─────────────────────────────────────────────────────────────────────────────

import { auth }            from '@clerk/nextjs/server'
import { redirect }        from 'next/navigation'
import { prisma }          from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import { getBalance }      from '@/lib/tokens'
import EmailsClient        from './EmailsClient'
import type { CustomDomain, EmailAccount } from '@/types/dashboard'

export default async function EmailsPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user = await getOrCreateUser(clerkId)

  const [emailRows, domainRows, balance] = await Promise.all([
    prisma.emailAccount.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select:  {
        id: true, address: true, domainId: true, zohoAccountId: true,
        tokenCost: true, createdAt: true,
        domain: { select: { domain: true, verified: true } },
      },
    }),
    prisma.domain.findMany({
      where:   { userId: user.id, verified: true },
      orderBy: { createdAt: 'desc' },
      select:  { id: true, domain: true, verified: true, verificationToken: true, verifiedAt: true, createdAt: true, websiteId: true },
    }),
    getBalance(user.id),
  ])

  const emails: EmailAccount[] = emailRows.map((e) => ({
    ...e,
    zohoAccountId: e.zohoAccountId ?? null,
    createdAt:     e.createdAt.toISOString(),
  }))

  const domains: CustomDomain[] = domainRows.map((d) => ({
    ...d,
    verificationToken: d.verificationToken ?? '',
    verifiedAt:        d.verifiedAt?.toISOString() ?? null,
    createdAt:         d.createdAt.toISOString(),
    websiteId:         d.websiteId ?? null,
  }))

  return <EmailsClient initialEmails={emails} initialDomains={domains} initialBalance={balance} />
}


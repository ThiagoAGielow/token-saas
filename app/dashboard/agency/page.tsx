import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { getOrCreateUser } from '@/lib/user'
import { prisma } from '@/lib/db'
import AgencyClientShell from './AgencyClient'
import type { AgencyClient, AgencyInvite } from '@/types/dashboard'

export default async function AgencyPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user     = await getOrCreateUser(clerkId)
  const isAgency = user.role === UserRole.AGENCY

  let clients: AgencyClient[] = []
  let invites: AgencyInvite[] = []

  if (isAgency) {
    const [links, rawInvites] = await Promise.all([
      prisma.agencyClient.findMany({
        where:   { agencyId: user.id },
        include: {
          client: {
            select: {
              id:       true,
              name:     true,
              email:    true,
              createdAt: true,
              wallet:   { select: { balance: true, lifetimeSpent: true } },
              _count:   { select: { websites: true, domains: true, emailAccounts: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.agencyInvite.findMany({
        where:   { agencyId: user.id },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    clients = links.map((l) => ({
      linkedAt:  l.createdAt.toISOString(),
      id:        l.client.id,
      name:      l.client.name,
      email:     l.client.email,
      createdAt: l.client.createdAt.toISOString(),
      wallet:    l.client.wallet,
      _count:    l.client._count,
    }))

    invites = rawInvites.map((i) => ({
      id:        i.id,
      email:     i.email,
      token:     i.token,
      usedAt:    i.usedAt?.toISOString() ?? null,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    }))
  }

  return (
    <AgencyClientShell
      isAgency={isAgency}
      initialClients={clients}
      initialInvites={invites}
    />
  )
}


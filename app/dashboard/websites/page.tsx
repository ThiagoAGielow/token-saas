import { auth }             from '@clerk/nextjs/server'
import { redirect }         from 'next/navigation'
import { prisma }           from '@/lib/db'
import { getOrCreateUser }  from '@/lib/user'
import WebsitesClient       from './WebsitesClient'
import type { Website }     from '@/types/dashboard'

export default async function WebsitesPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user = await getOrCreateUser(clerkId)

  const [websites, wallet] = await Promise.all([
    prisma.website.findMany({
      where:   { userId: user.id },
      select: {
        id:              true,
        name:            true,
        subdomain:       true,
        status:          true,
        tokenCost:       true,
        prompt:          true,
        githubRepo:      true,
        githubRepoUrl:   true,
        vercelProjectId: true,
        vercelUrl:       true,
        publishedAt:     true,
        createdAt:       true,
        updatedAt:       true,
        domain: { select: { domain: true, verified: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tokenWallet.findUnique({
      where:  { userId: user.id },
      select: { balance: true },
    }),
  ])

  // Prisma returns Date objects — serialize to strings for client props
  const serialized: Website[] = websites.map(w => ({
    ...w,
    status:      w.status as Website['status'],
    publishedAt: w.publishedAt?.toISOString() ?? null,
    createdAt:   w.createdAt.toISOString(),
    updatedAt:   w.updatedAt.toISOString(),
  }))

  return <WebsitesClient initialWebsites={serialized} initialBalance={wallet?.balance ?? 0} />
}

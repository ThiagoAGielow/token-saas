// GET /api/agency/clients — list all clients linked to the agency
export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

export async function GET(): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const user = await getOrCreateUser(clerkId)
    if (user.role !== UserRole.AGENCY) {
      return NextResponse.json({ error: 'Agency account required' }, { status: 403 })
    }

    const links = await prisma.agencyClient.findMany({
      where: { agencyId: user.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            wallet: { select: { balance: true, lifetimeSpent: true } },
            _count: {
              select: {
                websites: true,
                domains: true,
                emailAccounts: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const clients = links.map((l) => ({
      linkedAt: l.createdAt,
      ...l.client,
    }))

    return NextResponse.json({ clients })
  } catch (error) {
    console.error('[GET /api/agency/clients]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/openrouter-keys/provision
// Manually triggers OpenRouter key provisioning for the current user.
// Needed for users who signed up before OPENROUTER_PROVISIONER_KEY was set,
// or whose key was deactivated.

export const dynamic = 'force-dynamic'

import { auth }                                  from '@clerk/nextjs/server'
import { NextResponse }                          from 'next/server'
import { prisma }                                from '@/lib/db'
import { getOrCreateUser, provisionOpenRouterKey } from '@/lib/user'

export async function POST(): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const user = await getOrCreateUser(clerkId)

    await provisionOpenRouterKey(user.id, user.name ?? user.email)

    const key = await prisma.openRouterProvisionedKey.findUnique({
      where:  { userId: user.id },
      select: {
        id: true, keyHint: true, name: true,
        limitUsd: true, usedUsd: true, isActive: true,
        lastSyncAt: true, createdAt: true, updatedAt: true,
      },
    })

    if (!key) {
      return NextResponse.json(
        { error: 'Provisioning failed — ensure OPENROUTER_PROVISIONER_KEY is set in Vercel' },
        { status: 500 },
      )
    }

    return NextResponse.json({ key })
  } catch (error) {
    console.error('[POST /api/openrouter-keys/provision]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

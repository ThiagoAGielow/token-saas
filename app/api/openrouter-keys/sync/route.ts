// POST /api/openrouter-keys/sync
// Calls GET /api/v1/key on OpenRouter with the user's provisioned key
// to pull live usage stats, then updates usedUsd + lastSyncAt in the DB.

export const dynamic = 'force-dynamic'

import { auth }            from '@clerk/nextjs/server'
import { NextResponse }    from 'next/server'
import { prisma }          from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import { decrypt }         from '@/lib/encryption'

interface OpenRouterKeyData {
  data?: {
    usage?: number
    limit?: number | null
    limit_remaining?: number | null
    label?: string
  }
}

export async function POST(): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const user = await getOrCreateUser(clerkId)

    const provisionedKey = await prisma.openRouterProvisionedKey.findUnique({
      where: { userId: user.id },
    })

    if (!provisionedKey?.isActive) {
      return NextResponse.json({ error: 'No active OpenRouter key found' }, { status: 404 })
    }

    const rawKey = decrypt(provisionedKey.encryptedKey)

    const res = await fetch('https://openrouter.ai/api/v1/key', {
      headers: { Authorization: `Bearer ${rawKey}` },
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[sync] OpenRouter API error:', res.status, text)
      return NextResponse.json({ error: 'Failed to fetch usage from OpenRouter' }, { status: 502 })
    }

    const json = await res.json() as OpenRouterKeyData
    const usedUsd  = json.data?.usage       ?? provisionedKey.usedUsd
    const limitUsd = json.data?.limit       ?? provisionedKey.limitUsd

    const updated = await prisma.openRouterProvisionedKey.update({
      where: { userId: user.id },
      data:  { usedUsd, limitUsd, lastSyncAt: new Date() },
      select: {
        id: true, keyHint: true, name: true,
        limitUsd: true, usedUsd: true, isActive: true,
        lastSyncAt: true, createdAt: true, updatedAt: true,
      },
    })

    return NextResponse.json({ key: updated })
  } catch (error) {
    console.error('[POST /api/openrouter-keys/sync]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// app/api/ai-keys/route.ts
//
// GET    /api/ai-keys              — list connected AI keys (masked, no raw key)
// POST   /api/ai-keys              — save or replace an AI key (encrypted)
// DELETE /api/ai-keys?provider=X  — remove an AI key
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { User } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import { encrypt } from '@/lib/encryption'
import type { AIProvider } from '@/lib/ai'

const VALID_PROVIDERS: readonly AIProvider[] = ['claude', 'openai', 'gemini']

function isValidProvider(x: unknown): x is AIProvider {
  return typeof x === 'string' && (VALID_PROVIDERS as readonly string[]).includes(x)
}

async function getInternalUser(): Promise<User | null> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null
  return getOrCreateUser(clerkId)
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getInternalUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const keys = await prisma.userAiKey.findMany({
      where:   { userId: user.id },
      select: {
        id:        true,
        provider:  true,
        keyHint:   true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { provider: 'asc' },
    })

    return NextResponse.json({ keys })
  } catch (error) {
    console.error('[GET /api/ai-keys]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────

interface SaveKeyBody {
  provider?: unknown
  key?: unknown
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getInternalUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = (await request.json()) as SaveKeyBody
    const { provider, key } = body

    if (!isValidProvider(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` },
        { status: 400 }
      )
    }

    if (typeof key !== 'string' || key.trim().length < 10) {
      return NextResponse.json(
        { error: 'Key must be at least 10 characters' },
        { status: 400 }
      )
    }

    const trimmedKey   = key.trim()
    const encryptedKey = encrypt(trimmedKey)
    const keyHint      = trimmedKey.slice(-4)

    const saved = await prisma.userAiKey.upsert({
      where:  { userId_provider: { userId: user.id, provider } },
      update: { encryptedKey, keyHint },
      create: { userId: user.id, provider, encryptedKey, keyHint },
      select: { id: true, provider: true, keyHint: true, updatedAt: true },
    })

    return NextResponse.json({ key: saved }, { status: 200 })
  } catch (error) {
    console.error('[POST /api/ai-keys]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const user = await getInternalUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    if (!isValidProvider(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` },
        { status: 400 }
      )
    }

    await prisma.userAiKey.deleteMany({
      where: { userId: user.id, provider },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/ai-keys]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

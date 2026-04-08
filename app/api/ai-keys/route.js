// ─────────────────────────────────────────────────────────────────────────────
// app/api/ai-keys/route.js
//
// GET    /api/ai-keys              — list connected AI keys (masked, no raw key)
// POST   /api/ai-keys              — save or replace an AI key (encrypted)
// DELETE /api/ai-keys?provider=X  — remove an AI key
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/encryption'

const VALID_PROVIDERS = ['claude', 'openai', 'gemini']

// ─── Shared: resolve internal user from Clerk session ────────────────────────

async function getInternalUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null

  return prisma.user.findUnique({
    where:  { clerkId },
    select: { id: true },
  })
}

// ─── GET /api/ai-keys ─────────────────────────────────────────────────────────

/**
 * Returns the list of AI keys the user has connected.
 * The encrypted key is never returned — only provider, hint, and timestamps.
 */
export async function GET() {
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

// ─── POST /api/ai-keys ────────────────────────────────────────────────────────

/**
 * Saves or replaces the user's API key for a given AI provider.
 *
 * Body: { provider: 'claude' | 'openai' | 'gemini', key: 'sk-ant-...' }
 *
 * The raw key is encrypted before storage and never stored in plaintext.
 */
export async function POST(request) {
  try {
    const user = await getInternalUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await request.json()
    const { provider, key } = body

    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` },
        { status: 400 }
      )
    }

    if (!key || typeof key !== 'string' || key.trim().length < 10) {
      return NextResponse.json(
        { error: 'Key must be at least 10 characters' },
        { status: 400 }
      )
    }

    const trimmedKey  = key.trim()
    const encryptedKey = encrypt(trimmedKey)
    const keyHint     = trimmedKey.slice(-4) // last 4 chars for display

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

// ─── DELETE /api/ai-keys ──────────────────────────────────────────────────────

/**
 * Removes the user's stored key for the given provider.
 * Query param: ?provider=claude
 */
export async function DELETE(request) {
  try {
    const user = await getInternalUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    if (!VALID_PROVIDERS.includes(provider)) {
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

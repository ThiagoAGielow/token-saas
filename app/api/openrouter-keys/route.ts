// ─────────────────────────────────────────────────────────────────────────────
// app/api/openrouter-keys/route.ts
//
// GET    /api/openrouter-keys  — get current provisioned key (masked display)
// POST   /api/openrouter-keys  — 405: keys are auto-provisioned on signup
// DELETE /api/openrouter-keys  — deactivate key
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

import { auth }            from '@clerk/nextjs/server'
import { NextResponse }    from 'next/server'
import { prisma }          from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const user = await getOrCreateUser(clerkId)

    const key = await prisma.openRouterProvisionedKey.findUnique({
      where:  { userId: user.id },
      select: {
        id:          true,
        keyHint:     true,
        name:        true,
        limitUsd:    true,
        usedUsd:     true,
        isActive:    true,
        lastSyncAt:  true,
        createdAt:   true,
        updatedAt:   true,
      },
    })

    return NextResponse.json({ key })
  } catch (error) {
    console.error('[GET /api/openrouter-keys]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST — disabled ─────────────────────────────────────────────────────────
// Keys are automatically provisioned when a user signs up.
// Clients may not create their own OpenRouter keys.

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'OpenRouter keys are provisioned automatically on signup. Manual creation is not allowed.' },
    { status: 405 },
  )
}

// ─── DELETE — deactivate key ──────────────────────────────────────────────────

export async function DELETE(): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const user = await getOrCreateUser(clerkId)

    await prisma.openRouterProvisionedKey.updateMany({
      where: { userId: user.id },
      data:  { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/openrouter-keys]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

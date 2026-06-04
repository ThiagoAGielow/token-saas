// ─────────────────────────────────────────────────────────────────────────────
// lib/user.ts — Resolve (or create) the internal User record for a Clerk user
// ─────────────────────────────────────────────────────────────────────────────

import { currentUser } from '@clerk/nextjs/server'
import type { User } from '@prisma/client'
import { prisma } from './db'
import { redis, TTL, userKey } from './redis'
import { encrypt } from './encryption'

/**
 * Generates a short, unique referral code like "JOHN4X2K".
 */
function generateReferralCode(name: string): string {
  const prefix = (name || 'USER').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 5)
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${suffix}`
}

/**
 * Calls the OpenRouter Management API to create a provisioned sub-key for a
 * newly-created user, then stores it (AES-256-GCM encrypted) in the DB.
 *
 * Fire-and-forget — a failure here must never block the signup flow.
 * Requires OPENROUTER_PROVISIONER_KEY env var (a Management API key).
 */
export async function provisionOpenRouterKey(userId: string, userName: string): Promise<void> {
  const provisionerKey = process.env.OPENROUTER_PROVISIONER_KEY
  if (!provisionerKey) {
    console.warn('[provisionOpenRouterKey] OPENROUTER_PROVISIONER_KEY not set — skipping auto-provision')
    return
  }

  // Skip if the user already has a key (idempotent guard)
  const existing = await prisma.openRouterProvisionedKey.findUnique({ where: { userId } })
  if (existing) return

  const keyName = `VelocitySites — ${userName} (${userId.slice(0, 8)})`

  let rawKey: string
  let keyHash: string

  try {
    const res = await fetch('https://openrouter.ai/api/v1/keys', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${provisionerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: keyName }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[provisionOpenRouterKey] OpenRouter API error:', res.status, text)
      return
    }

    const json = (await res.json()) as { key?: string; data?: { hash?: string } }
    if (!json.key || !json.data?.hash) {
      console.error('[provisionOpenRouterKey] Unexpected response shape:', json)
      return
    }

    rawKey  = json.key
    keyHash = json.data.hash
  } catch (err) {
    console.error('[provisionOpenRouterKey] Network error:', err)
    return
  }

  const encryptedKey = encrypt(rawKey)
  const keyHint      = rawKey.slice(-4)

  await prisma.openRouterProvisionedKey.upsert({
    where:  { userId },
    update: { encryptedKey, keyHint, keyHash, name: keyName, isActive: true },
    create: { userId, encryptedKey, keyHint, keyHash, name: keyName },
  })
}

/**
 * Returns the internal User record for the currently authenticated Clerk user.
 * Creates one on first call (lazy signup) if it doesn't exist yet.
 */
export async function getOrCreateUser(clerkId: string): Promise<User> {
  // L1 cache — Redis (skips the DB entirely on cache hit)
  try {
    const cached = await redis.get<User>(userKey(clerkId))
    if (cached) return cached
  } catch {
    // Redis unavailable — fall through to DB
  }

  // Fast path — user already exists in DB
  const existing = await prisma.user.findUnique({ where: { clerkId } })
  if (existing) {
    try { await redis.setex(userKey(clerkId), TTL.USER, JSON.stringify(existing)) } catch { /* ignore */ }
    return existing
  }

  // First time — fetch Clerk profile and create the record
  const clerkUser = await currentUser()
  const email =
    clerkUser?.emailAddresses?.[0]?.emailAddress ?? `${clerkId}@unknown.invalid`
  const name =
    clerkUser?.fullName ??
    clerkUser?.firstName ??
    email.split('@')[0] ??
    'USER'

  // Retry loop handles the rare case where two concurrent requests both
  // miss the findUnique above and race to insert.
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const user = await prisma.user.create({
        data: {
          clerkId,
          email,
          name,
          referralCode: generateReferralCode(name),
          // Grant 100 free tokens on signup
          wallet: {
            create: {
              balance:        100,
              lifetimeEarned: 100,
              lifetimeSpent:  0,
            },
          },
        },
      })

      // Record the welcome grant in the ledger
      await prisma.tokenGrant.create({
        data: {
          userId:    user.id,
          amount:    100,
          source:    'TRIAL',
          remaining: 100,
          expiresAt: null,
        },
      })
      await prisma.tokenTransaction.create({
        data: {
          userId:      user.id,
          type:        'TRIAL_GRANT',
          amount:      100,
          balanceAfter: 100,
          description:  'Welcome bonus — 100 free tokens',
        },
      })

      try { await redis.setex(userKey(clerkId), TTL.USER, JSON.stringify(user)) } catch { /* ignore */ }

      // Auto-provision an OpenRouter key for this new user (fire-and-forget)
      provisionOpenRouterKey(user.id, name).catch(err =>
        console.error('[getOrCreateUser] provisionOpenRouterKey failed silently:', err)
      )

      return user
    } catch (err) {
      lastError = err
      // P2002 = unique constraint violation — another request won the race
      if ((err as { code?: string })?.code === 'P2002') {
        const found = await prisma.user.findUnique({ where: { clerkId } })
        if (found) return found
      }
      if (attempt === 2) throw err
    }
  }
  throw lastError ?? new Error('getOrCreateUser: failed to create user')
}

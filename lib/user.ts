// ─────────────────────────────────────────────────────────────────────────────
// lib/user.ts — Resolve (or create) the internal User record for a Clerk user
// ─────────────────────────────────────────────────────────────────────────────

import { currentUser } from '@clerk/nextjs/server'
import type { User } from '@prisma/client'
import { prisma } from './db'

/**
 * Generates a short, unique referral code like "JOHN4X2K".
 */
function generateReferralCode(name: string): string {
  const prefix = (name || 'USER').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 5)
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${suffix}`
}

/**
 * Returns the internal User record for the currently authenticated Clerk user.
 * Creates one on first call (lazy signup) if it doesn't exist yet.
 */
export async function getOrCreateUser(clerkId: string): Promise<User> {
  // Fast path — user already exists
  const existing = await prisma.user.findUnique({ where: { clerkId } })
  if (existing) return existing

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

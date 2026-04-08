// ─────────────────────────────────────────────────────────────────────────────
// lib/user.js — Resolve (or create) the internal User record for a Clerk user
// ─────────────────────────────────────────────────────────────────────────────

import { currentUser } from '@clerk/nextjs/server'
import { prisma } from './db.js'

/**
 * Generates a short, unique referral code like "JOHN4X2K".
 * @param {string} name
 * @returns {string}
 */
function generateReferralCode(name) {
  const prefix = (name || 'USER').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 5)
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${suffix}`
}

/**
 * Returns the internal User record for the currently authenticated Clerk user.
 * Creates one on first call (lazy signup) if it doesn't exist yet.
 *
 * @param {string} clerkId - from `const { userId } = await auth()`
 * @returns {Promise<import('@prisma/client').User>}
 */
export async function getOrCreateUser(clerkId) {
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
    email.split('@')[0]

  // Retry loop handles the rare case where two concurrent requests both
  // miss the findUnique above and race to insert.
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
      // P2002 = unique constraint violation — another request won the race
      if (err?.code === 'P2002') {
        const found = await prisma.user.findUnique({ where: { clerkId } })
        if (found) return found
      }
      if (attempt === 2) throw err
    }
  }
}

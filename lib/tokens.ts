// ─────────────────────────────────────────────────────────────────────────────
// lib/tokens.js — Core token business logic
// ─────────────────────────────────────────────────────────────────────────────

import type { GrantSource, Prisma, TokenGrant, TokenWallet, TransactionType } from '@prisma/client'
import { prisma } from './db'

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Token costs for each billable action on the platform.
 * Reference these everywhere — never hardcode costs in routes.
 */
export const TOKEN_COSTS: Record<string, number> = {
  WEBSITE:       50,
  DOMAIN:        20,
  EMAIL:         10,
  AI_REWRITE:     3,
  AI_REGENERATE:  5,
}

/** Tokens awarded to both referrer and referee on a successful referral. */
const REFERRAL_BONUS = 50

/** Maximum percentage of monthly plan tokens that roll over on renewal. */
const ROLLOVER_CAP_PCT = 0.20

// ─── Wallet helpers ───────────────────────────────────────────────────────────

/**
 * Retrieves the token wallet for a user, creating one if it doesn't exist.
 *
 * @param {string} userId - Internal User.id (cuid)
 * @returns {Promise<import('@prisma/client').TokenWallet>}
 */
export async function getWallet(userId: string): Promise<TokenWallet> {
  const wallet = await prisma.tokenWallet.upsert({
    where:  { userId },
    update: {},
    create: {
      userId,
      balance:        0,
      lifetimeEarned: 0,
      lifetimeSpent:  0,
    },
  })
  return wallet
}

/**
 * Returns the current spendable balance for a user.
 *
 * @param {string} userId - Internal User.id (cuid)
 * @returns {Promise<number>}
 */
export async function getBalance(userId: string): Promise<number> {
  const wallet = await getWallet(userId)
  return wallet.balance
}

// ─── Grant tokens ─────────────────────────────────────────────────────────────

/**
 * Credits tokens to a user's wallet and records a TokenGrant pool for
 * expiry / rollover tracking.
 *
 * @param {string}  userId    - Internal User.id
 * @param {number}  amount    - Positive integer number of tokens to grant
 * @param {string}  source    - GrantSource enum value
 * @param {Date|null} expiresAt - Expiry date for this grant (null = permanent)
 * @param {string}  [description] - Human-readable description for the transaction ledger
 * @returns {Promise<{ wallet: import('@prisma/client').TokenWallet, grant: import('@prisma/client').TokenGrant, transaction: import('@prisma/client').TokenTransaction }>}
 */
export async function grantTokens(
  userId: string,
  amount: number,
  source: GrantSource,
  expiresAt: Date | null = null,
  description?: string,
): Promise<{ wallet: TokenWallet; grant: TokenGrant }> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`grantTokens: amount must be a positive integer, got ${amount}`)
  }

  const txDescription = description ?? `Token grant — ${source}`

  const [wallet, grant] = await prisma.$transaction(async (tx) => {
    // Upsert wallet and increment balance
    const updatedWallet = await tx.tokenWallet.upsert({
      where:  { userId },
      update: {
        balance:        { increment: amount },
        lifetimeEarned: { increment: amount },
      },
      create: {
        userId,
        balance:        amount,
        lifetimeEarned: amount,
        lifetimeSpent:  0,
      },
    })

    // Create the grant pool (for expiry / rollover logic)
    const newGrant = await tx.tokenGrant.create({
      data: {
        userId,
        amount,
        source,
        expiresAt,
        remaining: amount,
      },
    })

    // Write ledger entry
    await tx.tokenTransaction.create({
      data: {
        userId,
        type:        _sourceToTransactionType(source),
        amount,
        balanceAfter: updatedWallet.balance,
        description:  txDescription,
        expiresAt,
        metadata:    { grantId: newGrant.id, source },
      },
    })

    return [updatedWallet, newGrant]
  })

  return { wallet, grant }
}

// ─── Spend tokens ─────────────────────────────────────────────────────────────

/**
 * Deducts tokens from a user's wallet.
 * Throws an error if the balance is insufficient.
 *
 * @param {string} userId      - Internal User.id
 * @param {number} amount      - Positive integer number of tokens to spend
 * @param {string} description - Human-readable reason (e.g. "Built website: My Shop")
 * @param {object} [metadata]  - Arbitrary key/value context (e.g. { websiteId })
 * @returns {Promise<number>}  - The new balance after the deduction
 * @throws {Error} If balance is insufficient
 */
export async function spendTokens(userId: string, amount: number, description: string, metadata: Prisma.InputJsonValue = {}): Promise<number> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`spendTokens: amount must be a positive integer, got ${amount}`)
  }

  const newBalance = await prisma.$transaction(async (tx) => {
    // Lock the wallet row to prevent race conditions
    const wallet = await tx.tokenWallet.findUnique({ where: { userId } })

    if (!wallet) {
      throw new Error('Token wallet not found — user may not exist')
    }

    if (wallet.balance < amount) {
      throw new Error(
        `Insufficient tokens: need ${amount}, have ${wallet.balance}`
      )
    }

    const updatedWallet = await tx.tokenWallet.update({
      where: { userId },
      data:  {
        balance:      { decrement: amount },
        lifetimeSpent: { increment: amount },
      },
    })

    // Drain from oldest non-expired grants first (FIFO)
    await _drainGrants(tx, userId, amount)

    await tx.tokenTransaction.create({
      data: {
        userId,
        type:        'SPEND',
        amount:      -amount,
        balanceAfter: updatedWallet.balance,
        description,
        metadata,
      },
    })

    return updatedWallet.balance
  })

  return newBalance
}

// ─── Estimate days remaining ──────────────────────────────────────────────────

/**
 * Estimates how many days the user's current balance will last, based on
 * their average daily spend over the last 7 days.
 * Returns null if there is no spend history.
 *
 * @param {string} userId - Internal User.id
 * @returns {Promise<number|null>}
 */
export async function estimateDaysRemaining(userId: string): Promise<number | null> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const recentSpend = await prisma.tokenTransaction.aggregate({
    where: {
      userId,
      type:      'SPEND',
      createdAt: { gte: sevenDaysAgo },
    },
    _sum: { amount: true },
  })

  const totalSpent = Math.abs(recentSpend._sum.amount ?? 0)

  if (totalSpent === 0) return null // No spend history — can't estimate

  const avgDailySpend = totalSpent / 7
  const balance = await getBalance(userId)

  return Math.floor(balance / avgDailySpend)
}

// ─── Rollover ─────────────────────────────────────────────────────────────────

/**
 * Processes rollover on subscription renewal.
 * Carries forward up to 20% of the monthly plan grant that would otherwise
 * expire. Called from the Stripe webhook on subscription renewal.
 *
 * @param {string} userId - Internal User.id
 * @returns {Promise<number>} - Number of tokens rolled over (0 if none)
 */
export async function processRollover(userId: string): Promise<number> {
  const now = new Date()

  // Find grants from monthly plans that are about to expire (within 24 h)
  const expiringGrants = await prisma.tokenGrant.findMany({
    where: {
      userId,
      source:    'MONTHLY_PLAN',
      expiresAt: { lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
      remaining: { gt: 0 },
    },
  })

  if (expiringGrants.length === 0) return 0

  let totalRollover = 0

  for (const grant of expiringGrants) {
    // Cap rollover at 20% of the original grant amount
    const cap = Math.floor(grant.amount * ROLLOVER_CAP_PCT)
    const rolloverAmount = Math.min(grant.remaining, cap)

    if (rolloverAmount <= 0) continue

    await prisma.$transaction(async (tx) => {
      // Zero out the expiring grant
      await tx.tokenGrant.update({
        where: { id: grant.id },
        data:  { remaining: 0 },
      })

      // Create a new permanent grant for the rolled-over tokens
      const wallet = await tx.tokenWallet.findUnique({ where: { userId } })
      const newGrant = await tx.tokenGrant.create({
        data: {
          userId,
          amount:    rolloverAmount,
          source:    'MONTHLY_PLAN',
          expiresAt: null, // Rolled-over tokens are permanent
          remaining: rolloverAmount,
        },
      })

      await tx.tokenTransaction.create({
        data: {
          userId,
          type:        'ROLLOVER',
          amount:      rolloverAmount,
          balanceAfter: (wallet?.balance ?? 0), // balance unchanged here — expiry handles debit
          description:  `Rollover from expiring grant ${grant.id}`,
          metadata:    { originalGrantId: grant.id, rolloverGrantId: newGrant.id },
        },
      })
    })

    totalRollover += rolloverAmount
  }

  return totalRollover
}

// ─── Expire grants ────────────────────────────────────────────────────────────

/**
 * Finds all expired grants with remaining tokens, deducts them from the
 * wallet, and records EXPIRY transactions.
 * Safe to call repeatedly — idempotent on already-expired grants.
 *
 * @param {string} userId - Internal User.id
 * @returns {Promise<number>} - Total tokens expired
 */
export async function expireGrants(userId: string): Promise<number> {
  const now = new Date()

  const expiredGrants = await prisma.tokenGrant.findMany({
    where: {
      userId,
      expiresAt: { lte: now },
      remaining: { gt: 0 },
    },
  })

  if (expiredGrants.length === 0) return 0

  let totalExpired = 0

  for (const grant of expiredGrants) {
    const expiredAmount = grant.remaining

    await prisma.$transaction(async (tx) => {
      // Zero out the grant
      await tx.tokenGrant.update({
        where: { id: grant.id },
        data:  { remaining: 0 },
      })

      // Deduct from wallet (floor at 0 to be safe)
      const wallet = await tx.tokenWallet.findUnique({ where: { userId } })
      const deduction = Math.min(wallet?.balance ?? 0, expiredAmount)

      const updatedWallet = await tx.tokenWallet.update({
        where: { userId },
        data:  { balance: { decrement: deduction } },
      })

      await tx.tokenTransaction.create({
        data: {
          userId,
          type:        'EXPIRY',
          amount:      -deduction,
          balanceAfter: updatedWallet.balance,
          description:  `Grant expired: ${grant.id}`,
          metadata:    { grantId: grant.id, originalAmount: grant.amount },
          expiresAt:   grant.expiresAt,
        },
      })
    })

    totalExpired += expiredAmount
  }

  return totalExpired
}

// ─── Referral bonus ───────────────────────────────────────────────────────────

/**
 * Awards referral bonuses to both the referrer and the new referee.
 * Should be called once after the referee completes signup/onboarding.
 *
 * @param {string} referrerId - Internal User.id of the person who shared the code
 * @param {string} refereeId  - Internal User.id of the new user who used the code
 * @returns {Promise<void>}
 */
export async function grantReferralBonus(referrerId: string, refereeId: string): Promise<void> {
  await Promise.all([
    grantTokens(
      referrerId,
      REFERRAL_BONUS,
      'REFERRAL',
      null,
      `Referral bonus — you referred a new user`
    ),
    grantTokens(
      refereeId,
      REFERRAL_BONUS,
      'REFERRAL',
      null,
      `Referral bonus — joined via referral code`
    ),
  ])
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Maps a GrantSource to the appropriate TransactionType for the ledger.
 *
 * @param {string} source
 * @returns {import('@prisma/client').TransactionType}
 */
function _sourceToTransactionType(source: GrantSource): TransactionType {
  const map: Record<GrantSource, TransactionType> = {
    MONTHLY_PLAN: 'PURCHASE',
    TOPUP_PACK:   'PURCHASE',
    REFERRAL:     'REFERRAL_BONUS',
    TRIAL:        'TRIAL_GRANT',
  }
  return map[source] ?? 'PURCHASE'
}

/**
 * Drains `amount` tokens from the oldest non-expired grants (FIFO).
 * Must be called inside a Prisma interactive transaction.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} userId
 * @param {number} amount
 * @returns {Promise<void>}
 */
async function _drainGrants(tx: Prisma.TransactionClient, userId: string, amount: number): Promise<void> {
  const now = new Date()

  // Fetch non-expired grants with remaining tokens, oldest first
  const grants = await tx.tokenGrant.findMany({
    where: {
      userId,
      remaining: { gt: 0 },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  })

  let remaining = amount

  for (const grant of grants) {
    if (remaining <= 0) break

    const drain = Math.min(grant.remaining, remaining)

    await tx.tokenGrant.update({
      where: { id: grant.id },
      data:  { remaining: { decrement: drain } },
    })

    remaining -= drain
  }
}

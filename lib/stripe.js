// ─────────────────────────────────────────────────────────────────────────────
// lib/stripe.js — Stripe client + helpers
// ─────────────────────────────────────────────────────────────────────────────

import Stripe from 'stripe'
import { prisma } from './db.js'

// ─── Stripe client ────────────────────────────────────────────────────────────

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
  typescript:  false,
})

// ─── Plan config ──────────────────────────────────────────────────────────────

/**
 * Platform subscription plans.
 * Token counts and price IDs come from environment variables so they can
 * change without code deploys.
 *
 * @type {Record<string, { name: string, price: number, tokens: number, priceId: string }>}
 */
export const PLANS = {
  STARTER: {
    name:    'Starter',
    price:   29,
    tokens:  2000,
    priceId: process.env.STRIPE_PRICE_MONTHLY_STARTER,
  },
  GROWTH: {
    name:    'Growth',
    price:   79,
    tokens:  8000,
    priceId: process.env.STRIPE_PRICE_MONTHLY_GROWTH,
  },
}

// ─── Token packs config ───────────────────────────────────────────────────────

/**
 * One-time token pack purchases (no subscription).
 * Tokens from packs never expire.
 *
 * @type {Array<{ id: string, label: string, price: number, tokens: number, priceId: string, popular?: boolean }>}
 */
export const TOKEN_PACKS = [
  {
    id:      'small',
    label:   'Starter Pack',
    price:   10,
    tokens:  500,
    priceId: process.env.STRIPE_PRICE_PACK_SMALL,
  },
  {
    id:      'medium',
    label:   'Growth Pack',
    price:   25,
    tokens:  1500,
    priceId: process.env.STRIPE_PRICE_PACK_MEDIUM,
    popular: true,
  },
  {
    id:      'large',
    label:   'Pro Pack',
    price:   50,
    tokens:  3500,
    priceId: process.env.STRIPE_PRICE_PACK_LARGE,
  },
  {
    id:      'xl',
    label:   'Agency Pack',
    price:   100,
    tokens:  8000,
    priceId: process.env.STRIPE_PRICE_PACK_XL,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Finds or creates a Stripe Customer for the given user.
 * Stores the customerId on the User record for future use.
 *
 * @param {string} userId - Internal User.id (cuid)
 * @param {string} email  - User's email address
 * @returns {Promise<string>} - Stripe customer ID (cus_xxx)
 */
export async function getOrCreateStripeCustomer(userId, email) {
  // Check if we already have a customer ID stored
  // (We store it as metadata on Stripe so we can look it up without a DB column)
  const existing = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1,
  })

  if (existing.data.length > 0) {
    return existing.data[0].id
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  })

  return customer.id
}

/**
 * Creates a Stripe Checkout Session for a token pack or subscription plan.
 *
 * @param {string} userId   - Internal User.id
 * @param {string} priceId  - Stripe Price ID
 * @param {'payment'|'subscription'} mode - 'payment' for packs, 'subscription' for plans
 * @param {string} email    - User email (used for customer lookup/creation)
 * @returns {Promise<Stripe.Checkout.Session>}
 */
export async function createCheckoutSession(userId, priceId, mode, email) {
  const customerId = await getOrCreateStripeCustomer(userId, email)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    customer:   customerId,
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/tokens?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${appUrl}/dashboard/tokens?checkout=cancelled`,
    metadata: {
      userId,
      priceId,
    },
    // Collect billing address for invoices
    billing_address_collection: 'auto',
    // Allow promotion codes
    allow_promotion_codes: true,
  })

  return session
}

/**
 * Creates a Stripe Customer Portal session so users can manage their
 * subscription, update payment methods, and download invoices.
 *
 * @param {string} customerId - Stripe Customer ID (cus_xxx)
 * @returns {Promise<Stripe.BillingPortal.Session>}
 */
export async function createCustomerPortalSession(customerId) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.billingPortal.sessions.create({
    customer:    customerId,
    return_url:  `${appUrl}/dashboard/billing`,
  })

  return session
}

/**
 * Looks up a plan config object by its Stripe Price ID.
 * Returns null if the priceId doesn't match any known plan or pack.
 *
 * @param {string} priceId
 * @returns {{ tokens: number, source: 'MONTHLY_PLAN'|'TOPUP_PACK', plan?: string }|null}
 */
export function resolveTokensFromPriceId(priceId) {
  // Check subscription plans
  for (const [planKey, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) {
      return { tokens: plan.tokens, source: 'MONTHLY_PLAN', plan: planKey }
    }
  }

  // Check token packs
  for (const pack of TOKEN_PACKS) {
    if (pack.priceId === priceId) {
      return { tokens: pack.tokens, source: 'TOPUP_PACK' }
    }
  }

  return null
}

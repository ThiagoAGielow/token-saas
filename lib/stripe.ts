// ─────────────────────────────────────────────────────────────────────────────
// lib/stripe.ts — Stripe client + helpers
// ─────────────────────────────────────────────────────────────────────────────

import Stripe from 'stripe'

// ─── Stripe client ────────────────────────────────────────────────────────────

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey && process.env.NODE_ENV === 'production') {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(secretKey ?? 'sk_test_placeholder', {
  apiVersion: '2024-04-10' as Stripe.LatestApiVersion,
  typescript: true,
})

// ─── Plan config ──────────────────────────────────────────────────────────────

export type PlanKey = 'STARTER' | 'GROWTH'

export interface PlanConfig {
  name:    string
  price:   number
  tokens:  number
  priceId: string | undefined
}

/**
 * Platform subscription plans.
 * Token counts and price IDs come from environment variables so they can
 * change without code deploys.
 */
export const PLANS: Record<PlanKey, PlanConfig> = {
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

export interface TokenPack {
  id:       string
  label:    string
  price:    number
  tokens:   number
  priceId:  string | undefined
  popular?: boolean
}

/**
 * One-time token pack purchases (no subscription).
 * Tokens from packs never expire.
 */
export const TOKEN_PACKS: TokenPack[] = [
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
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
): Promise<string> {
  const existing = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1,
  })

  const first = existing.data[0]
  if (first) return first.id

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  })

  return customer.id
}

/**
 * Creates a Stripe Checkout Session for a token pack or subscription plan.
 */
export async function createCheckoutSession(
  userId: string,
  priceId: string,
  mode: 'payment' | 'subscription',
  email: string,
): Promise<Stripe.Checkout.Session> {
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
    billing_address_collection: 'auto',
    allow_promotion_codes: true,
  })

  return session
}

/**
 * Creates a Stripe Customer Portal session so users can manage their
 * subscription, update payment methods, and download invoices.
 */
export async function createCustomerPortalSession(
  customerId: string,
): Promise<Stripe.BillingPortal.Session> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.billingPortal.sessions.create({
    customer:   customerId,
    return_url: `${appUrl}/dashboard/billing`,
  })

  return session
}

export type ResolvedPrice =
  | { tokens: number; source: 'MONTHLY_PLAN'; plan: PlanKey }
  | { tokens: number; source: 'TOPUP_PACK' }

/**
 * Looks up a plan config object by its Stripe Price ID.
 * Returns null if the priceId doesn't match any known plan or pack.
 */
export function resolveTokensFromPriceId(priceId: string): ResolvedPrice | null {
  for (const [planKey, plan] of Object.entries(PLANS) as Array<[PlanKey, PlanConfig]>) {
    if (plan.priceId === priceId) {
      return { tokens: plan.tokens, source: 'MONTHLY_PLAN', plan: planKey }
    }
  }

  for (const pack of TOKEN_PACKS) {
    if (pack.priceId === priceId) {
      return { tokens: pack.tokens, source: 'TOPUP_PACK' }
    }
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// app/api/webhooks/stripe/route.js
//
// Handles incoming Stripe webhook events.
// Uses raw body + Stripe-Signature header for signature verification.
// ─────────────────────────────────────────────────────────────────────────────

// Edge runtime required for raw body access in Next.js App Router
export const runtime = 'edge'

import Stripe from 'stripe'
import { prisma } from '@/lib/db'
import { grantTokens, processRollover, expireGrants } from '@/lib/tokens'
import { resolveTokensFromPriceId, PLANS } from '@/lib/stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
})

// ─── POST ─────────────────────────────────────────────────────────────────────

/**
 * Stripe sends all events here. We verify the signature and dispatch to
 * the appropriate handler.
 *
 * @param {Request} request
 */
export async function POST(request) {
  // ── Read raw body for signature verification ─────────────────────────────
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event

  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // ── Dispatch event ────────────────────────────────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break

      case 'customer.subscription.updated':
        // This fires on renewal — check if period changed
        await handleSubscriptionRenewed(event.data.object)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break

      default:
        // Ignore unhandled events — return 200 to acknowledge receipt
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      status:  200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, error)
    // Return 200 anyway — Stripe will retry on 5xx, not 4xx
    return new Response(
      JSON.stringify({ received: true, error: error.message }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// ─── Event handlers ───────────────────────────────────────────────────────────

/**
 * checkout.session.completed
 * Fired when a payment (pack) or subscription signup finishes.
 *
 * @param {Stripe.Checkout.Session} session
 */
async function handleCheckoutCompleted(session) {
  const userId = session.metadata?.userId

  if (!userId) {
    console.warn('[Webhook] checkout.session.completed missing userId metadata')
    return
  }

  const priceId = session.metadata?.priceId ?? session.line_items?.data?.[0]?.price?.id

  if (!priceId) {
    console.warn('[Webhook] checkout.session.completed: could not resolve priceId')
    return
  }

  const resolved = resolveTokensFromPriceId(priceId)

  if (!resolved) {
    console.warn(`[Webhook] Unrecognised priceId: ${priceId}`)
    return
  }

  if (session.mode === 'payment') {
    // ── One-time token pack — tokens never expire ────────────────────────
    await grantTokens(
      userId,
      resolved.tokens,
      'TOPUP_PACK',
      null, // no expiry
      `Token pack purchase (${resolved.tokens} tokens)`
    )
  } else if (session.mode === 'subscription') {
    // ── New subscription — tokens expire at end of billing period ────────
    const stripeSubscriptionId = session.subscription

    // Fetch the subscription to get current period dates
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
    const expiresAt = new Date(subscription.current_period_end * 1000)

    await grantTokens(
      userId,
      resolved.tokens,
      'MONTHLY_PLAN',
      expiresAt,
      `${resolved.plan} plan — monthly token grant`
    )

    // Upsert subscription record in DB
    const planKey = resolved.plan // 'STARTER' | 'GROWTH'

    await prisma.subscription.upsert({
      where:  { stripeSubscriptionId },
      update: {
        status:              subscription.status,
        currentPeriodStart:  new Date(subscription.current_period_start * 1000),
        currentPeriodEnd:    expiresAt,
        updatedAt:           new Date(),
      },
      create: {
        userId,
        stripeSubscriptionId,
        stripePriceId:       priceId,
        plan:                planKey,
        status:              subscription.status,
        currentPeriodStart:  new Date(subscription.current_period_start * 1000),
        currentPeriodEnd:    expiresAt,
        monthlyTokens:       resolved.tokens,
      },
    })
  }
}

/**
 * customer.subscription.updated
 * Fires on every change — we only care about period renewals.
 *
 * @param {Stripe.Subscription} subscription
 */
async function handleSubscriptionRenewed(subscription) {
  const customerId = subscription.customer

  // Find userId via customer metadata
  const customer = await stripe.customers.retrieve(customerId)

  if (customer.deleted) return

  const userId = customer.metadata?.userId

  if (!userId) {
    console.warn('[Webhook] subscription.updated: customer has no userId metadata')
    return
  }

  const dbSub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!dbSub) return

  const newPeriodEnd   = new Date(subscription.current_period_end   * 1000)
  const newPeriodStart = new Date(subscription.current_period_start * 1000)

  // Detect an actual period renewal (period_start moved forward)
  const isRenewal = newPeriodStart > dbSub.currentPeriodStart

  if (isRenewal) {
    // 1. Expire any remaining tokens from last period AFTER rolling some over
    await processRollover(userId)
    await expireGrants(userId)

    // 2. Grant fresh tokens for the new period
    await grantTokens(
      userId,
      dbSub.monthlyTokens,
      'MONTHLY_PLAN',
      newPeriodEnd,
      `${dbSub.plan} plan — monthly renewal grant`
    )
  }

  // Always keep subscription record current
  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data:  {
      status:             subscription.status,
      currentPeriodStart: newPeriodStart,
      currentPeriodEnd:   newPeriodEnd,
      updatedAt:          new Date(),
    },
  })
}

/**
 * customer.subscription.deleted
 * Subscription was cancelled (immediately or at period end).
 *
 * @param {Stripe.Subscription} subscription
 */
async function handleSubscriptionDeleted(subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data:  {
      status:    'canceled',
      updatedAt: new Date(),
    },
  })
}

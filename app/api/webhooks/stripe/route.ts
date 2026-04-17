// ─────────────────────────────────────────────────────────────────────────────
// app/api/webhooks/stripe/route.ts
//
// Handles incoming Stripe webhook events.
// Uses raw body + Stripe-Signature header for signature verification.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

import Stripe from 'stripe'
import { prisma } from '@/lib/db'
import { grantTokens, processRollover, expireGrants } from '@/lib/tokens'
import { resolveTokensFromPriceId } from '@/lib/stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
  apiVersion: '2024-04-10' as Stripe.LatestApiVersion,
})

// Cast to a permissive type: Stripe types drift between API versions
type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_start: number
  current_period_end: number
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  const rawBody   = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return new Response('Webhook secret not configured', { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = (err as Error).message
    console.error('[Stripe Webhook] Signature verification failed:', message)
    return new Response(`Webhook Error: ${message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionRenewed(event.data.object as SubscriptionWithPeriod)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break

      default:
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      status:  200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, error)
    return new Response(
      JSON.stringify({ received: true, error: (error as Error).message }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId

  if (!userId) {
    console.warn('[Webhook] checkout.session.completed missing userId metadata')
    return
  }

  const priceId =
    session.metadata?.priceId ??
    session.line_items?.data?.[0]?.price?.id

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
    await grantTokens(
      userId,
      resolved.tokens,
      'TOPUP_PACK',
      null,
      `Token pack purchase (${resolved.tokens} tokens)`
    )
  } else if (session.mode === 'subscription' && resolved.source === 'MONTHLY_PLAN') {
    const stripeSubscriptionId = session.subscription
    if (typeof stripeSubscriptionId !== 'string') return

    const subscription = (await stripe.subscriptions.retrieve(stripeSubscriptionId)) as SubscriptionWithPeriod
    const expiresAt    = new Date(subscription.current_period_end * 1000)

    await grantTokens(
      userId,
      resolved.tokens,
      'MONTHLY_PLAN',
      expiresAt,
      `${resolved.plan} plan — monthly token grant`
    )

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
        plan:                resolved.plan,
        status:              subscription.status,
        currentPeriodStart:  new Date(subscription.current_period_start * 1000),
        currentPeriodEnd:    expiresAt,
        monthlyTokens:       resolved.tokens,
      },
    })
  }
}

async function handleSubscriptionRenewed(subscription: SubscriptionWithPeriod): Promise<void> {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

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

  const isRenewal = newPeriodStart > dbSub.currentPeriodStart

  if (isRenewal) {
    await processRollover(userId)
    await expireGrants(userId)

    await grantTokens(
      userId,
      dbSub.monthlyTokens,
      'MONTHLY_PLAN',
      newPeriodEnd,
      `${dbSub.plan} plan — monthly renewal grant`
    )
  }

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

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data:  {
      status:    'canceled',
      updatedAt: new Date(),
    },
  })
}


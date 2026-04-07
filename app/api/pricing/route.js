// ─────────────────────────────────────────────────────────────────────────────
// app/api/pricing/route.js
//
// GET /api/pricing — returns available token packs and subscription plans
// Public endpoint — no auth required (used by the tokens page)
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { TOKEN_PACKS, PLANS } from '@/lib/stripe'

export async function GET() {
  return NextResponse.json({
    packs: TOKEN_PACKS.map((p) => ({
      id:      p.id,
      label:   p.label,
      price:   p.price,
      tokens:  p.tokens,
      popular: p.popular ?? false,
      priceId: p.priceId,
    })),
    plans: Object.entries(PLANS).map(([key, p]) => ({
      id:      key.toLowerCase(),
      key,
      name:    p.name,
      price:   p.price,
      tokens:  p.tokens,
      priceId: p.priceId,
    })),
  })
}

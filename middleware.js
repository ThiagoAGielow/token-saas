// ─────────────────────────────────────────────────────────────────────────────
// middleware.js — Clerk authentication middleware
//
// Protects /dashboard and /api routes.
// Public exceptions:
//   - /api/webhooks/stripe  (Stripe needs to call this without a session)
//   - /sign-in, /sign-up    (Clerk auth pages)
//   - Static assets, _next internals
// ─────────────────────────────────────────────────────────────────────────────

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// ── Routes that must remain publicly accessible ──────────────────────────────

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/stripe(.*)',  // Stripe webhook — no auth header
  '/',                          // Landing page
  '/pricing(.*)',
  '/about(.*)',
])

// ── Export middleware ─────────────────────────────────────────────────────────

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

// ── Matcher config ────────────────────────────────────────────────────────────
// Skip Next.js internals and all static files so the middleware only runs
// on actual application routes.

export const config = {
  matcher: [
    // Match everything except Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}

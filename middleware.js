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
import { NextResponse } from 'next/server'

// ── Routes that must remain publicly accessible ──────────────────────────────

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/stripe(.*)',  // Stripe webhook — no auth header
  '/site(.*)',                 // Public customer websites
  '/',                          // Landing page
  '/pricing(.*)',
  '/about(.*)',
])

// ── Export middleware ─────────────────────────────────────────────────────────

export default clerkMiddleware(async (auth, request) => {
  const hostname = request.headers.get('host') || ''
  const platformDomain = process.env.PLATFORM_DOMAIN || 'velocitysites.com.au'

  // Detect subdomain requests (e.g. myshop.velocitysites.com.au)
  // and rewrite them to the internal /site/[subdomain] route.
  // Reserved subdomains that run the app itself are excluded.
  const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'api', 'dashboard', 'admin'])

  if (hostname.endsWith(`.${platformDomain}`)) {
    const subdomain = hostname.replace(`.${platformDomain}`, '')
    if (!RESERVED_SUBDOMAINS.has(subdomain)) {
      const url = request.nextUrl.clone()
      url.pathname = `/site/${subdomain}`
      return NextResponse.rewrite(url)
    }
  }

  if (!isPublicRoute(request)) {
    const { userId } = await auth()
    if (!userId) {
      const signInUrl = new URL('/sign-in', request.url)
      signInUrl.searchParams.set('redirect_url', request.nextUrl.pathname)
      return NextResponse.redirect(signInUrl)
    }
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

// ─────────────────────────────────────────────────────────────────────────────
// app/site/[subdomain]/page.js
//
// Serves the public website for any *.velocitysites.com.au subdomain.
// The middleware rewrites subdomain requests to this route internally.
// No auth required — this is publicly accessible.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SitePage({ params }) {
  const { subdomain } = await params

  const website = await prisma.website.findUnique({
    where:  { subdomain },
    select: { name: true, generatedHtml: true, status: true },
  })

  if (!website || website.status === 'PAUSED') {
    notFound()
  }

  // If HTML has been generated, serve it
  if (website.generatedHtml) {
    return (
      <html>
        <body dangerouslySetInnerHTML={{ __html: website.generatedHtml }} />
      </html>
    )
  }

  // Coming soon — site is claimed but not built yet
  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'velocitysites.com.au'

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{website.name} — Coming Soon</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0a0a0a;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: #fff;
          }
          .card {
            text-align: center;
            padding: 3rem 2rem;
            max-width: 420px;
          }
          .badge {
            display: inline-block;
            background: rgba(59,130,246,0.15);
            color: #60a5fa;
            border: 1px solid rgba(59,130,246,0.3);
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            padding: 0.25rem 0.75rem;
            margin-bottom: 1.5rem;
          }
          h1 {
            font-size: 2rem;
            font-weight: 800;
            margin-bottom: 0.75rem;
            letter-spacing: -0.02em;
          }
          p {
            color: #9ca3af;
            font-size: 0.95rem;
            line-height: 1.6;
            margin-bottom: 2rem;
          }
          .dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #22c55e;
            margin-right: 6px;
            animation: pulse 2s infinite;
          }
          .status {
            display: inline-flex;
            align-items: center;
            font-size: 0.8rem;
            color: #6b7280;
          }
          .powered {
            margin-top: 3rem;
            font-size: 0.7rem;
            color: #374151;
          }
          .powered a { color: #4b5563; text-decoration: none; }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="badge">Coming Soon</div>
          <h1>{website.name}</h1>
          <p>This site is being built. Check back soon.</p>
          <div className="status">
            <span className="dot" />
            Domain active · {subdomain}.{platformDomain}
          </div>
          <div className="powered">
            Powered by <a href={`https://${platformDomain}`}>VelocitySites</a>
          </div>
        </div>
      </body>
    </html>
  )
}

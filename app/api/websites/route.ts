// ─────────────────────────────────────────────────────────────────────────────
// app/api/websites/route.ts
//
// GET  /api/websites — list the authenticated user's websites
// POST /api/websites — generate a new AI website (costs 50 tokens)
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

import { auth }           from '@clerk/nextjs/server'
import { NextResponse }   from 'next/server'
import { WebsiteStatus }  from '@prisma/client'
import { prisma }         from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import { spendTokens, getBalance, TOKEN_COSTS } from '@/lib/tokens'
import { callAI, type AIProvider } from '@/lib/ai'
import { provisionClientRepo } from '@/lib/github'
import { createVercelProject } from '@/lib/vercel'

const SUBDOMAIN_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/

const WEBSITE_SYSTEM_PROMPT_BASE = `You are an expert web designer and developer.
Generate a complete, self-contained HTML file for a website based on the user's description.

Rules:
- Output ONLY raw HTML — no markdown fences, no explanation, no commentary
- Single HTML file with everything inline (styles in <style> tags, no external CSS files)
- Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Modern, clean, professional design with a dark or light theme that fits the business
- Fully mobile responsive
- Include realistic placeholder content (headings, body copy, CTAs) relevant to the business
- Use https://picsum.photos for placeholder images where appropriate
- Include a navigation bar, hero section, and at least 2 other relevant sections
- Add a simple footer with the business name
- Do NOT include any JavaScript beyond what Tailwind CDN provides`

const TEMPLATE_STYLES: Record<string, string> = {
  trades:       'Bold, high-contrast site for trades/construction businesses. Dark backgrounds with strong orange or yellow accent colors. Large hero with a compelling headline and a "Get a Free Quote" CTA. Services grid with icons. Trust signals (licensed, insured, years of experience). Phone number prominent in the header and footer.',
  restaurant:   'Warm, elegant restaurant site. Dark background with amber/gold accents. Full-width hero with atmospheric food/dining imagery. Menu section with categories and descriptions. Reservation CTA. A story or chef section. Footer with opening hours and address.',
  wellness:     'Clean, calming wellness or health site. Light or soft-neutral backgrounds with green or teal accents. Gentle, flowing typography. Services offered with icons. Testimonials section. Booking or contact CTA. Peaceful, minimal aesthetic.',
  professional: 'Clean corporate/professional services site. White or light-gray background with navy blue accents. Formal typography. About/team section with headshot placeholder. Services list. Client logos section. Contact form.',
  portfolio:    'Creative portfolio site. Dark background with a vibrant accent color (purple, pink, or coral). Projects/work grid with hover effects. Bio/about section. Skills or tools list. Minimal but striking typography. Contact section.',
  startup:      'Modern SaaS/startup landing page. Dark background with gradient accents (purple-to-blue or cyan-to-blue). Bold hero headline and subheadline with a primary CTA button. Features grid (3 columns with icons). Pricing table with 3 tiers. Testimonials row. Strong closing CTA section.',
}

function buildSystemPrompt(templateId?: string): string {
  if (!templateId || !TEMPLATE_STYLES[templateId]) return WEBSITE_SYSTEM_PROMPT_BASE
  return `${WEBSITE_SYSTEM_PROMPT_BASE}\n\nDesign style to follow (template: ${templateId}):\n${TEMPLATE_STYLES[templateId]}`
}

interface CreateWebsiteBody {
  name?: string
  subdomain?: string
  prompt?: string
  provider?: AIProvider
  templateId?: string
}

// ─── GET /api/websites ────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const user = await getOrCreateUser(clerkId)

    const websites = await prisma.website.findMany({
      where:   { userId: user.id },
      select: {
        id:              true,
        name:            true,
        subdomain:       true,
        status:          true,
        tokenCost:       true,
        prompt:          true,
        githubRepo:      true,
        githubRepoUrl:   true,
        vercelProjectId: true,
        vercelUrl:       true,
        publishedAt:     true,
        createdAt:       true,
        updatedAt:       true,
        domain: {
          select: { domain: true, verified: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ websites })
  } catch (error) {
    console.error('[GET /api/websites]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/websites ───────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = (await request.json()) as CreateWebsiteBody
    const { name, subdomain, prompt, provider = 'claude', templateId } = body

    if (!name?.trim())      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!subdomain?.trim()) return NextResponse.json({ error: 'Subdomain is required' }, { status: 400 })
    if (!prompt?.trim())    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })

    const cleanSubdomain = subdomain.trim().toLowerCase()
    if (!SUBDOMAIN_RE.test(cleanSubdomain)) {
      return NextResponse.json(
        { error: 'Subdomain must be 3–50 lowercase letters, numbers, or hyphens' },
        { status: 400 }
      )
    }

    const user = await getOrCreateUser(clerkId)

    const existing = await prisma.website.findUnique({
      where:  { subdomain: cleanSubdomain },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ error: 'That subdomain is already taken' }, { status: 409 })
    }

    const cost    = TOKEN_COSTS.WEBSITE
    const balance = await getBalance(user.id)
    if (balance < cost) {
      return NextResponse.json(
        { error: 'Insufficient tokens', required: cost, balance },
        { status: 402 }
      )
    }

    const website = await prisma.website.create({
      data: {
        userId:    user.id,
        name:      name.trim(),
        subdomain: cleanSubdomain,
        prompt:    prompt.trim(),
        status:    WebsiteStatus.BUILDING,
        tokenCost: cost,
      },
    })

    await spendTokens(
      user.id,
      cost,
      `Built website: ${name.trim()}`,
      { websiteId: website.id }
    )

    let generatedHtml: string
    try {
      generatedHtml = await callAI({
        userId:   user.id,
        provider,
        system:   buildSystemPrompt(templateId),
        messages: [{ role: 'user', content: prompt.trim() }],
        maxTokens: 8192,
      })

      generatedHtml = generatedHtml
        .replace(/^```html\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()
    } catch (aiError) {
      console.error('[POST /api/websites] AI generation failed:', aiError)
      return NextResponse.json(
        { error: 'AI generation failed. Your tokens have been held — please contact support.', websiteId: website.id },
        { status: 502 }
      )
    }

    let githubRepo: string | null = null
    let githubRepoUrl: string | null = null

    try {
      const { repoName, repoUrl } = await provisionClientRepo({
        clientName: name.trim(),
        subdomain: cleanSubdomain,
        tier: 'static',
        generatedHtml,
      })
      
      githubRepo = repoName
      githubRepoUrl = repoUrl
    } catch (ghErr) {
      console.error('[POST /api/websites] GitHub provisioning failed:', ghErr)
      // Continue without GitHub - can retry later
    }

    const updated = await prisma.website.update({
      where: { id: website.id },
      data: {
        generatedHtml,
        githubRepo,
        githubRepoUrl,
        status: WebsiteStatus.ACTIVE,
        publishedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        status: true,
        githubRepo: true,
        githubRepoUrl: true,
        vercelProjectId: true,
        vercelUrl: true,
        publishedAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ website: updated }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/websites]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

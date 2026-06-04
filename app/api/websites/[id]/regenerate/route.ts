export const dynamic = 'force-dynamic'

import { auth }            from '@clerk/nextjs/server'
import { prisma }          from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import { callAIStream, type AIProvider } from '@/lib/ai'
import { updateSiteHtml }  from '@/lib/github'
import { getBalance, spendTokens, TOKEN_COSTS } from '@/lib/tokens'

const WEBSITE_SYSTEM_PROMPT = `You are an expert web designer and developer.
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

interface RouteContext {
  params: Promise<{ id: string }>
}

interface RegenerateBody {
  provider?: AIProvider
}

export async function POST(request: Request, { params }: RouteContext): Promise<Response> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return new Response('Unauthorised', { status: 401 })

  const { id }  = await params
  const body    = (await request.json()) as RegenerateBody
  const provider = body.provider ?? 'claude'

  const user = await getOrCreateUser(clerkId)

  const website = await prisma.website.findFirst({
    where:  { id, userId: user.id },
    select: { id: true, prompt: true, githubRepo: true },
  })
  if (!website) return new Response('Not found', { status: 404 })

  const cost    = TOKEN_COSTS.AI_REGENERATE
  const balance = await getBalance(user.id)
  if (balance < cost) {
    return new Response(
      JSON.stringify({ error: `Not enough tokens — regeneration costs ${cost} tokens.` }),
      { status: 402, headers: { 'Content-Type': 'application/json' } }
    )
  }

  await spendTokens(user.id, cost, `Regenerated website: ${website.prompt.slice(0, 60)}`, { websiteId: id })

  const enc = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let fullHtml = ''

      try {
        for await (const chunk of callAIStream({
          userId:    user.id,
          provider,
          system:    WEBSITE_SYSTEM_PROMPT,
          messages:  [{ role: 'user', content: website.prompt }],
          maxTokens: 8192,
        })) {
          fullHtml += chunk
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`))
        }

        const cleanHtml = fullHtml
          .replace(/^```html\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim()

        await prisma.$transaction([
          prisma.website.update({
            where: { id },
            data:  { generatedHtml: cleanHtml, updatedAt: new Date() },
          }),
          prisma.chatMessage.deleteMany({ where: { websiteId: id } }),
        ])

        if (website.githubRepo) {
          try {
            await updateSiteHtml({
              repoName: website.githubRepo,
              html:     cleanHtml,
              message:  'feat: regenerate site from original prompt',
            })
          } catch (ghErr) {
            console.error('[regenerate] GitHub update failed:', ghErr)
          }
        }

        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        controller.close()
      } catch (err) {
        console.error('[POST /api/websites/[id]/regenerate]', err)
        controller.enqueue(
          enc.encode(`data: ${JSON.stringify({ type: 'error', message: (err as Error).message })}\n\n`)
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection:      'keep-alive',
    },
  })
}

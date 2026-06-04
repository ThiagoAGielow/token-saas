// ─────────────────────────────────────────────────────────────────────────────
// app/api/websites/[id]/chat/route.ts
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

import { auth }            from '@clerk/nextjs/server'
import { NextResponse }    from 'next/server'
import { prisma }          from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import { callAIStream, type AIMessage, type AIProvider } from '@/lib/ai'
import { updateSiteHtml }  from '@/lib/github'
import { getBalance, spendTokens, TOKEN_COSTS } from '@/lib/tokens'

const MAX_HISTORY = 20

const HTML_UPDATE_RE = /<HTML_UPDATE>([\s\S]*?)<\/HTML_UPDATE>/i

interface RouteContext {
  params: Promise<{ id: string }>
}

interface ChatBody {
  message?: string
  provider?: AIProvider
}

interface WebsiteForChat {
  id:             string
  name:           string
  subdomain:      string
  generatedHtml:  string | null
  githubRepo:     string | null
  vercelProjectId: string | null
}

function buildSystemPrompt(website: WebsiteForChat): string {
  return `You are an AI website assistant for "${website.name}".
You have full access to the site's current HTML and can modify it on the user's behalf.

Current website HTML:
\`\`\`html
${website.generatedHtml || '<!-- No HTML generated yet -->'}
\`\`\`

When the user asks you to change something about the website:
1. Briefly describe what you changed (1-2 sentences max).
2. Output the COMPLETE updated HTML file wrapped in exactly these tags — no partial snippets:
<HTML_UPDATE>
<!DOCTYPE html>
...complete html...
</HTML_UPDATE>

When the user is just chatting, asking questions, or requesting information — respond normally without any HTML_UPDATE tags.
Do NOT output HTML_UPDATE unless the user is explicitly asking for a website change.`
}

// ─── GET — load conversation history ─────────────────────────────────────────

export async function GET(_request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { id } = await params
    const user   = await getOrCreateUser(clerkId)

    const website = await prisma.website.findFirst({
      where:  { id, userId: user.id },
      select: { id: true, name: true, subdomain: true, status: true, vercelUrl: true },
    })
    if (!website) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const messages = await prisma.chatMessage.findMany({
      where:   { websiteId: id },
      orderBy: { createdAt: 'asc' },
      select:  { id: true, role: true, content: true, createdAt: true },
    })

    return NextResponse.json({ website, messages })
  } catch (error) {
    console.error('[GET /api/websites/[id]/chat]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST — send a message (streaming) ───────────────────────────────────────

export async function POST(request: Request, { params }: RouteContext): Promise<Response> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const body = (await request.json()) as ChatBody
  const { message, provider = 'claude' } = body

  if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

  const user = await getOrCreateUser(clerkId)

  const website = await prisma.website.findFirst({
    where:  { id, userId: user.id },
    select: {
      id: true, name: true, subdomain: true,
      generatedHtml: true, githubRepo: true, vercelProjectId: true,
    },
  })
  if (!website) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const cost    = TOKEN_COSTS.AI_REWRITE
  const balance = await getBalance(user.id)
  if (balance < cost) {
    return NextResponse.json(
      { error: `Not enough tokens — chat edits cost ${cost} tokens. Top up to continue.` },
      { status: 402 }
    )
  }

  await spendTokens(user.id, cost, `Chat edit: ${website.name}`, { websiteId: id })

  const history = await prisma.chatMessage.findMany({
    where:   { websiteId: id },
    orderBy: { createdAt: 'asc' },
    take:    MAX_HISTORY,
    select:  { role: true, content: true },
  })

  const aiMessages: AIMessage[] = [
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: message.trim() },
  ]

  const enc = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = ''

      try {
        for await (const chunk of callAIStream({
          userId:    user.id,
          provider,
          system:    buildSystemPrompt(website),
          messages:  aiMessages,
          maxTokens: 8192,
        })) {
          fullResponse += chunk
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`))
        }

        const match       = HTML_UPDATE_RE.exec(fullResponse)
        const newHtml     = match?.[1]?.trim() ?? null
        let   htmlUpdated = false

        if (newHtml) {
          htmlUpdated = true

          await prisma.website.update({
            where: { id },
            data:  { generatedHtml: newHtml, updatedAt: new Date() },
          })

          if (website.githubRepo) {
            try {
              await updateSiteHtml({
                repoName: website.githubRepo,
                html:     newHtml,
                message:  `feat: AI update — ${message.trim().slice(0, 72)}`,
              })
            } catch (ghErr) {
              console.error('[chat] GitHub update failed:', ghErr)
            }
          }
        }

        await prisma.chatMessage.createMany({
          data: [
            { websiteId: id, role: 'user',      content: message.trim() },
            { websiteId: id, role: 'assistant', content: fullResponse   },
          ],
        })

        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'done', htmlUpdated })}\n\n`))
        controller.close()
      } catch (err) {
        console.error('[POST /api/websites/[id]/chat stream]', err)
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

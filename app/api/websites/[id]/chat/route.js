// ─────────────────────────────────────────────────────────────────────────────
// app/api/websites/[id]/chat/route.js
//
// GET  /api/websites/[id]/chat — load conversation history
// POST /api/websites/[id]/chat — send a message (streaming SSE response)
//
// The AI assistant has full context of the site HTML. When it produces
// an HTML update, the new HTML is saved to DB, committed to GitHub,
// and a Vercel redeployment is triggered automatically.
//
// Stream format (newline-delimited, content-type: text/event-stream):
//   data: {"type":"chunk","text":"..."}\n\n
//   data: {"type":"done","htmlUpdated":false}\n\n
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

import { auth }            from '@clerk/nextjs/server'
import { NextResponse }    from 'next/server'
import { prisma }          from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import { callAIStream }    from '@/lib/ai'
import { updateSiteHtml }  from '@/lib/github'

// Max history messages sent to AI (keeps context window manageable)
const MAX_HISTORY = 20

// Marker the AI wraps updated HTML in
const HTML_UPDATE_RE = /<HTML_UPDATE>([\s\S]*?)<\/HTML_UPDATE>/i

function buildSystemPrompt(website) {
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

export async function GET(request, { params }) {
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

export async function POST(request, { params }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id }             = await params
  const body               = await request.json()
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

  // Load recent history for AI context
  const history = await prisma.chatMessage.findMany({
    where:   { websiteId: id },
    orderBy: { createdAt: 'asc' },
    take:    MAX_HISTORY,
    select:  { role: true, content: true },
  })

  // Build messages array for the AI
  const aiMessages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message.trim() },
  ]

  const enc = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = ''

      try {
        // Stream AI response chunk by chunk
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

        // ── Parse for HTML update ──────────────────────────────────────────
        const match      = HTML_UPDATE_RE.exec(fullResponse)
        const newHtml    = match ? match[1].trim() : null
        let   htmlUpdated = false

        if (newHtml) {
          htmlUpdated = true

          // Save updated HTML to DB
          await prisma.website.update({
            where: { id },
            data:  { generatedHtml: newHtml, updatedAt: new Date() },
          })

          // Commit to GitHub repo (non-fatal)
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

        // ── Persist messages to DB ─────────────────────────────────────────
        await prisma.chatMessage.createMany({
          data: [
            { websiteId: id, role: 'user',      content: message.trim() },
            { websiteId: id, role: 'assistant', content: fullResponse   },
          ],
        })

        // ── Send done event ────────────────────────────────────────────────
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'done', htmlUpdated })}\n\n`))
        controller.close()

      } catch (err) {
        console.error('[POST /api/websites/[id]/chat stream]', err)
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`))
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

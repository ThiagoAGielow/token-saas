// ─────────────────────────────────────────────────────────────────────────────
// lib/ai.ts — BYOK AI call resolver
//
// Resolves which API key to use for a given user + provider:
//   1. User's own BYOK key (decrypted from DB)
//   2. Platform key from env (fallback)
//
// Supports: claude | openai | gemini | openrouter
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic               from '@anthropic-ai/sdk'
import OpenAI                  from 'openai'
import { GoogleGenerativeAI }  from '@google/generative-ai'
import { prisma }                   from '@/lib/db'
import { decrypt }                  from '@/lib/encryption'
import { provisionOpenRouterKey }   from '@/lib/user'

export type AIProvider = 'claude' | 'openai' | 'gemini' | 'openrouter'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string | OpenRouterContentPart[]
}

/** OpenRouter supports image/file content parts (OpenAI-compatible) */
export interface OpenRouterContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string; detail?: string }
}

export interface CallAIOptions {
  userId: string
  provider?: AIProvider
  /** Override the default model for the provider (e.g. for OpenRouter: "anthropic/claude-3.5-sonnet") */
  model?: string
  system?: string
  messages: AIMessage[]
  maxTokens?: number
}

/** Plain text message used by direct providers (Claude, OpenAI, Gemini). */
interface SimpleMessage {
  role:    'user' | 'assistant'
  content: string
}

/** Options for direct AI providers — messages always have plain-string content. */
interface ProviderCallOptions {
  apiKey:    string
  model:     string
  system?:   string | undefined
  messages:  SimpleMessage[]
  maxTokens: number
}

/** Options for OpenRouter which supports rich content parts (images, files). */
interface OpenRouterCallOptions {
  apiKey:    string
  model:     string
  system?:   string | undefined
  messages:  AIMessage[]
  maxTokens: number
}

const DEFAULT_PROVIDER: AIProvider = 'claude'

/** Default model IDs per direct provider */
const DEFAULT_MODELS: Record<AIProvider, string> = {
  claude:      'claude-sonnet-4-6',
  openai:      'gpt-4o',
  gemini:      'gemini-2.5-flash',
  openrouter:  'qwen/qwen3-coder:free',  // best free coding model on OpenRouter
}

/** Site URL & name sent as OpenRouter attribution headers */
const OPENROUTER_SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL  || 'https://velocitysites.com.au'
const OPENROUTER_SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'VelocitySites'

// ─── Key resolution ───────────────────────────────────────────────────────────

export async function resolveApiKey(
  userId: string | undefined,
  provider: AIProvider,
): Promise<string> {
  if (userId) {
    // OpenRouter: each user has their own provisioned sub-key in the DB.
    // If none exists yet (e.g. user signed up before provisioning was live),
    // provision one on-demand now before continuing.
    if (provider === 'openrouter') {
      let provisionedKey = await prisma.openRouterProvisionedKey.findUnique({
        where:  { userId },
        select: { encryptedKey: true, isActive: true },
      })

      if (!provisionedKey?.isActive) {
        console.log(`[resolveApiKey] no active provisioned key for user ${userId} — provisioning now`)
        const user = await prisma.user.findUnique({
          where:  { id: userId },
          select: { name: true, email: true },
        })
        await provisionOpenRouterKey(userId, user?.name ?? user?.email ?? userId)

        provisionedKey = await prisma.openRouterProvisionedKey.findUnique({
          where:  { userId },
          select: { encryptedKey: true, isActive: true },
        })
      }

      if (provisionedKey?.encryptedKey && provisionedKey.isActive) {
        return decrypt(provisionedKey.encryptedKey)
      }

      throw new Error(
        'Could not provision an OpenRouter key for this user. ' +
        'Ensure OPENROUTER_PROVISIONER_KEY is set in the environment.',
      )
    }

    // Non-OpenRouter: check BYOK key, then fall back to platform env key
    const record = await prisma.userAiKey.findUnique({
      where:  { userId_provider: { userId, provider } },
      select: { encryptedKey: true },
    })
    if (record?.encryptedKey) return decrypt(record.encryptedKey)
  }

  const platformKey: Record<Exclude<AIProvider, 'openrouter'>, string | undefined> = {
    claude: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
  }
  const key = platformKey[provider as Exclude<AIProvider, 'openrouter'>]

  if (!key) {
    throw new Error(
      `No API key available for provider "${provider}". ` +
      `Set one in your account settings.`,
    )
  }

  return key
}

// ─── Main call ────────────────────────────────────────────────────────────────

export async function callAI({
  userId,
  provider = DEFAULT_PROVIDER,
  model: modelOverride,
  system,
  messages,
  maxTokens = 4096,
}: CallAIOptions): Promise<string> {
  const apiKey = await resolveApiKey(userId, provider)
  const model  = modelOverride ?? DEFAULT_MODELS[provider]

  // Simple messages for non-OpenRouter providers (string content only)
  const simpleMessages: SimpleMessage[] = messages.map(m => ({
    role:    m.role,
    content: typeof m.content === 'string' ? m.content : m.content.map(p => p.text ?? '').join(''),
  }))

  switch (provider) {
    case 'claude':
      return callClaude({ apiKey, model, system, messages: simpleMessages, maxTokens })
    case 'openai':
      return callOpenAI({ apiKey, model, system, messages: simpleMessages, maxTokens })
    case 'gemini':
      return callGemini({ apiKey, model, system, messages: simpleMessages, maxTokens })
    case 'openrouter':
      return callOpenRouter({ apiKey, model, system, messages, maxTokens })
    default: {
      const exhaustive: never = provider
      throw new Error(`Unsupported provider: "${String(exhaustive)}"`)
    }
  }
}

// ─── Streaming call ───────────────────────────────────────────────────────────

export async function* callAIStream({
  userId,
  provider = DEFAULT_PROVIDER,
  model: modelOverride,
  system,
  messages,
  maxTokens = 4096,
}: CallAIOptions): AsyncGenerator<string, void, unknown> {
  const apiKey = await resolveApiKey(userId, provider)
  const model  = modelOverride ?? DEFAULT_MODELS[provider]

  // Simple messages for non-OpenRouter providers (string content only)
  const simpleMessages: SimpleMessage[] = messages.map(m => ({
    role:    m.role,
    content: typeof m.content === 'string' ? m.content : m.content.map(p => p.text ?? '').join(''),
  }))

  switch (provider) {
    case 'claude':
      yield* streamClaude({ apiKey, model, system, messages: simpleMessages, maxTokens })
      break
    case 'openai':
      yield* streamOpenAI({ apiKey, model, system, messages: simpleMessages, maxTokens })
      break
    case 'gemini':
      yield* streamGemini({ apiKey, model, system, messages: simpleMessages, maxTokens })
      break
    case 'openrouter':
      yield* streamOpenRouter({ apiKey, model, system, messages, maxTokens })
      break
    default: {
      const exhaustive: never = provider
      throw new Error(`Unsupported provider: "${String(exhaustive)}"`)
    }
  }
}

// ─── Provider implementations ─────────────────────────────────────────────────

async function callClaude({ apiKey, model, system, messages, maxTokens }: ProviderCallOptions): Promise<string> {
  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages,
  })

  const first = response.content[0]
  if (!first || first.type !== 'text') return ''
  return first.text
}

async function callOpenAI({ apiKey, model, system, messages, maxTokens }: ProviderCallOptions): Promise<string> {
  const client = new OpenAI({ apiKey })

  const openAiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    ...(system ? [{ role: 'system' as const, content: system }] : []),
    ...messages,
  ]

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: openAiMessages,
  })

  return response.choices[0]?.message?.content ?? ''
}

async function callGemini({ apiKey, model, system, messages, maxTokens }: ProviderCallOptions): Promise<string> {
  const client    = new GoogleGenerativeAI(apiKey)
  const genModel  = client.getGenerativeModel({
    model,
    ...(system ? {
      systemInstruction: {
        role: 'system',
        parts: [{ text: system }],
      }
    } : {}),
  })

  const history = messages.slice(0, -1).map((m) => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const last = messages[messages.length - 1]
  if (!last) throw new Error('Gemini call: messages array is empty')

  const chat = genModel.startChat({
    history,
    generationConfig: { maxOutputTokens: maxTokens },
  })

  const result = await chat.sendMessage(last.content)
  return result.response.text()
}

// ─── Streaming provider implementations ──────────────────────────────────────

async function* streamClaude({ apiKey, model, system, messages, maxTokens }: ProviderCallOptions): AsyncGenerator<string, void, unknown> {
  const client = new Anthropic({ apiKey })
  const stream = await client.messages.stream({
    model,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages,
  })
  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta?.type === 'text_delta'
    ) {
      yield event.delta.text
    }
  }
}

async function* streamOpenAI({ apiKey, model, system, messages, maxTokens }: ProviderCallOptions): AsyncGenerator<string, void, unknown> {
  const client = new OpenAI({ apiKey })
  const openAiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    ...(system ? [{ role: 'system' as const, content: system }] : []),
    ...messages,
  ]
  const stream = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: openAiMessages,
    stream: true,
  })
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) yield text
  }
}

async function* streamGemini({ apiKey, model, system, messages, maxTokens }: ProviderCallOptions): AsyncGenerator<string, void, unknown> {
  const client   = new GoogleGenerativeAI(apiKey)
  const genModel = client.getGenerativeModel({
    model,
    ...(system ? {
      systemInstruction: {
        role: 'system',
        parts: [{ text: system }],
      }
    } : {}),
  })

  const history  = messages.slice(0, -1).map((m) => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const last = messages[messages.length - 1]
  if (!last) throw new Error('Gemini stream: messages array is empty')

  const chat = genModel.startChat({
    history,
    generationConfig: { maxOutputTokens: maxTokens },
  })

  const result = await chat.sendMessageStream(last.content)
  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) yield text
  }
}


// ─── OpenRouter implementations ───────────────────────────────────────────────
// OpenRouter is OpenAI-compatible — use the OpenAI SDK with a custom baseURL.
// Supports all OpenAI-compatible message formats including image_url content parts.

function buildOpenRouterClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': OPENROUTER_SITE_URL,
      'X-Title':      OPENROUTER_SITE_NAME,
    },
  })
}

function buildOpenRouterMessages(
  system: string | undefined,
  messages: AIMessage[],
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const result: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

  if (system) result.push({ role: 'system', content: system })

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      result.push({ role: msg.role, content: msg.content })
    } else {
      // Rich content (images, files) — map to OpenAI content parts
      const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = msg.content.map(p => {
        if (p.type === 'image_url' && p.image_url) {
          return { type: 'image_url', image_url: { url: p.image_url.url, detail: (p.image_url.detail as 'auto' | 'low' | 'high' | undefined) ?? 'auto' } }
        }
        return { type: 'text', text: p.text ?? '' }
      })
      result.push({ role: msg.role as 'user' | 'assistant', content: parts } as OpenAI.Chat.Completions.ChatCompletionMessageParam)
    }
  }

  return result
}

async function callOpenRouter({ apiKey, model, system, messages, maxTokens }: OpenRouterCallOptions): Promise<string> {
  const client   = buildOpenRouterClient(apiKey)
  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages:   buildOpenRouterMessages(system, messages),
  })
  return response.choices[0]?.message?.content ?? ''
}

async function* streamOpenRouter({ apiKey, model, system, messages, maxTokens }: OpenRouterCallOptions): AsyncGenerator<string, void, unknown> {
  const client = buildOpenRouterClient(apiKey)

  const MAX_RETRIES = 3
  const BASE_DELAY  = 2000 // ms

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const stream = await client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages:   buildOpenRouterMessages(system, messages),
        stream:     true,
      })
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content
        if (text) yield text
      }
      return // success
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 429 && attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY * 2 ** attempt
        console.warn(`[streamOpenRouter] 429 rate limit on attempt ${attempt + 1} — retrying in ${delay}ms`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      // 429 exhausted or other error — throw user-friendly message
      if (status === 429) {
        throw new Error(
          `The "${model}" model is currently rate-limited. Please try again in a moment or select a different model.`
        )
      }
      throw err
    }
  }
}

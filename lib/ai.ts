// ─────────────────────────────────────────────────────────────────────────────
// lib/ai.ts — BYOK AI call resolver
//
// Resolves which API key to use for a given user + provider:
//   1. User's own BYOK key (decrypted from DB)
//   2. Platform key from env (fallback)
//
// Supports: claude | openai | gemini
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic               from '@anthropic-ai/sdk'
import OpenAI                  from 'openai'
import { GoogleGenerativeAI }  from '@google/generative-ai'
import { prisma }              from '@/lib/db'
import { decrypt }             from '@/lib/encryption'

export type AIProvider = 'claude' | 'openai' | 'gemini'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface CallAIOptions {
  userId: string
  provider?: AIProvider
  system?: string
  messages: AIMessage[]
  maxTokens?: number
}

interface ProviderCallOptions {
  apiKey: string
  model: string
  system?: string | undefined
  messages: AIMessage[]
  maxTokens: number
}

const DEFAULT_PROVIDER: AIProvider = 'claude'

const MODELS: Record<AIProvider, string> = {
  claude: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  gemini: 'gemini-1.5-pro',
}

// ─── Key resolution ───────────────────────────────────────────────────────────

export async function resolveApiKey(
  userId: string | undefined,
  provider: AIProvider,
): Promise<string> {
  if (userId) {
    const record = await prisma.userAiKey.findUnique({
      where:  { userId_provider: { userId, provider } },
      select: { encryptedKey: true },
    })
    if (record?.encryptedKey) {
      return decrypt(record.encryptedKey)
    }
  }

  const platformKey: Record<AIProvider, string | undefined> = {
    claude: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
  }
  const key = platformKey[provider]

  if (!key) {
    throw new Error(
      `No API key available for provider "${provider}". ` +
      `Set one in your settings or configure the platform key in env.`,
    )
  }

  return key
}

// ─── Main call ────────────────────────────────────────────────────────────────

export async function callAI({
  userId,
  provider = DEFAULT_PROVIDER,
  system,
  messages,
  maxTokens = 4096,
}: CallAIOptions): Promise<string> {
  const apiKey = await resolveApiKey(userId, provider)
  const model  = MODELS[provider]

  switch (provider) {
    case 'claude':
      return callClaude({ apiKey, model, system, messages, maxTokens })
    case 'openai':
      return callOpenAI({ apiKey, model, system, messages, maxTokens })
    case 'gemini':
      return callGemini({ apiKey, model, system, messages, maxTokens })
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
  system,
  messages,
  maxTokens = 4096,
}: CallAIOptions): AsyncGenerator<string, void, unknown> {
  const apiKey = await resolveApiKey(userId, provider)
  const model  = MODELS[provider]

  switch (provider) {
    case 'claude':
      yield* streamClaude({ apiKey, model, system, messages, maxTokens })
      break
    case 'openai':
      yield* streamOpenAI({ apiKey, model, system, messages, maxTokens })
      break
    case 'gemini':
      yield* streamGemini({ apiKey, model, system, messages, maxTokens })
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
  const genModel  = client.getGenerativeModel({ model })

  const history = messages.slice(0, -1).map((m) => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const last = messages[messages.length - 1]
  if (!last) throw new Error('Gemini call: messages array is empty')

  const chat = genModel.startChat({
    history,
    generationConfig: { maxOutputTokens: maxTokens },
    ...(system ? { systemInstruction: system } : {}),
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
  const genModel = client.getGenerativeModel({ model })
  const history  = messages.slice(0, -1).map((m) => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const last = messages[messages.length - 1]
  if (!last) throw new Error('Gemini stream: messages array is empty')
  const chat = genModel.startChat({
    history,
    generationConfig: { maxOutputTokens: maxTokens },
    ...(system ? { systemInstruction: system } : {}),
  })
  const result = await chat.sendMessageStream(last.content)
  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) yield text
  }
}

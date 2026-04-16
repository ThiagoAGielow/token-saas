// ─────────────────────────────────────────────────────────────────────────────
// lib/ai.js — BYOK AI call resolver
//
// Resolves which API key to use for a given user + provider:
//   1. User's own BYOK key (decrypted from DB)
//   2. Platform key from env (fallback)
//
// Supports: claude | openai | gemini
//
// Usage:
//   const text = await callAI({
//     userId: 'cuid...',
//     provider: 'claude',       // optional — defaults to 'claude'
//     system: 'You are...',     // optional system prompt
//     messages: [{ role: 'user', content: 'Build me a landing page' }],
//   })
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic          from '@anthropic-ai/sdk'
import OpenAI             from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma }         from '@/lib/db'
import { decrypt }        from '@/lib/encryption'

const DEFAULT_PROVIDER = 'claude'

// Model to use per provider
const MODELS = {
  claude: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  gemini: 'gemini-1.5-pro',
}

// ─── Key resolution ───────────────────────────────────────────────────────────

/**
 * Returns the raw API key for a user + provider.
 * Prefers the user's BYOK key; falls back to the platform key.
 *
 * @param {string} userId  — internal DB user ID
 * @param {string} provider — 'claude' | 'openai' | 'gemini'
 * @returns {string} raw API key
 */
export async function resolveApiKey(userId, provider) {
  // Try BYOK key first
  if (userId) {
    const record = await prisma.userAiKey.findUnique({
      where:  { userId_provider: { userId, provider } },
      select: { encryptedKey: true },
    })
    if (record?.encryptedKey) {
      return decrypt(record.encryptedKey)
    }
  }

  // Fall back to platform key
  const platformKey = {
    claude: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
  }[provider]

  if (!platformKey) {
    throw new Error(
      `No API key available for provider "${provider}". ` +
      `Set one in your settings or configure the platform key in env.`
    )
  }

  return platformKey
}

// ─── Main call ────────────────────────────────────────────────────────────────

/**
 * Makes a non-streaming AI call and returns the response text.
 *
 * @param {object} opts
 * @param {string}   opts.userId    — internal DB user ID (for BYOK lookup)
 * @param {string}   [opts.provider]  — 'claude' | 'openai' | 'gemini' (default: 'claude')
 * @param {string}   [opts.system]    — system prompt
 * @param {Array}    opts.messages    — [{ role: 'user'|'assistant', content: string }]
 * @param {number}   [opts.maxTokens] — max output tokens (default: 4096)
 * @returns {Promise<string>} response text
 */
export async function callAI({
  userId,
  provider = DEFAULT_PROVIDER,
  system,
  messages,
  maxTokens = 4096,
}) {
  const apiKey = await resolveApiKey(userId, provider)
  const model  = MODELS[provider]

  switch (provider) {
    case 'claude':
      return callClaude({ apiKey, model, system, messages, maxTokens })
    case 'openai':
      return callOpenAI({ apiKey, model, system, messages, maxTokens })
    case 'gemini':
      return callGemini({ apiKey, model, system, messages, maxTokens })
    default:
      throw new Error(`Unsupported provider: "${provider}"`)
  }
}

// ─── Streaming call ───────────────────────────────────────────────────────────

/**
 * Streaming version of callAI. Returns an async generator that yields text
 * chunks as they arrive from the provider.
 *
 * @param {object} opts — same signature as callAI
 * @yields {string} text chunks
 */
export async function* callAIStream({
  userId,
  provider = DEFAULT_PROVIDER,
  system,
  messages,
  maxTokens = 4096,
}) {
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
    default:
      throw new Error(`Unsupported provider: "${provider}"`)
  }
}

// ─── Provider implementations ─────────────────────────────────────────────────

async function callClaude({ apiKey, model, system, messages, maxTokens }) {
  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages,
  })

  return response.content[0].text
}

async function callOpenAI({ apiKey, model, system, messages, maxTokens }) {
  const client = new OpenAI({ apiKey })

  const openAiMessages = [
    ...(system ? [{ role: 'system', content: system }] : []),
    ...messages,
  ]

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: openAiMessages,
  })

  return response.choices[0].message.content
}

async function callGemini({ apiKey, model, system, messages, maxTokens }) {
  const client    = new GoogleGenerativeAI(apiKey)
  const genModel  = client.getGenerativeModel({ model })

  // Gemini uses a different message format
  const history = messages.slice(0, -1).map((m) => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const lastMessage = messages[messages.length - 1].content

  const chat = genModel.startChat({
    history,
    generationConfig: { maxOutputTokens: maxTokens },
    ...(system ? { systemInstruction: system } : {}),
  })

  const result = await chat.sendMessage(lastMessage)
  return result.response.text()
}

// ─── Streaming provider implementations ──────────────────────────────────────

async function* streamClaude({ apiKey, model, system, messages, maxTokens }) {
  const client = new Anthropic({ apiKey })
  const stream = await client.messages.stream({
    model,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages,
  })
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      yield event.delta.text
    }
  }
}

async function* streamOpenAI({ apiKey, model, system, messages, maxTokens }) {
  const client = new OpenAI({ apiKey })
  const openAiMessages = [
    ...(system ? [{ role: 'system', content: system }] : []),
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

async function* streamGemini({ apiKey, model, system, messages, maxTokens }) {
  const client   = new GoogleGenerativeAI(apiKey)
  const genModel = client.getGenerativeModel({ model })
  const history  = messages.slice(0, -1).map((m) => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const lastMessage = messages[messages.length - 1].content
  const chat = genModel.startChat({
    history,
    generationConfig: { maxOutputTokens: maxTokens },
    ...(system ? { systemInstruction: system } : {}),
  })
  const result = await chat.sendMessageStream(lastMessage)
  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) yield text
  }
}

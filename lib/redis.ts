// ─────────────────────────────────────────────────────────────────────────────
// lib/redis.ts — Upstash Redis client (HTTP-based, serverless-safe)
// ─────────────────────────────────────────────────────────────────────────────

import { Redis } from '@upstash/redis'

// Singleton — re-used across hot-reloads in dev
const globalForRedis = globalThis as unknown as { redis?: Redis }

export const redis: Redis =
  globalForRedis.redis ??
  new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

export const TTL = {
  USER:    60 * 60,      // 1 hour  — user record (immutable after creation)
  BALANCE: 30,           // 30 s    — token balance (invalidated on spend/grant)
  LIST:    60,           // 60 s    — websites / domains / emails lists
} as const

export function userKey(clerkId: string)   { return `user:${clerkId}` }
export function balanceKey(userId: string) { return `balance:${userId}` }

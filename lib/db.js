// ─────────────────────────────────────────────────────────────────────────────
// lib/db.js — Prisma client singleton
//
// Next.js hot-reload creates new module instances in development, which would
// exhaust the PostgreSQL connection pool. We store the client on `globalThis`
// so it survives hot-reloads in dev while production always gets a fresh
// instance per serverless function cold-start.
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client'

const globalForPrisma = /** @type {typeof globalThis & { prisma?: PrismaClient }} */ (
  globalThis
)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

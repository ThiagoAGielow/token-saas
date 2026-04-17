// ─────────────────────────────────────────────────────────────────────────────
// types/dashboard.ts — Shared client-side types used by dashboard pages.
//
// These mirror the shape of JSON responses from /api/* handlers.
// Kept intentionally minimal — only the fields actually consumed by the UI.
// ─────────────────────────────────────────────────────────────────────────────

export interface Website {
  id: string
  name: string
  subdomain: string
  status: 'BUILDING' | 'DRAFT' | 'ACTIVE' | 'PAUSED'
  tokenCost?: number
  prompt?: string
  generatedHtml?: string | null
  githubRepo?: string | null
  githubRepoUrl?: string | null
  vercelProjectId?: string | null
  vercelUrl?: string | null
  publishedAt?: string | null
  createdAt: string
  updatedAt?: string
  domain?: { domain: string; verified: boolean } | null
}

export interface CustomDomain {
  id: string
  domain: string
  verified: boolean
  verificationToken: string
  verifiedAt?: string | null
  createdAt: string
  websiteId?: string | null
}

export interface Availability {
  available: boolean
  reason?: string
}

export interface EmailAccount {
  id: string
  address: string
  domainId: string
  zohoAccountId: string | null
  tokenCost: number
  createdAt: string
  domain: { domain: string; verified: boolean }
}

export interface AIKey {
  id: string
  provider: 'claude' | 'openai' | 'gemini'
  keyHint: string
  createdAt: string
  updatedAt: string
}

export interface TokenTransaction {
  id: string
  type: string
  amount: number
  balanceAfter: number
  description: string | null
  metadata: unknown
  expiresAt: string | null
  createdAt: string
}

export interface TokenGrant {
  id: string
  amount: number
  source: string
  remaining: number
  expiresAt: string | null
  createdAt: string
}

export interface TokensSummary {
  role: 'USER' | 'AGENCY' | 'ADMIN'
  wallet: {
    balance: number
    lifetimeEarned: number
    lifetimeSpent: number
    updatedAt: string
  }
  daysRemaining: number | null
  transactions: TokenTransaction[]
  grants: TokenGrant[]
  costs: Record<string, number>
}

export interface TokenPack {
  id: string
  label: string
  price: number
  tokens: number
  popular: boolean
  priceId?: string
}

export interface Plan {
  id: string
  key: string
  name: string
  price: number
  tokens: number
  priceId?: string
}

export interface AgencyClient {
  id: string
  name: string | null
  email: string
  createdAt: string
  linkedAt: string
  wallet: { balance: number; lifetimeSpent: number } | null
  _count: { websites: number; domains: number; emailAccounts: number }
}

export interface AgencyInvite {
  id: string
  email: string | null
  token: string
  usedAt: string | null
  expiresAt: string
  createdAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// lib/zoho.ts — Zoho Mail Admin API helpers
// ─────────────────────────────────────────────────────────────────────────────

const REGION   = process.env.ZOHO_REGION ?? 'com'
const AUTH_URL = `https://accounts.zoho.${REGION}/oauth/v2/token`
const API_HOST = REGION === 'com' ? 'https://mail.zoho.com' : `https://mail.zoho.${REGION}`
const BASE_URL = (): string => `${API_HOST}/api/organization/${process.env.ZOHO_ORG_ID}`

// Simple in-process token cache (good for one Lambda warm instance)
let _cachedToken: string | null = null
let _tokenExpires = 0

interface ZohoTokenResponse {
  access_token?: string
  expires_in?:   number
  error?:        string
}

interface ZohoApiResponse<T> {
  status?: { code: number; description: string }
  data?:   T
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpires) return _cachedToken

  if (!process.env.ZOHO_CLIENT_ID) {
    throw new Error(
      'Zoho credentials not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORG_ID in your environment variables.',
    )
  }

  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET ?? '',
      refresh_token: process.env.ZOHO_REFRESH_TOKEN ?? '',
    }),
  })

  if (!res.ok) throw new Error(`Zoho auth failed: ${res.status}`)
  const data = (await res.json()) as ZohoTokenResponse
  if (data.error) throw new Error(`Zoho auth error: ${data.error}`)
  if (!data.access_token || !data.expires_in) {
    throw new Error('Zoho auth: malformed response')
  }

  _cachedToken  = data.access_token
  _tokenExpires = Date.now() + (data.expires_in - 60) * 1000
  return _cachedToken
}

// ─── Base fetch ───────────────────────────────────────────────────────────────

async function zohoFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken()

  const res = await fetch(`${BASE_URL()}${path}`, {
    ...options,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  const data = (await res.json()) as ZohoApiResponse<T>

  if (data.status?.code && data.status.code !== 200) {
    throw new Error(data.status.description ?? 'Zoho API error')
  }

  return (data.data ?? (data as unknown as T))
}

// ─── Domain management ────────────────────────────────────────────────────────

export async function addDomainToZoho(domain: string): Promise<unknown> {
  return zohoFetch('/domains', {
    method: 'POST',
    body: JSON.stringify({ domainName: domain }),
  })
}

export async function listZohoDomains(): Promise<unknown> {
  return zohoFetch('/domains')
}

// ─── Account management ───────────────────────────────────────────────────────

export interface CreateZohoAccountOptions {
  username:    string
  domain:      string
  displayName: string
  password:    string
}

export interface CreateZohoAccountResult {
  accountId:    string
  emailAddress: string
}

/**
 * Creates a new mailbox in your Zoho organisation.
 */
export async function createZohoAccount({
  username,
  domain,
  displayName,
  password,
}: CreateZohoAccountOptions): Promise<CreateZohoAccountResult> {
  const data = await zohoFetch<{ accountId?: string; zmId?: string }>('/accounts', {
    method: 'POST',
    body: JSON.stringify({
      primaryEmailAddress: `${username}@${domain}`,
      displayName,
      password,
      roleId: '10',
    }),
  })

  return {
    accountId:    data.accountId ?? data.zmId ?? '',
    emailAddress: `${username}@${domain}`,
  }
}

export async function deleteZohoAccount(zohoAccountId: string): Promise<unknown> {
  return zohoFetch(`/accounts/${zohoAccountId}`, { method: 'DELETE' })
}

// ─── DNS records the user must add ────────────────────────────────────────────

export interface ZohoDnsRecord {
  type:      'MX' | 'TXT'
  host:      string
  value:     string
  priority:  number | null
  ttl:       string
}

export const ZOHO_DNS_RECORDS: ZohoDnsRecord[] = [
  { type: 'MX',  host: '@', value: 'mx.zoho.com',                 priority: 10,   ttl: '1h' },
  { type: 'MX',  host: '@', value: 'mx2.zoho.com',                priority: 20,   ttl: '1h' },
  { type: 'MX',  host: '@', value: 'mx3.zoho.com',                priority: 50,   ttl: '1h' },
  { type: 'TXT', host: '@', value: 'v=spf1 include:zoho.com ~all', priority: null, ttl: '1h' },
]

interface DohResponse {
  Answer?: Array<{ data?: string }>
}

/**
 * Check if a domain already has Zoho MX records set using Cloudflare DoH.
 */
export async function checkZohoMxRecords(domain: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
      { headers: { Accept: 'application/dns-json' } },
    )
    if (!res.ok) return false
    const data = (await res.json()) as DohResponse
    const records = (data.Answer ?? []).map((r) => r.data?.toLowerCase() ?? '')
    return records.some((r) => r.includes('zoho.com'))
  } catch {
    return false
  }
}

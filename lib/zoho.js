// ─────────────────────────────────────────────────────────────────────────────
// lib/zoho.js — Zoho Mail Admin API helpers
//
// Required env vars:
//   ZOHO_CLIENT_ID      — from Zoho Developer Console (Server-based app)
//   ZOHO_CLIENT_SECRET  — from Zoho Developer Console
//   ZOHO_REFRESH_TOKEN  — generated during OAuth consent flow
//   ZOHO_ORG_ID         — your Zoho Mail organisation ID
//   ZOHO_REGION         — optional: 'com' (default) | 'com.au' | 'eu' | 'in'
//
// How to get these:
//   1. Go to https://api-console.zoho.com/ and create a "Server-based Application"
//   2. Add scopes: ZohoMail.organization.accounts.ALL, ZohoMail.organization.domains.ALL
//   3. Generate a grant code and exchange it for a refresh token
//   4. Your Org ID is in https://mail.zoho.com/zm/#settings/organization → API Access
// ─────────────────────────────────────────────────────────────────────────────

const REGION   = process.env.ZOHO_REGION ?? 'com'
const AUTH_URL = `https://accounts.zoho.${REGION}/oauth/v2/token`
const API_HOST = REGION === 'com' ? 'https://mail.zoho.com' : `https://mail.zoho.${REGION}`
const BASE_URL = () => `${API_HOST}/api/organization/${process.env.ZOHO_ORG_ID}`

// Simple in-process token cache (good for one Lambda warm instance)
let _cachedToken  = null
let _tokenExpires = 0

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getAccessToken() {
  if (_cachedToken && Date.now() < _tokenExpires) return _cachedToken

  if (!process.env.ZOHO_CLIENT_ID) {
    throw new Error('Zoho credentials not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORG_ID in your environment variables.')
  }

  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    }),
  })

  if (!res.ok) throw new Error(`Zoho auth failed: ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(`Zoho auth error: ${data.error}`)

  _cachedToken  = data.access_token
  _tokenExpires = Date.now() + (data.expires_in - 60) * 1000 // 60s buffer
  return _cachedToken
}

// ─── Base fetch ───────────────────────────────────────────────────────────────

async function zohoFetch(path, options = {}) {
  const token = await getAccessToken()

  const res = await fetch(`${BASE_URL()}${path}`, {
    ...options,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await res.json()

  // Zoho returns { status: { code: 200, description: '...' }, data: {...} }
  if (data.status?.code && data.status.code !== 200) {
    throw new Error(data.status.description ?? 'Zoho API error')
  }

  return data.data ?? data
}

// ─── Domain management ────────────────────────────────────────────────────────

/**
 * Adds a custom domain to your Zoho Mail organisation.
 * Must be called before creating accounts on that domain.
 * Zoho will verify the domain using a TXT record (separate from our own verification).
 */
export async function addDomainToZoho(domain) {
  return zohoFetch('/domains', {
    method: 'POST',
    body: JSON.stringify({ domainName: domain }),
  })
}

/**
 * Returns all domains already added to the Zoho org.
 */
export async function listZohoDomains() {
  return zohoFetch('/domains')
}

// ─── Account management ───────────────────────────────────────────────────────

/**
 * Creates a new mailbox in your Zoho organisation.
 *
 * @param {object} params
 * @param {string} params.username     - The part before @, e.g. 'hello'
 * @param {string} params.domain       - The domain, e.g. 'myshop.com'
 * @param {string} params.displayName  - Display name shown in emails
 * @param {string} params.password     - Initial password for the account
 * @returns {Promise<{ accountId: string, emailAddress: string }>}
 */
export async function createZohoAccount({ username, domain, displayName, password }) {
  const data = await zohoFetch('/accounts', {
    method: 'POST',
    body: JSON.stringify({
      primaryEmailAddress: `${username}@${domain}`,
      displayName,
      password,
      roleId: '10', // Member role
    }),
  })

  return {
    accountId:    data.accountId ?? data.zmId,
    emailAddress: `${username}@${domain}`,
  }
}

/**
 * Deletes a Zoho mailbox by its Zoho account ID.
 */
export async function deleteZohoAccount(zohoAccountId) {
  return zohoFetch(`/accounts/${zohoAccountId}`, { method: 'DELETE' })
}

// ─── DNS records the user must add ────────────────────────────────────────────

/**
 * The MX and SPF records a domain must have for Zoho Mail to work.
 * Show these to the user in the setup wizard before creating their account.
 */
export const ZOHO_DNS_RECORDS = [
  { type: 'MX',  host: '@', value: 'mx.zoho.com',                     priority: 10,   ttl: '1h' },
  { type: 'MX',  host: '@', value: 'mx2.zoho.com',                    priority: 20,   ttl: '1h' },
  { type: 'MX',  host: '@', value: 'mx3.zoho.com',                    priority: 50,   ttl: '1h' },
  { type: 'TXT', host: '@', value: 'v=spf1 include:zoho.com ~all',     priority: null, ttl: '1h' },
]

/**
 * Check if a domain already has Zoho MX records set using Cloudflare DoH.
 * Returns true if at least one Zoho MX record is detected.
 */
export async function checkZohoMxRecords(domain) {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
      { headers: { Accept: 'application/dns-json' } }
    )
    if (!res.ok) return false
    const data = await res.json()
    const records = (data.Answer ?? []).map((r) => r.data?.toLowerCase() ?? '')
    return records.some((r) => r.includes('zoho.com'))
  } catch {
    return false
  }
}

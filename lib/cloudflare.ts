// ─────────────────────────────────────────────────────────────────────────────
// lib/cloudflare.js — Cloudflare DNS API wrapper
//
// Used for:
//  - Creating per-site subdomain CNAME records (future: individual records)
//  - Verifying custom domain ownership via TXT records (Option A, later)
//  - Deleting DNS records when a domain/site is removed
// ─────────────────────────────────────────────────────────────────────────────

const CF_BASE = 'https://api.cloudflare.com/client/v4'

function getHeaders() {
  const token = process.env.CLOUDFLARE_API_TOKEN
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN is not set')
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function getZoneId() {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  if (!zoneId) throw new Error('CLOUDFLARE_ZONE_ID is not set')
  return zoneId
}

/**
 * Creates a DNS record in the configured Cloudflare zone.
 *
 * @param {{ type: string, name: string, content: string, proxied?: boolean, ttl?: number }} record
 * @returns {Promise<string>} The Cloudflare record ID (store this for later deletion)
 */
export async function createDnsRecord({ type, name, content, proxied = true, ttl = 1 }: { type: string; name: string; content: string; proxied?: boolean; ttl?: number }): Promise<string> {
  const res = await fetch(`${CF_BASE}/zones/${getZoneId()}/dns_records`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ type, name, content, proxied, ttl }),
  })

  const data = await res.json()

  if (!data.success) {
    throw new Error(`Cloudflare DNS create failed: ${JSON.stringify(data.errors)}`)
  }

  return data.result.id
}

/**
 * Deletes a DNS record by its Cloudflare record ID.
 *
 * @param {string} recordId - The Cloudflare DNS record ID
 * @returns {Promise<void>}
 */
export async function deleteDnsRecord(recordId: string): Promise<void> {
  const res = await fetch(`${CF_BASE}/zones/${getZoneId()}/dns_records/${recordId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })

  const data = await res.json()

  if (!data.success) {
    throw new Error(`Cloudflare DNS delete failed: ${JSON.stringify(data.errors)}`)
  }
}

/**
 * Lists all DNS records in the zone, optionally filtered by name or type.
 *
 * @param {{ name?: string, type?: string }} [filters]
 * @returns {Promise<Array>}
 */
export async function listDnsRecords(filters: { name?: string; type?: string } = {}) {
  const params = new URLSearchParams()
  if (filters.name) params.set('name', filters.name)
  if (filters.type) params.set('type', filters.type)

  const res = await fetch(
    `${CF_BASE}/zones/${getZoneId()}/dns_records?${params.toString()}`,
    { headers: getHeaders() }
  )

  const data = await res.json()
  if (!data.success) {
    throw new Error(`Cloudflare DNS list failed: ${JSON.stringify(data.errors)}`)
  }

  return data.result
}

/**
 * Creates a TXT record for custom domain ownership verification.
 * Used in Option A (customer brings their own domain).
 *
 * @param {string} domain - The customer's domain (e.g. 'myshop.com')
 * @param {string} verificationToken - Random token to verify ownership
 * @returns {Promise<string>} Cloudflare record ID
 */
export async function createVerificationRecord(domain: string, verificationToken: string): Promise<string> {
  return createDnsRecord({
    type: 'TXT',
    name: `_velocitysites-verify.${domain}`,
    content: verificationToken,
    proxied: false,
    ttl: 300,
  })
}

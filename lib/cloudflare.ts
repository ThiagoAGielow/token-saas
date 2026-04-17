// ─────────────────────────────────────────────────────────────────────────────
// lib/cloudflare.ts — Cloudflare DNS API wrapper
// ─────────────────────────────────────────────────────────────────────────────

const CF_BASE = 'https://api.cloudflare.com/client/v4'

interface CloudflareResponse<T> {
  success: boolean
  errors: unknown[]
  messages: unknown[]
  result: T
}

export interface DnsRecord {
  id?: string
  type: string
  name: string
  content: string
  proxied?: boolean
  ttl?: number
}

function getHeaders(): HeadersInit {
  const token = process.env.CLOUDFLARE_API_TOKEN
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN is not set')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function getZoneId(): string {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  if (!zoneId) throw new Error('CLOUDFLARE_ZONE_ID is not set')
  return zoneId
}

/**
 * Creates a DNS record in the configured Cloudflare zone.
 * Returns the Cloudflare record ID (store this for later deletion).
 */
export async function createDnsRecord({
  type,
  name,
  content,
  proxied = true,
  ttl = 1,
}: DnsRecord): Promise<string> {
  const res = await fetch(`${CF_BASE}/zones/${getZoneId()}/dns_records`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ type, name, content, proxied, ttl }),
  })

  const data = (await res.json()) as CloudflareResponse<{ id: string }>

  if (!data.success) {
    throw new Error(`Cloudflare DNS create failed: ${JSON.stringify(data.errors)}`)
  }

  return data.result.id
}

/**
 * Deletes a DNS record by its Cloudflare record ID.
 */
export async function deleteDnsRecord(recordId: string): Promise<void> {
  const res = await fetch(
    `${CF_BASE}/zones/${getZoneId()}/dns_records/${recordId}`,
    { method: 'DELETE', headers: getHeaders() },
  )

  const data = (await res.json()) as CloudflareResponse<unknown>

  if (!data.success) {
    throw new Error(`Cloudflare DNS delete failed: ${JSON.stringify(data.errors)}`)
  }
}

/**
 * Lists all DNS records in the zone, optionally filtered by name or type.
 */
export async function listDnsRecords(
  filters: { name?: string; type?: string } = {},
): Promise<DnsRecord[]> {
  const params = new URLSearchParams()
  if (filters.name) params.set('name', filters.name)
  if (filters.type) params.set('type', filters.type)

  const res = await fetch(
    `${CF_BASE}/zones/${getZoneId()}/dns_records?${params.toString()}`,
    { headers: getHeaders() },
  )

  const data = (await res.json()) as CloudflareResponse<DnsRecord[]>
  if (!data.success) {
    throw new Error(`Cloudflare DNS list failed: ${JSON.stringify(data.errors)}`)
  }

  return data.result
}

/**
 * Creates a TXT record for custom domain ownership verification.
 */
export async function createVerificationRecord(
  domain: string,
  verificationToken: string,
): Promise<string> {
  return createDnsRecord({
    type: 'TXT',
    name: `_velocitysites-verify.${domain}`,
    content: verificationToken,
    proxied: false,
    ttl: 300,
  })
}

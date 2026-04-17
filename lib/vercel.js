// ─────────────────────────────────────────────────────────────────────────────
// lib/vercel.js — Vercel project + deployment management
//
// Creates one Vercel project per site, linked to its GitHub repo.
// Vercel auto-deploys on every GitHub push (requires GitHub integration
// to be connected in the Vercel dashboard — one-time manual setup).
//
// Required env vars:
//   VERCEL_TOKEN    — API token from vercel.com/account/tokens
//   VERCEL_TEAM_ID  — team ID (e.g. "team_xxxx") — omit for personal accounts
//   GITHUB_ORG      — GitHub org that owns the repos (shared with lib/github.js)
//
// Usage:
//   const { projectId, vercelUrl } = await createVercelProject({ repoName, siteName })
//   await addDomainToProject(projectId, 'mysite.com')
// ─────────────────────────────────────────────────────────────────────────────

const VERCEL_API = 'https://api.vercel.com'

function getHeaders() {
  const token = process.env.VERCEL_TOKEN
  if (!token) throw new Error('VERCEL_TOKEN is not set')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

/** Appends ?teamId=... when VERCEL_TEAM_ID is set */
function teamQuery(base = '') {
  const teamId = process.env.VERCEL_TEAM_ID
  if (!teamId) return base
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}teamId=${teamId}`
}

async function vercelFetch(path, options = {}) {
  const res  = await fetch(`${VERCEL_API}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers || {}) },
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Vercel API error ${res.status}: ${data?.error?.message || JSON.stringify(data)}`)
  }
  return data
}

// ─── Create a Vercel project linked to a GitHub repo ─────────────────────────

/**
 * Creates a Vercel project and links it to the site's GitHub repo.
 * Vercel will auto-deploy the repo on every push once the GitHub
 * integration is connected (one-time setup in Vercel dashboard).
 *
 * @param {{ repoName: string, siteName: string }} opts
 * @returns {Promise<{ projectId: string, vercelUrl: string | null }>}
 */
export async function createVercelProject({ repoName, siteName }) {
  const org = process.env.GITHUB_ORG
  if (!org) throw new Error('GITHUB_ORG is not set')

  // ── Create the project ─────────────────────────────────────────────────────
  const project = await vercelFetch(teamQuery('/v10/projects'), {
    method: 'POST',
    body: JSON.stringify({
      name:            repoName,          // e.g. "site-my-shop"
      framework:       null,              // static site — no framework
      buildCommand:    '',
      outputDirectory: '.',
      gitRepository: {
        type: 'github',
        repo: `${org}/${repoName}`,       // e.g. "iosams-sites/site-my-shop"
      },
    }),
  })

  const projectId = project.id

  // ── Wait briefly then fetch the first deployment URL ──────────────────────
  // Vercel triggers a deployment immediately after the project is linked.
  // We poll once after a short delay; if not ready yet we return null and
  // the dashboard will show "Deploying…" with the project link instead.
  await new Promise(r => setTimeout(r, 3000))
  const vercelUrl = await getProductionUrl(projectId)

  return { projectId, vercelUrl }
}

// ─── Get the production deployment URL ───────────────────────────────────────

/**
 * Returns the URL of the latest production deployment for a project,
 * or null if no successful deployment exists yet.
 *
 * @param {string} projectId
 * @returns {Promise<string | null>}
 */
export async function getProductionUrl(projectId) {
  try {
    const data = await vercelFetch(
      teamQuery(`/v6/deployments?projectId=${projectId}&target=production&limit=1&sort=createdAt&order=desc`)
    )
    const deployment = data.deployments?.[0]
    if (!deployment) return null
    return `https://${deployment.url}`
  } catch {
    return null
  }
}

// ─── Add a custom domain to a Vercel project ─────────────────────────────────

/**
 * Adds a custom domain (or subdomain) to a Vercel project.
 * The domain must have its DNS pointing to Vercel (76.76.21.21 or CNAME cname.vercel-dns.com).
 * Used when a user connects their own domain or when assigning the platform subdomain.
 *
 * @param {string} projectId
 * @param {string} domain — e.g. "mysite.com" or "mysite.velocitysites.com.au"
 * @returns {Promise<void>}
 */
export async function addDomainToProject(projectId, domain) {
  await vercelFetch(teamQuery(`/v10/projects/${projectId}/domains`), {
    method: 'POST',
    body:   JSON.stringify({ name: domain }),
  })
}

// ─── Remove a custom domain from a Vercel project ────────────────────────────

/**
 * Removes a domain from a Vercel project.
 *
 * @param {string} projectId
 * @param {string} domain
 * @returns {Promise<void>}
 */
export async function removeDomainFromProject(projectId, domain) {
  await vercelFetch(teamQuery(`/v10/projects/${projectId}/domains/${domain}`), {
    method: 'DELETE',
  })
}

// ─── Get deployment status ────────────────────────────────────────────────────

/**
 * Returns the current deployment status for a project.
 * Useful for polling from the dashboard.
 *
 * @param {string} projectId
 * @returns {Promise<{ status: string, url: string | null }>}
 */
export async function getDeploymentStatus(projectId) {
  try {
    const data = await vercelFetch(
      teamQuery(`/v6/deployments?projectId=${projectId}&limit=1&sort=createdAt&order=desc`)
    )
    const d = data.deployments?.[0]
    if (!d) return { status: 'QUEUED', url: null }
    return {
      status: d.state,               // QUEUED | BUILDING | READY | ERROR | CANCELED
      url:    d.state === 'READY' ? `https://${d.url}` : null,
    }
  } catch {
    return { status: 'UNKNOWN', url: null }
  }
}

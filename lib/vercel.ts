// ─────────────────────────────────────────────────────────────────────────────
// lib/vercel.ts — Vercel project + deployment management
// ─────────────────────────────────────────────────────────────────────────────

const VERCEL_API = 'https://api.vercel.com'

interface VercelError {
  error?: { message?: string }
}

interface VercelProject {
  id: string
}

interface VercelDeployment {
  url: string
  state: string
}

interface VercelDeploymentsResponse {
  deployments?: VercelDeployment[]
}

function getHeaders(): HeadersInit {
  const token = process.env.VERCEL_TOKEN
  if (!token) throw new Error('VERCEL_TOKEN is not set')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

/** Appends ?teamId=... when VERCEL_TEAM_ID is set */
function teamQuery(base = ''): string {
  const teamId = process.env.VERCEL_TEAM_ID
  if (!teamId) return base
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}teamId=${teamId}`
}

async function vercelFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${VERCEL_API}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers ?? {}) },
  })
  const data = (await res.json()) as T & VercelError
  if (!res.ok) {
    throw new Error(
      `Vercel API error ${res.status}: ${data?.error?.message ?? JSON.stringify(data)}`,
    )
  }
  return data
}

export interface CreateVercelProjectOptions {
  repoName: string
  siteName: string
}

export interface CreateVercelProjectResult {
  projectId: string
  vercelUrl: string | null
}

/**
 * Creates a Vercel project and links it to the site's GitHub repo.
 */
export async function createVercelProject({
  repoName,
}: CreateVercelProjectOptions): Promise<CreateVercelProjectResult> {
  const org = process.env.GITHUB_ORG
  if (!org) throw new Error('GITHUB_ORG is not set')

  const project = await vercelFetch<VercelProject>(teamQuery('/v10/projects'), {
    method: 'POST',
    body: JSON.stringify({
      name:            repoName,
      framework:       null,
      buildCommand:    '',
      outputDirectory: '.',
      gitRepository: {
        type: 'github',
        repo: `${org}/${repoName}`,
      },
    }),
  })

  // Return immediately — first deploy is triggered by the GitHub push.
  // vercelUrl will be populated later via the deployment-status polling endpoint.
  return { projectId: project.id, vercelUrl: null }
}

/**
 * Returns the URL of the latest production deployment for a project,
 * or null if no successful deployment exists yet.
 */
export async function getProductionUrl(projectId: string): Promise<string | null> {
  try {
    const data = await vercelFetch<VercelDeploymentsResponse>(
      teamQuery(
        `/v6/deployments?projectId=${projectId}&target=production&limit=1&sort=createdAt&order=desc`,
      ),
    )
    const deployment = data.deployments?.[0]
    if (!deployment) return null
    return `https://${deployment.url}`
  } catch {
    return null
  }
}

/**
 * Adds a custom domain (or subdomain) to a Vercel project.
 */
export async function addDomainToProject(
  projectId: string,
  domain: string,
): Promise<void> {
  await vercelFetch(teamQuery(`/v10/projects/${projectId}/domains`), {
    method: 'POST',
    body:   JSON.stringify({ name: domain }),
  })
}

/**
 * Removes a domain from a Vercel project.
 */
export async function removeDomainFromProject(
  projectId: string,
  domain: string,
): Promise<void> {
  await vercelFetch(teamQuery(`/v10/projects/${projectId}/domains/${domain}`), {
    method: 'DELETE',
  })
}

/**
 * Returns the current deployment status for a project.
 */
export async function getDeploymentStatus(
  projectId: string,
): Promise<{ status: string; url: string | null }> {
  try {
    const data = await vercelFetch<VercelDeploymentsResponse>(
      teamQuery(`/v6/deployments?projectId=${projectId}&limit=1&sort=createdAt&order=desc`),
    )
    const d = data.deployments?.[0]
    if (!d) return { status: 'QUEUED', url: null }
    return {
      status: d.state,
      url:    d.state === 'READY' ? `https://${d.url}` : null,
    }
  } catch {
    return { status: 'UNKNOWN', url: null }
  }
}

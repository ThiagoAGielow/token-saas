// ─────────────────────────────────────────────────────────────────────────────
// lib/github.ts — GitHub repo provisioning for generated sites
// ─────────────────────────────────────────────────────────────────────────────

import { Octokit } from '@octokit/rest'

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN is not set')
  return new Octokit({ auth: token })
}

function getOrg(): string {
  const org = process.env.GITHUB_ORG
  if (!org) throw new Error('GITHUB_ORG is not set')
  return org
}

// Vercel static-site config — no build step, serve the directory as-is
const VERCEL_JSON = JSON.stringify(
  { buildCommand: null, outputDirectory: '.', framework: null },
  null,
  2,
)

// ─── Simple site provisioning (legacy) ───────────────────────────────────────

export interface ProvisionSiteOptions {
  id?: string
  name: string
  subdomain: string
  generatedHtml: string
}

export interface ProvisionSiteResult {
  repoName: string
  repoUrl:  string
}

/**
 * Creates a private GitHub repo for a site and pushes the initial files.
 */
export async function provisionSiteRepo({
  name,
  subdomain,
  generatedHtml,
}: ProvisionSiteOptions): Promise<ProvisionSiteResult> {
  const octokit  = getOctokit()
  const org      = getOrg()
  const repoName = `site-${subdomain}`

  const { data: repo } = await octokit.repos.createInOrg({
    org,
    name:        repoName,
    description: `VelocitySites — ${name}`,
    private:     true,
    auto_init:   false,
  })

  await octokit.repos.createOrUpdateFileContents({
    owner:   org,
    repo:    repoName,
    path:    'index.html',
    message: `feat: initial site — ${name}`,
    content: Buffer.from(generatedHtml, 'utf8').toString('base64'),
  })

  await octokit.repos.createOrUpdateFileContents({
    owner:   org,
    repo:    repoName,
    path:    'vercel.json',
    message: 'chore: add Vercel static site config',
    content: Buffer.from(VERCEL_JSON, 'utf8').toString('base64'),
  })

  return {
    repoName,
    repoUrl: repo.html_url,
  }
}

export interface UpdateSiteHtmlOptions {
  repoName: string
  html: string
  message?: string
}

/**
 * Updates index.html in an existing site repo with new HTML content.
 */
export async function updateSiteHtml({
  repoName,
  html,
  message = 'feat: AI update',
}: UpdateSiteHtmlOptions): Promise<void> {
  const octokit = getOctokit()
  const org     = getOrg()

  const { data: current } = await octokit.repos.getContent({
    owner: org,
    repo:  repoName,
    path:  'index.html',
  })

  if (Array.isArray(current) || !('sha' in current)) {
    throw new Error('Unexpected GitHub response: index.html is not a file')
  }

  await octokit.repos.createOrUpdateFileContents({
    owner:   org,
    repo:    repoName,
    path:    'index.html',
    message,
    content: Buffer.from(html, 'utf8').toString('base64'),
    sha:     current.sha,
  })
}

// ─── Template-based client repo provisioning ─────────────────────────────────

export interface ProvisionClientRepoOptions {
  clientName: string
  subdomain: string
  tier: 'static' | 'payloadcms'
  generatedHtml?: string
}

export interface ProvisionClientRepoResult {
  repoName: string
  repoUrl: string
}

/**
 * Provisions a new client repo by cloning from a template repo.
 * For 'static' tier: clones saas-website-ai-builder
 * For 'payloadcms' tier: clones payloadcms-template
 */
export async function provisionClientRepo({
  clientName,
  subdomain,
  tier,
  generatedHtml,
}: ProvisionClientRepoOptions): Promise<ProvisionClientRepoResult> {
  const octokit = getOctokit()
  const org = getOrg()
  const repoName = `client-${subdomain}`

  // 1. Create empty repo
  const { data: repo } = await octokit.repos.createInOrg({
    org,
    name: repoName,
    description: `${clientName} — ${tier} tier`,
    private: true,
    auto_init: false,
  })

  // 2. Determine template repo
  const templateRepo = tier === 'static'
    ? process.env.GITHUB_TEMPLATE_STATIC || 'saas-website-ai-builder'
    : process.env.GITHUB_TEMPLATE_PAYLOAD || 'payloadcms-template'

  // 3. Clone all files from template
  await cloneRepoContents(octokit, org, templateRepo, repoName)

  // 4. If static tier + HTML provided, overwrite index.html
  if (tier === 'static' && generatedHtml) {
    await updateFileInRepo(octokit, org, repoName, 'index.html', generatedHtml, 'feat: AI-generated initial site')
  }

  return {
    repoName,
    repoUrl: repo.html_url,
  }
}

/**
 * Recursively clones all files from sourceRepo to targetRepo.
 */
async function cloneRepoContents(
  octokit: Octokit,
  org: string,
  sourceRepo: string,
  targetRepo: string,
  path = ''
): Promise<void> {
  const { data: contents } = await octokit.repos.getContent({
    owner: org,
    repo: sourceRepo,
    path,
  })

  if (!Array.isArray(contents)) return

  for (const item of contents) {
    if (item.type === 'file' && item.download_url) {
      const response = await fetch(item.download_url)
      const content = await response.text()

      await octokit.repos.createOrUpdateFileContents({
        owner: org,
        repo: targetRepo,
        path: item.path,
        message: `chore: clone from ${sourceRepo}`,
        content: Buffer.from(content, 'utf8').toString('base64'),
      })
    } else if (item.type === 'dir') {
      await cloneRepoContents(octokit, org, sourceRepo, targetRepo, item.path)
    }
  }
}

/**
 * Updates a single file in a repo (creates if doesn't exist).
 */
async function updateFileInRepo(
  octokit: Octokit,
  org: string,
  repo: string,
  path: string,
  content: string,
  message: string
): Promise<void> {
  try {
    const { data: existing } = await octokit.repos.getContent({
      owner: org,
      repo,
      path,
    })

    if (!Array.isArray(existing) && 'sha' in existing) {
      await octokit.repos.createOrUpdateFileContents({
        owner: org,
        repo,
        path,
        message,
        content: Buffer.from(content, 'utf8').toString('base64'),
        sha: existing.sha,
      })
      return
    }
  } catch {
    // File doesn't exist, create it
  }

  await octokit.repos.createOrUpdateFileContents({
    owner: org,
    repo,
    path,
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
  })
}

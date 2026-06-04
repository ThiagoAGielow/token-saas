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

/**
 * Adds a GitHub user as a collaborator (maintain permission) on a site repo.
 */
export async function addCollaborator(repoName: string, username: string): Promise<void> {
  const octokit = getOctokit()
  const org     = getOrg()

  await octokit.repos.addCollaborator({
    owner:      org,
    repo:       repoName,
    username,
    permission: 'maintain',
  })
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

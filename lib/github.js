// ─────────────────────────────────────────────────────────────────────────────
// lib/github.js — GitHub repo provisioning for generated sites
//
// Creates one private repo per site under the platform GitHub org.
// The repo contains:
//   index.html  — the AI-generated site HTML
//   vercel.json — tells Vercel to serve it as a static site (no build step)
//
// Required env vars:
//   GITHUB_TOKEN  — Personal Access Token or GitHub App token
//                   Scopes needed: repo (create, push) + read:org
//   GITHUB_ORG    — GitHub org name (e.g. "iosams-sites")
//
// Usage:
//   const { repoName, repoUrl } = await provisionSiteRepo(website)
//   await updateSiteHtml({ repoName, html, message })
// ─────────────────────────────────────────────────────────────────────────────

import { Octokit } from '@octokit/rest'

function getOctokit() {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN is not set')
  return new Octokit({ auth: token })
}

function getOrg() {
  const org = process.env.GITHUB_ORG
  if (!org) throw new Error('GITHUB_ORG is not set')
  return org
}

// Vercel static-site config — no build step, serve the directory as-is
const VERCEL_JSON = JSON.stringify({ buildCommand: null, outputDirectory: '.', framework: null }, null, 2)

// ─── Provision a new repo for a site ─────────────────────────────────────────

/**
 * Creates a private GitHub repo for a site and pushes the initial files.
 *
 * @param {{ id: string, name: string, subdomain: string, generatedHtml: string }} website
 * @returns {Promise<{ repoName: string, repoUrl: string }>}
 */
export async function provisionSiteRepo({ name, subdomain, generatedHtml }) {
  const octokit  = getOctokit()
  const org      = getOrg()
  const repoName = `site-${subdomain}`

  // ── Create the repo ────────────────────────────────────────────────────────
  const { data: repo } = await octokit.repos.createInOrg({
    org,
    name:        repoName,
    description: `VelocitySites — ${name}`,
    private:     true,
    auto_init:   false, // we'll push the first commit manually
  })

  // ── Push index.html ────────────────────────────────────────────────────────
  await octokit.repos.createOrUpdateFileContents({
    owner:   org,
    repo:    repoName,
    path:    'index.html',
    message: `feat: initial site — ${name}`,
    content: Buffer.from(generatedHtml, 'utf8').toString('base64'),
  })

  // ── Push vercel.json ───────────────────────────────────────────────────────
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

// ─── Update index.html after an AI edit ──────────────────────────────────────

/**
 * Updates index.html in an existing site repo with new HTML content.
 * Used by the AI chat assistant (SAA-38) when the user requests site changes.
 *
 * @param {{ repoName: string, html: string, message?: string }} opts
 * @returns {Promise<void>}
 */
export async function updateSiteHtml({ repoName, html, message = 'feat: AI update' }) {
  const octokit = getOctokit()
  const org     = getOrg()

  // Get the current file SHA (required by GitHub API to update a file)
  const { data: current } = await octokit.repos.getContent({
    owner: org,
    repo:  repoName,
    path:  'index.html',
  })

  await octokit.repos.createOrUpdateFileContents({
    owner:   org,
    repo:    repoName,
    path:    'index.html',
    message,
    content: Buffer.from(html, 'utf8').toString('base64'),
    sha:     current.sha,
  })
}

# VelocitySites — Detailed Flow Chart

## User Journey

```
SIGN UP
  │
  ├─ Clerk auth (email / OAuth)
  ├─ Internal User record created (Prisma)
  ├─ Token wallet created (100 free trial tokens)
  ├─ OpenRouter sub-key auto-provisioned (background)
  └─ Redirect → /dashboard

DASHBOARD
  │
  ├─ Overview: token balance, sites count, recent activity
  ├─ Websites: list of all sites with status + thumbnails
  ├─ Domains: custom domain management
  ├─ Tokens: balance, transaction history, buy more
  ├─ Settings: OpenRouter key status, BYOK keys, GitHub username
  └─ API Keys: platform API keys (Unkey)

BUY TOKENS
  │
  ├─ Stripe Checkout (one-off pack or subscription)
  ├─ Stripe webhook → credits tokens to wallet
  └─ TokenGrant created (monthly grants expire, packs don't)
```

---

## Create New Site

```
User fills form: name, subdomain, prompt, template
  │
  ▼
POST /api/websites
  │
  ├─ 1. Validate inputs
  ├─ 2. Check balance ≥ 50 tokens  →  [402 if insufficient]
  ├─ 3. Create Website (status: BUILDING)
  ├─ 4. Deduct 50 tokens (atomic, FIFO grant drain)
  │
  ├─ 5. AI generates HTML
  │     └─ OpenRouter (user's provisioned sub-key)
  │     └─ System prompt + template style guidelines
  │     └─ Returns raw HTML (strips markdown wrappers)
  │
  ├─ 6. [parallel] GitHub provisioning
  │     ├─ Create private repo: client-{subdomain}
  │     ├─ Push index.html (AI-generated)
  │     └─ Push vercel.json (static build config)
  │
  ├─ 6. [parallel] Vercel provisioning
  │     ├─ Create Vercel project: client-{subdomain}
  │     ├─ Link to GitHub repo
  │     └─ Auto-deploy triggered by GitHub push
  │
  ├─ 7. Update Website record:
  │     generatedHtml, githubRepo, githubRepoUrl,
  │     vercelProjectId, status: ACTIVE
  │
  └─ 8. Return website to client
        └─ Dashboard shows site card with "Deploying…" spinner
        └─ Polls /api/websites/[id]/deployment-status every 5s
        └─ Shows live Vercel URL when status → READY (~30-60s)
```

---

## Edit Site (AI Chat)

```
User types message in chat panel
  │
  ▼
POST /api/websites/[id]/chat
  │
  ├─ 1. Check balance ≥ 3 tokens  →  [402 if insufficient]
  ├─ 2. Deduct 3 tokens
  ├─ 3. Build message history (last 20 messages)
  ├─ 4. Stream response from OpenRouter (SSE)
  │
  ├─ 5. Client receives chunks:
  │     ├─ type: "chunk" → append to streaming display
  │     ├─ type: "done"  → stream complete
  │     └─ type: "error" → show error
  │
  ├─ 6. Extract <HTML_UPDATE>...</HTML_UPDATE> from response
  │     └─ Live-update iframe preview as chunks arrive
  │
  ├─ 7. [on done] Save ChatMessage records (user + assistant)
  ├─ 8. Update generatedHtml in DB (if HTML update found)
  └─ 9. [background] Push updated index.html to GitHub repo
        └─ Vercel auto-deploys the change
```

---

## Regenerate Site

```
User clicks Regenerate (confirms modal, costs 5 tokens)
  │
  ▼
POST /api/websites/[id]/regenerate
  │
  ├─ 1. Check balance ≥ 5 tokens  →  [402 if insufficient]
  ├─ 2. Deduct 5 tokens
  ├─ 3. Re-run AI on original prompt (full regeneration)
  ├─ 4. Stream HTML to client (live preview updates)
  ├─ 5. [atomic transaction] Update generatedHtml + clear chat history
  └─ 6. [background] Push new index.html to GitHub → Vercel redeploys
```

---

## Direct Code Edit (Code Tab)

```
User switches to Code tab in website editor
  │
  ├─ Editor loads current generatedHtml
  ├─ User edits HTML directly (textarea, Tab = 2 spaces)
  ├─ Amber dot appears (unsaved changes)
  │
  └─ User clicks Save
        │
        ▼
      PATCH /api/websites/[id]/html
        ├─ Validate ownership
        ├─ Save new HTML to DB
        └─ Preview iframe refreshes
        (Note: GitHub/Vercel not updated on direct code edit — future scope)
```

---

## Custom Domain

```
User enters domain in /dashboard/domains
  │
  ▼
POST /api/domains
  │
  ├─ 1. Check balance ≥ 20 tokens
  ├─ 2. Deduct 20 tokens
  ├─ 3. Generate verification TXT record token
  ├─ 4. Create Domain record (verified: false)
  └─ 5. Show DNS instructions to user

User adds TXT record to their DNS
  │
  ▼
POST /api/domains/verify
  │
  ├─ 1. DNS lookup for TXT record
  ├─ 2. If found: mark domain verified
  ├─ 3. Add domain to Vercel project (if website linked)
  └─ 4. Add domain to Cloudflare DNS (CNAME to Vercel)
```

---

## Platform Subdomain Routing

```
Request: mysite.velocitysites.com.au
  │
  ├─ Cloudflare DNS → Vercel
  ├─ Middleware checks subdomain
  └─ /site/[subdomain] → serves generatedHtml from DB
     (fallback while Vercel deployment is building)
```

---

## Open Architecture Questions

### 1. Secrets per client (Tier 2 / PayloadCMS)
**Question:** Where are client-specific env vars stored and how are they injected?
**Current plan:** Vercel env vars API — `POST /v9/projects/{id}/env` with `MONGODB_URI` per project.
**Alternative:** Encrypted secrets store in Supabase, decrypted at deploy time.

### 2. Client GitHub access
**Question:** Can clients invite their own developers to the site repo?
**Current state:** Yes — "Invite to GitHub" button in the website editor. Client saves GitHub username in Settings → the platform invites them as a `maintain`-level collaborator.
**Future:** Allow multiple collaborators, manage team access.

### 3. Feature branch workflow
**Question:** Should AI commits go to a feature branch instead of `main`?
**Tradeoffs:**
- Branch → PR: client reviews changes before they go live. More trust. Adds complexity.
- Direct to main: simpler, faster. Less control for client.
**Current state:** AI commits directly to `main` — Vercel deploys immediately.
**Future scope:** optional "review before deploy" mode.

### 4. AI diff preview
**Question:** Show clients a diff of what the AI will change before committing.
**Why:** Builds trust. Lovable does this — users see exactly what changes.
**Current state:** Not implemented. AI edits go live immediately on save.
**Future scope:** Stage changes, show diff, require confirmation before push to GitHub.

### 5. PayloadCMS tier rollout
**Question:** When to offer Tier 2 (full CMS app) vs Tier 1 (static HTML)?
**Current state:** All sites are Tier 1 (static HTML).
**Trigger for Tier 2:** Client needs a CMS admin UI, dynamic content, or user auth on their site.
**Infrastructure needed:** MongoDB Atlas per-client DB + PayloadCMS template repo + env var injection into Vercel project.

### 6. AI auto-fix loop on build failure
**Question:** If a Vercel build fails (bad HTML/JS), should the AI automatically attempt a fix?
**Current state:** Not implemented. Build failures are visible in deployment-status but not acted on.
**Future scope:** Webhook from Vercel on build failure → re-invoke AI with error context → push fix.

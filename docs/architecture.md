# VelocitySites — Architecture & Business Flow

## Business Model

VelocitySites is a managed AI website builder with SaaS token economics.

**Core loop:**
1. Client signs up and buys a token pack or subscription via Stripe
2. Client spends tokens on AI-driven site builds, edits, and regenerations
3. Platform buys AI compute at wholesale (OpenRouter per-user sub-keys) and charges retail via tokens
4. Margin = spread between wholesale AI cost and retail token price

**Token costs (current):**

| Action | Cost |
|--------|------|
| Create website | 50 tokens |
| Chat / AI edit | 3 tokens |
| Regenerate site | 5 tokens |
| Add custom domain | 20 tokens |
| Add email account | 10 tokens |

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) |
| Auth | Clerk |
| Payments | Stripe (subscriptions + one-off packs) |
| Database | Prisma + Supabase (PostgreSQL, Sydney region) |
| Cache | Upstash Redis (token balance, user session) |
| AI | OpenRouter — per-user provisioned sub-keys |
| Repo hosting | GitHub — one private repo per client site |
| Site hosting | Vercel — one project per client site |
| DNS | Cloudflare — subdomain + custom domain wiring |
| Email accounts | Zoho Mail |
| Transactional email | Resend |
| API key management | Unkey |

---

## Multi-Tenancy Model

Each client site gets isolated infrastructure:

```
GitHub:  ThiagoAGielow/client-{subdomain}   (private repo)
Vercel:  project client-{subdomain}          (auto-deploys on push)
Domain:  {subdomain}.velocitysites.com.au    (platform subdomain)
         {custom-domain}                     (optional, via Cloudflare + Vercel)
```

All Vercel projects live under one Vercel account. All GitHub repos live under one GitHub org/user. The platform retains full control — clients get collaborator access as a paid add-on.

---

## Site Tiers

### Tier 1 — Static HTML (current)
- Single `index.html` with Tailwind CDN
- AI generates and edits HTML in-browser via chat
- Stored in Supabase DB (`generatedHtml` field)
- Deployed to Vercel as a static file
- No server, no database per client

### Tier 2 — PayloadCMS App (future)
- Full Next.js + PayloadCMS app per client
- MongoDB Atlas database per client (shared cluster, one DB per client)
- Client gets an admin UI they can use after handoff
- Requires dedicated Vercel project with env var injection (`MONGODB_URI`)

---

## Infrastructure Provisioning Flow

When a user creates a new site:

```
1.  Validate inputs (name, subdomain, prompt)
2.  Check token balance ≥ 50
3.  Create Website record (status: BUILDING)
4.  Deduct 50 tokens from wallet
5.  AI generates HTML (OpenRouter, user's provisioned sub-key)
6.  [parallel] GitHub: create repo client-{subdomain}, push index.html + vercel.json
6.  [parallel] Vercel: create project linked to GitHub repo
7.  Store githubRepo, githubRepoUrl, vercelProjectId on Website record
8.  Set Website status → ACTIVE
9.  Return to client
10. Vercel auto-deploys from GitHub push (~30-60s)
11. Dashboard polls /api/websites/[id]/deployment-status → shows live URL
```

Both GitHub and Vercel provisioning are fire-and-fail-gracefully — a failure in either does not block the response or lose the user's tokens.

---

## Token Accounting

- Every AI call checks balance **before** executing (hard gate, returns 402 if insufficient)
- Tokens are deducted atomically using FIFO grant draining (oldest grants expire first)
- Balance is Redis-cached (30s TTL) to avoid DB hits on every request
- Full ledger in `TokenTransaction` table (immutable audit trail)
- Token grants track remaining balance per grant for correct expiry + rollover

---

## AI Key Architecture (OpenRouter)

- Platform holds one **Management API key** (`OPENROUTER_PROVISIONER_KEY`)
- On user signup, a **personal sub-key** is auto-provisioned per user
- Sub-key is AES-256-GCM encrypted and stored in `OpenRouterProvisionedKey` table
- Every AI call decrypts and uses the user's own sub-key — spend is isolated per user
- Users can view their key status and sync credit usage from Settings → OpenRouter AI

---

## Key Design Decisions

**1. One GitHub repo + one Vercel project per site (not per user)**
Each *site* gets its own repo/project, not each user. A user can own multiple sites, each with independent repos and deployments.

**2. HTML stored in DB + GitHub**
`generatedHtml` in Supabase is the source of truth for the platform preview. GitHub is the source of truth for Vercel deployments. When AI edits HTML, it updates both.

**3. Token deduction before AI call**
Tokens are reserved before the AI call fires. This prevents unbounded spend if an AI call loops or errors.

**4. OpenRouter as default, BYOK as override**
Platform uses OpenRouter with per-user sub-keys by default. Users can optionally connect their own Claude/OpenAI/Gemini keys via Settings → BYOK.

---

## Open Questions

1. **Secrets per client** — For Tier 2 (PayloadCMS), how are client-specific secrets (e.g. `MONGODB_URI`) stored and injected? Current plan: Vercel env vars API (`POST /v9/projects/{id}/env`).

2. **Client GitHub access** — Can clients invite their own developers to the repo? Currently implemented as a paid feature via "Invite to GitHub" button (requires client to save their GitHub username in Settings).

3. **Feature branch workflow** — Should AI commits go to a feature branch (with a PR) instead of directly to `main`? This preserves client control but adds complexity. Tracked as future scope.

4. **AI diff preview** — Show clients what the AI intends to change before committing (like Lovable). Builds trust. Tracked as future scope.

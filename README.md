# TokenFlow

> Bring your own AI. Build your online presence. Pay only for what you use.

## What is TokenFlow?

TokenFlow is a SaaS platform that lets you use your own AI API keys (Claude, GPT-4, Gemini) to build websites, manage domains, and set up email — all from a single dashboard with a single token wallet.

No more juggling multiple subscriptions. No more paying for AI you don't use.

## How it works

1. **Sign up free** — get 100 tokens to start, no credit card required
2. **Connect your AI key** — paste your Anthropic, OpenAI, or Google API key
3. **Build** — use your own API credits to create websites, set up domains, configure email
4. **Top up when needed** — when your API credits run low, buy TokenFlow tokens to keep going

## Why TokenFlow?

| The old way | TokenFlow |
|-------------|-----------|
| Website builder ($20/mo) + domain registrar ($15/yr) + email hosting ($10/mo) | One token wallet |
| Locked into one AI provider | Bring Claude, GPT, or Gemini |
| Pay monthly whether you use it or not | Pay only when you build |
| GoHighLevel at $297–497/mo | A fraction of the cost |

## Token Pricing

### Pay-as-you-go (never expire)
| Pack | Price | Tokens |
|------|-------|--------|
| Starter | $10 | 500 |
| Growth | $25 | 1,500 |
| Pro | $50 | 3,500 |
| Scale | $100 | 8,000 |

### Monthly plans
| Plan | Price | Tokens | Perks |
|------|-------|--------|-------|
| Starter | $29/mo | 2,000 | 20% rollover |
| Growth | $79/mo | 8,000 | 20% rollover + API access + white-label |

### What costs tokens
| Action | Cost |
|--------|------|
| AI website creation | 50 tokens |
| Domain connection | 20 tokens |
| Email account setup | 10 tokens |
| AI content rewrite | 3 tokens |

## Tech Stack

- **Framework:** Next.js 15 + Tailwind CSS
- **Auth:** Clerk (multi-tenant)
- **Database:** PostgreSQL via Supabase + Prisma
- **Payments:** Stripe
- **API Keys:** Unkey
- **Domains:** Cloudflare API
- **Email hosting:** Zoho Mail API
- **Transactional email:** Resend
- **Analytics:** Recharts

## Getting Started (Local Development)

### Prerequisites
- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Supabase account
- Clerk account
- Stripe account

### Setup

```bash
# Clone the repo
git clone https://github.com/ThiagoAGielow/token-saas.git
cd tokenflow

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Fill in your API keys in .env

# Push database schema
pnpm db:push

# Start dev server
pnpm dev -p 4000
```

Open [http://localhost:4000](http://localhost:4000)

## Project Structure

```
app/                  # Next.js app router pages
  (auth)/             # Sign in / sign up
  dashboard/          # Main dashboard
  api/                # API routes
components/           # Reusable UI components
lib/                  # Business logic
  tokens.js           # Token wallet: spend, grant, rollover, expiry
  stripe.js           # Stripe integration
prisma/
  schema.prisma       # Database schema (8 models)
```

## Roadmap

- [ ] Website builder (prompt → preview → publish)
- [ ] Cloudflare domain verification flow
- [ ] Zoho mailbox creation flow
- [ ] White-label agency portal
- [ ] Multi-provider AI key support (Claude, GPT, Gemini)
- [ ] Auto top-up when API credits run low

## License

MIT

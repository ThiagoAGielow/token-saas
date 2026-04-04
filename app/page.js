'use client';

import { useState, useEffect, useRef } from 'react';

// ─── Utility ─────────────────────────────────────────────────────────────────

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = ['Features', 'Pricing', 'Docs'];

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-[#0a0a0a]/90 backdrop-blur-lg border-b border-white/5 shadow-xl'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 group">
            <span className="text-2xl leading-none">⬡</span>
            <span className="font-bold text-xl tracking-tight text-white group-hover:text-sky-400 transition-colors">
              TokenFlow
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase()}`}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                {l}
              </a>
            ))}
          </div>

          {/* CTA group */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="#"
              className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5"
            >
              Sign in
            </a>
            <a
              href="#"
              className="text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-sky-500/20"
            >
              Get started free →
            </a>
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white"
            aria-label="Toggle menu"
          >
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#111111] border-t border-white/5 px-4 py-4 space-y-3">
          {links.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              onClick={() => setMenuOpen(false)}
              className="block text-sm text-slate-300 hover:text-white py-1"
            >
              {l}
            </a>
          ))}
          <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
            <a href="#" className="text-sm text-slate-400 hover:text-white py-1">
              Sign in
            </a>
            <a
              href="#"
              className="text-sm font-semibold bg-sky-500 text-white px-4 py-2 rounded-lg text-center"
            >
              Get started free →
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Animated Token Counter ───────────────────────────────────────────────────

function AnimatedCounter({ target, duration = 2000 }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const start = Date.now();
          const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref}>{value.toLocaleString()}</span>
  );
}

// Live rolling token counter for social proof
function LiveTokenCounter() {
  const [count, setCount] = useState(2847);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((c) => c + Math.floor(Math.random() * 12 + 3));
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-2 text-sm text-amber-300">
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-token" />
      <span className="font-mono font-semibold">{count.toLocaleString()}</span>
      <span className="text-amber-400/70">tokens spent in the last minute</span>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center items-center px-4 pt-24 pb-16 overflow-hidden">
      {/* Background glow blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-sky-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[300px] bg-amber-500/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/30 rounded-full px-4 py-1.5 text-sky-300 text-sm font-medium">
          <span>🚀</span>
          <span>No credit card needed — start with 100 free tokens</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight">
          Build anything
          <br />
          <span className="text-gradient-blue">pay only for</span>
          <br />
          what you use
        </h1>

        {/* Sub-headline */}
        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          TokenFlow is the only platform where you control your costs completely.
          Spend tokens on{' '}
          <span className="text-sky-400">AI websites</span>,{' '}
          <span className="text-sky-400">domains</span>,{' '}
          <span className="text-sky-400">email accounts</span>, and{' '}
          <span className="text-sky-400">content rewrites</span> — tokens never expire.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold text-base px-8 py-4 rounded-xl shadow-2xl shadow-sky-500/30 transition-all hover:scale-105 hover:shadow-sky-400/40"
          >
            🎁 Start free — 100 tokens
          </a>
          <a
            href="#pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold text-base px-8 py-4 rounded-xl transition-all"
          >
            See pricing →
          </a>
        </div>

        {/* Social proof live counter */}
        <div className="flex justify-center pt-2">
          <LiveTokenCounter />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/5 max-w-lg mx-auto">
          {[
            { value: 12400, label: 'Active builders', suffix: '+' },
            { value: 3200000, label: 'Tokens spent', suffix: '+' },
            { value: 99, label: 'Uptime SLA', suffix: '%' },
          ].map(({ value, label, suffix }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-extrabold text-white">
                <AnimatedCounter target={value} />
                {suffix}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      icon: '📱',
      step: '01',
      title: 'Sign up free',
      desc: 'Create your account with phone verification — no credit card, no commitment. You instantly receive 100 free tokens to explore the platform.',
    },
    {
      icon: '🪙',
      step: '02',
      title: 'Buy tokens',
      desc: 'Top up your wallet with token packs starting at $10, or subscribe for a monthly allowance. Tokens never expire and roll over on monthly plans.',
    },
    {
      icon: '⚡',
      step: '03',
      title: 'Build anything',
      desc: "Spend tokens on AI websites, domains, email accounts, or content rewrites. You'll always see the cost before you confirm — no surprises.",
    },
  ];

  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <p className="text-sky-400 text-sm font-semibold uppercase tracking-widest">How it works</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold">
            Three steps to launch
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Simple by design. Powerful by default.
          </p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-8">
          {/* connector line */}
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />

          {steps.map(({ icon, step, title, desc }) => (
            <div
              key={step}
              className="relative bg-[#111111] border border-white/5 rounded-2xl p-8 card-surface-hover group"
            >
              <div className="absolute -top-3 left-8 bg-sky-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                Step {step}
              </div>
              <div className="text-4xl mb-4 animate-float" style={{ animationDelay: `${parseInt(step) * 0.4}s` }}>
                {icon}
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-sky-400 transition-colors">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features Grid ────────────────────────────────────────────────────────────

function FeaturesGrid() {
  const features = [
    {
      icon: '🤖',
      title: 'AI Website Builder',
      desc: 'Describe your site in plain English. Our AI generates a full, responsive website in seconds. Preview before spending a single token.',
      badge: '50 tokens',
      badgeColor: 'amber',
    },
    {
      icon: '🌐',
      title: 'Custom Domains',
      desc: 'Register a new domain or connect one you already own. Instant DNS setup, SSL included, zero configuration headaches.',
      badge: '20 tokens',
      badgeColor: 'amber',
    },
    {
      icon: '📧',
      title: 'Email Accounts',
      desc: 'Spin up professional email addresses on your domain. Forwarders, catch-alls, and custom routing all available out of the box.',
      badge: '10 tokens',
      badgeColor: 'amber',
    },
    {
      icon: '🔌',
      title: 'API Access',
      desc: 'Automate everything with our REST API. Trigger website builds, top up balances, and manage domains programmatically. Growth plan and above.',
      badge: 'Growth+',
      badgeColor: 'sky',
    },
    {
      icon: '👛',
      title: 'Token Wallet',
      desc: 'Full visibility of every token spent. Smart alerts when your balance dips low. Every action shows its cost before you confirm.',
      badge: 'All plans',
      badgeColor: 'green',
    },
    {
      icon: '🏷️',
      title: 'White Label',
      desc: 'Remove all TokenFlow branding and sell under your own name. Perfect for agencies managing multiple client accounts at scale.',
      badge: 'Growth+',
      badgeColor: 'sky',
    },
  ];

  const badgeStyles = {
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  };

  return (
    <section className="py-24 px-4 bg-[#0d0d0d]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <p className="text-sky-400 text-sm font-semibold uppercase tracking-widest">Features</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold">
            Everything you need to{' '}
            <span className="text-gradient-blue">ship faster</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon, title, desc, badge, badgeColor }) => (
            <div
              key={title}
              className="bg-[#111111] border border-white/5 rounded-2xl p-7 card-surface-hover group flex flex-col gap-4"
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl">{icon}</span>
                <span className={cn('text-xs font-semibold border rounded-full px-2.5 py-1', badgeStyles[badgeColor])}>
                  {badge}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1 group-hover:text-sky-400 transition-colors">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function PricingCard({ plan, price, period, tokens, features, cta, highlight, badge }) {
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl p-8 border transition-all duration-200',
        highlight
          ? 'bg-sky-950/40 border-sky-500/60 shadow-2xl shadow-sky-500/20 scale-[1.03]'
          : 'bg-[#111111] border-white/5 hover:border-sky-500/30'
      )}
    >
      {badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap shadow-lg shadow-sky-500/40">
          {badge}
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-1">{plan}</h3>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-extrabold text-white">{price}</span>
          {period && <span className="text-slate-400 text-sm mb-1.5">{period}</span>}
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm rounded-full px-3 py-1">
          🪙 {tokens}
        </div>
      </div>

      <ul className="space-y-3 flex-1 mb-8">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
            <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
            {f}
          </li>
        ))}
      </ul>

      <a
        href="#"
        className={cn(
          'block text-center font-semibold text-sm py-3 rounded-xl transition-all',
          highlight
            ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/30 hover:shadow-sky-400/40 hover:scale-105'
            : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
        )}
      >
        {cta}
      </a>
    </div>
  );
}

function Pricing() {
  const plans = [
    {
      plan: 'Free',
      price: '$0',
      period: '',
      tokens: '100 tokens on signup',
      features: [
        'Phone verification only',
        'No credit card needed',
        'All core features unlocked',
        'Token wallet with spend history',
        'Email support',
      ],
      cta: 'Start free →',
      highlight: false,
    },
    {
      plan: 'Starter',
      price: '$29',
      period: '/month',
      tokens: '2,000 tokens/month',
      badge: '🔥 Most popular',
      features: [
        '2,000 tokens every month',
        '20% rollover on unused tokens',
        'Low-balance email alerts',
        'Priority support',
        'Usage analytics dashboard',
      ],
      cta: 'Start Starter →',
      highlight: true,
    },
    {
      plan: 'Growth',
      price: '$79',
      period: '/month',
      tokens: '8,000 tokens/month',
      features: [
        '8,000 tokens every month',
        '20% rollover on unused tokens',
        'Full REST API access',
        'White-label mode for agencies',
        'Dedicated account manager',
        'SLA guarantee',
      ],
      cta: 'Start Growth →',
      highlight: false,
    },
  ];

  const packs = [
    { label: '500 tokens', price: '$10', per: '2¢/token' },
    { label: '1,500 tokens', price: '$25', per: '1.7¢/token' },
    { label: '3,500 tokens', price: '$50', per: '1.4¢/token', popular: true },
    { label: '8,000 tokens', price: '$100', per: '1.25¢/token' },
  ];

  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <p className="text-sky-400 text-sm font-semibold uppercase tracking-widest">Pricing</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold">
            Transparent, flexible pricing
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Subscribe for volume discounts, or buy token packs that never expire.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-center mb-16">
          {plans.map((p) => (
            <PricingCard key={p.plan} {...p} />
          ))}
        </div>

        {/* PAYG packs */}
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold">💳 Pay-as-you-go token packs</h3>
            <p className="text-slate-400 text-sm mt-1">One-time purchase. Tokens never expire. Stack them up.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {packs.map(({ label, price, per, popular }) => (
              <div
                key={label}
                className={cn(
                  'relative flex flex-col items-center gap-3 border rounded-xl p-5 text-center transition-all hover:border-sky-500/50',
                  popular
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-white/5 bg-white/2'
                )}
              >
                {popular && (
                  <span className="absolute -top-3 bg-amber-500 text-black text-xs font-bold px-3 py-0.5 rounded-full">
                    Best value
                  </span>
                )}
                <div className="text-3xl font-extrabold text-white">{price}</div>
                <div className="text-amber-300 font-semibold text-sm">🪙 {label}</div>
                <div className="text-slate-500 text-xs">{per}</div>
                <a
                  href="#"
                  className="w-full mt-1 bg-white/5 hover:bg-sky-500 hover:text-white border border-white/10 hover:border-sky-500 text-slate-300 text-sm font-semibold py-2 rounded-lg transition-all"
                >
                  Buy now →
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Token Cost Table ─────────────────────────────────────────────────────────

function TokenCostTable() {
  const rows = [
    { action: '🤖 AI-powered website', tokens: 50, note: 'Full site generated, preview before spending' },
    { action: '🌐 Domain registration / connect', tokens: 20, note: 'SSL + DNS setup included' },
    { action: '📧 Email account setup', tokens: 10, note: 'Per mailbox on your domain' },
    { action: '✍️ AI content rewrite', tokens: 3, note: 'Per page or section' },
  ];

  return (
    <section className="py-24 px-4 bg-[#0d0d0d]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12 space-y-3">
          <p className="text-amber-400 text-sm font-semibold uppercase tracking-widest">Token costs</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold">
            Always know what{' '}
            <span className="text-gradient-amber">you'll spend</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Every action shows its token cost before you confirm. No hidden fees. Ever.
          </p>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-3 text-xs font-semibold uppercase tracking-widest text-slate-500 px-6 py-3 border-b border-white/5">
            <span>Action</span>
            <span className="text-center">Token cost</span>
            <span className="text-right">Notes</span>
          </div>
          {rows.map(({ action, tokens, note }, i) => (
            <div
              key={action}
              className={cn(
                'grid grid-cols-3 items-center px-6 py-5 gap-4',
                i < rows.length - 1 && 'border-b border-white/5'
              )}
            >
              <span className="font-semibold text-white text-sm">{action}</span>
              <div className="flex justify-center">
                <span className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-sm px-3 py-1 rounded-full">
                  🪙 {tokens} tokens
                </span>
              </div>
              <span className="text-slate-400 text-xs text-right">{note}</span>
            </div>
          ))}

          {/* Confirmation preview mock */}
          <div className="bg-sky-950/30 border-t border-sky-500/20 px-6 py-4 flex items-center gap-3">
            <span className="text-2xl">👁️</span>
            <div>
              <p className="text-sky-300 text-sm font-semibold">Preview before you spend</p>
              <p className="text-slate-400 text-xs">
                Every AI website build includes a live preview. Only confirms token spend once you approve.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Referral Banner ──────────────────────────────────────────────────────────

function ReferralBanner() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative overflow-hidden bg-gradient-to-br from-sky-950/60 via-[#111111] to-amber-950/30 border border-sky-500/20 rounded-3xl p-12 text-center">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="text-5xl">🤝</div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-2">
                Give <span className="text-gradient-amber">50 tokens</span>, get{' '}
                <span className="text-gradient-amber">50 tokens</span>
              </h2>
              <p className="text-slate-400 text-lg max-w-lg mx-auto">
                Share your referral link. When a friend signs up and verifies their phone, you both get 50 free tokens
                — instantly added to your wallets.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 font-mono text-sm text-slate-300 select-all">
                tokenflow.io/r/your-code
              </div>
              <a
                href="#"
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl transition-all hover:scale-105 shadow-lg shadow-amber-500/30 text-sm"
              >
                Get my referral link →
              </a>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 pt-4 border-t border-white/5">
              {[
                { icon: '🔗', label: 'Share your link' },
                { icon: '✅', label: 'Friend signs up + verifies' },
                { icon: '🪙', label: 'Both get 50 tokens' },
              ].map(({ icon, label }) => (
                <div key={label} className="text-sm text-slate-400 flex flex-col items-center gap-2">
                  <span className="text-2xl">{icon}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function FAQ() {
  const [open, setOpen] = useState(null);

  const faqs = [
    {
      q: 'Do tokens expire?',
      a: "No. Pay-as-you-go token packs never expire — ever. On monthly plans, unused tokens roll over up to 20% of your plan's monthly allowance. So if you're on Starter ($29, 2,000 tokens), up to 400 unused tokens carry into the next month.",
    },
    {
      q: 'What happens if I run out of tokens mid-action?',
      a: "You won't be charged a partial token cost. If your balance is too low to complete an action, you'll see a top-up prompt before anything is debited. We never leave you halfway through a build.",
    },
    {
      q: 'Can I cancel my monthly plan at any time?',
      a: "Yes, with zero friction. Cancel any time from your dashboard. You keep all remaining tokens in your wallet — they convert to permanent pay-as-you-go tokens that never expire.",
    },
    {
      q: 'What is white-label mode?',
      a: "White-label mode removes all TokenFlow branding from client-facing interfaces, custom dashboards, and email notifications. Your clients see your brand, not ours. Available on the Growth plan ($79/month) and above.",
    },
    {
      q: 'How does the free tier work?',
      a: "Sign up with just a phone number — no credit card needed. You get 100 tokens instantly credited to your wallet. That's enough to build 2 AI websites, set up 1 domain, 1 email account, and still have tokens left over for content rewrites.",
    },
  ];

  return (
    <section className="py-24 px-4 bg-[#0d0d0d]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12 space-y-3">
          <p className="text-sky-400 text-sm font-semibold uppercase tracking-widest">FAQ</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold">Common questions</h2>
        </div>

        <div className="space-y-3">
          {faqs.map(({ q, a }, i) => (
            <div
              key={i}
              className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/2 transition-colors"
              >
                <span className="font-semibold text-white text-sm sm:text-base">{q}</span>
                <span
                  className={cn(
                    'text-sky-400 text-xl shrink-0 ml-4 transition-transform duration-200',
                    open === i && 'rotate-45'
                  )}
                >
                  +
                </span>
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                  {a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA Banner ─────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto text-center space-y-8">
        <div className="text-6xl">⬡</div>
        <h2 className="text-4xl sm:text-5xl font-extrabold">
          Ready to build?
        </h2>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Start with 100 free tokens — no credit card, no commitment. Your first AI website could be live in minutes.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#"
            className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold text-base px-10 py-4 rounded-xl shadow-2xl shadow-sky-500/30 transition-all hover:scale-105"
          >
            🎁 Get 100 free tokens
          </a>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            View all pricing →
          </a>
        </div>
        <p className="text-slate-600 text-xs">
          Phone verification only · Tokens never expire · Cancel anytime
        </p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const cols = [
    {
      heading: 'Product',
      links: ['Features', 'Pricing', 'Changelog', 'Roadmap', 'Status'],
    },
    {
      heading: 'Developers',
      links: ['Documentation', 'API Reference', 'SDKs', 'Webhooks', 'Open source'],
    },
    {
      heading: 'Company',
      links: ['About', 'Blog', 'Careers', 'Press', 'Contact'],
    },
    {
      heading: 'Legal',
      links: ['Privacy policy', 'Terms of service', 'Cookie policy', 'GDPR'],
    },
  ];

  return (
    <footer className="border-t border-white/5 bg-[#0a0a0a] py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⬡</span>
              <span className="font-bold text-lg text-white">TokenFlow</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Build websites, domains, and email — powered by AI tokens. Pay only for what you use.
            </p>
            <div className="flex gap-3 pt-1">
              {['𝕏', '📘', '💼', '⌨️'].map((icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-sky-500/20 flex items-center justify-center text-slate-400 hover:text-sky-400 transition-all text-sm"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {cols.map(({ heading, links }) => (
            <div key={heading}>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
                {heading}
              </h4>
              <ul className="space-y-2.5">
                {links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5">
          <p className="text-slate-600 text-xs">
            © {new Date().getFullYear()} TokenFlow, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-500 text-xs">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <FeaturesGrid />
        <Pricing />
        <TokenCostTable />
        <ReferralBanner />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}

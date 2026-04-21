'use client';

import { useState, useEffect, useRef } from 'react';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
  const { t }                       = useLanguage();
  const [scrolled,  setScrolled]    = useState(false);
  const [menuOpen,  setMenuOpen]    = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: t('land_nav_features'), href: '#features'  },
    { label: t('land_nav_pricing'),  href: '#pricing'   },
    { label: t('land_nav_docs'),     href: '#'          },
  ];

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled
        ? 'bg-[#0a0a0a]/90 backdrop-blur-lg border-b border-white/5 shadow-xl'
        : 'bg-transparent'
    )}>
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
              <a key={l.label} href={l.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA group */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <a href="/sign-in" className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5">
              {t('land_nav_signin')}
            </a>
            <a href="/sign-up" className="text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-sky-500/20">
              {t('land_nav_signup')}
            </a>
          </div>

          {/* Mobile burger */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-slate-400 hover:text-white" aria-label="Toggle menu">
            <span className="block w-5 h-0.5 bg-current mb-1" />
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
            <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} className="block text-sm text-slate-300 hover:text-white py-1">
              {l.label}
            </a>
          ))}
          <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
            <div className="py-1"><LanguageSwitcher /></div>
            <a href="/sign-in" className="text-sm text-slate-400 hover:text-white py-1">{t('land_nav_signin')}</a>
            <a href="/sign-up" className="text-sm font-semibold bg-sky-500 text-white px-4 py-2 rounded-lg text-center">{t('land_nav_signup')}</a>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Animated Token Counter ───────────────────────────────────────────────────

interface AnimatedCounterProps {
  target: number;
  duration?: number;
}

function AnimatedCounter({ target, duration = 2000 }: AnimatedCounterProps) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        const start = Date.now();
        const tick = () => {
          const elapsed  = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased    = 1 - Math.pow(1 - progress, 3);
          setValue(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{value.toLocaleString()}</span>;
}

function LiveTokenCounter() {
  const { t }          = useLanguage();
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
      <span className="text-amber-400/70">{t('land_hero_counter')}</span>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex flex-col justify-center items-center px-4 pt-24 pb-16 overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-sky-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[300px] bg-amber-500/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/30 rounded-full px-4 py-1.5 text-sky-300 text-sm font-medium">
          <span>🚀</span>
          <span>{t('land_hero_badge')}</span>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight">
          {t('land_hero_h1_1')}
          <br />
          <span className="text-gradient-blue">{t('land_hero_h1_2')}</span>
          <br />
          {t('land_hero_h1_3')}
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {t('land_hero_sub')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/sign-up" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold text-base px-8 py-4 rounded-xl shadow-2xl shadow-sky-500/30 transition-all hover:scale-105 hover:shadow-sky-400/40">
            {t('land_hero_cta1')}
          </a>
          <a href="#pricing" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold text-base px-8 py-4 rounded-xl transition-all">
            {t('land_hero_cta2')}
          </a>
        </div>

        <div className="flex justify-center pt-2">
          <LiveTokenCounter />
        </div>

        <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/5 max-w-lg mx-auto">
          {[
            { value: 12400,   label: t('land_hero_stat1'), suffix: '+' },
            { value: 3200000, label: t('land_hero_stat2'), suffix: '+' },
            { value: 99,      label: t('land_hero_stat3'), suffix: '%' },
          ].map(({ value, label, suffix }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-extrabold text-white">
                <AnimatedCounter target={value} />{suffix}
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
  const { t } = useLanguage();

  const steps = [
    { icon: '📱', step: '01', title: t('land_hiw_1_title'), desc: t('land_hiw_1_desc') },
    { icon: '🪙', step: '02', title: t('land_hiw_2_title'), desc: t('land_hiw_2_desc') },
    { icon: '⚡', step: '03', title: t('land_hiw_3_title'), desc: t('land_hiw_3_desc') },
  ];

  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <p className="text-sky-400 text-sm font-semibold uppercase tracking-widest">{t('land_hiw_label')}</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold">{t('land_hiw_title')}</h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">{t('land_hiw_sub')}</p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-8">
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
          {steps.map(({ icon, step, title, desc }) => (
            <div key={step} className="relative bg-[#111111] border border-white/5 rounded-2xl p-8 card-surface-hover group">
              <div className="absolute -top-3 left-8 bg-sky-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {t('land_hiw_step')} {step}
              </div>
              <div className="text-4xl mb-4 animate-float" style={{ animationDelay: `${parseInt(step) * 0.4}s` }}>{icon}</div>
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
  const { t } = useLanguage();

  type BadgeColor = 'amber' | 'sky' | 'green';
  interface Feature {
    icon: string; title: string | string[]; desc: string | string[];
    badge: string | string[]; badgeColor: BadgeColor;
  }

  const features: Feature[] = [
    { icon: '🤖', title: t('land_feat_1_title'), desc: t('land_feat_1_desc'), badge: '50 tokens',               badgeColor: 'amber' },
    { icon: '🌐', title: t('land_feat_2_title'), desc: t('land_feat_2_desc'), badge: '20 tokens',               badgeColor: 'amber' },
    { icon: '📧', title: t('land_feat_3_title'), desc: t('land_feat_3_desc'), badge: '10 tokens',               badgeColor: 'amber' },
    { icon: '🔌', title: t('land_feat_4_title'), desc: t('land_feat_4_desc'), badge: 'Growth+',                 badgeColor: 'sky'   },
    { icon: '👛', title: t('land_feat_5_title'), desc: t('land_feat_5_desc'), badge: t('land_feat_badge_allPlans'), badgeColor: 'green' },
    { icon: '🏷️', title: t('land_feat_6_title'), desc: t('land_feat_6_desc'), badge: 'Growth+',                 badgeColor: 'sky'   },
  ];

  const badgeStyles: Record<BadgeColor, string> = {
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    sky:   'bg-sky-500/15 text-sky-300 border-sky-500/30',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  };

  return (
    <section className="py-24 px-4 bg-[#0d0d0d]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <p className="text-sky-400 text-sm font-semibold uppercase tracking-widest">{t('land_feat_label')}</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold">
            {t('land_feat_title').split('ship faster').length > 1 ? (
              <>{t('land_feat_title').split('ship faster')[0]}<span className="text-gradient-blue">ship faster</span></>
            ) : (
              t('land_feat_title')
            )}
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon, title, desc, badge, badgeColor }, index) => (
            <div key={index} className="bg-[#111111] border border-white/5 rounded-2xl p-7 card-surface-hover group flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <span className="text-3xl">{icon}</span>
                <span className={cn('text-xs font-semibold border rounded-full px-2.5 py-1', badgeStyles[badgeColor])}>{badge}</span>
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

interface PricingCardProps {
  plan: string;
  price: string;
  period?: string;
  tokens: string;
  features: string[];
  cta: string;
  highlight: boolean;
  badge?: string;
}

function PricingCard({ plan, price, period, tokens, features, cta, highlight, badge }: PricingCardProps) {
  return (
    <div className={cn(
      'relative flex flex-col rounded-2xl p-8 border transition-all duration-200',
      highlight ? 'bg-sky-950/40 border-sky-500/60 shadow-2xl shadow-sky-500/20 scale-[1.03]' : 'bg-[#111111] border-white/5 hover:border-sky-500/30'
    )}>
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
            <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>{f}
          </li>
        ))}
      </ul>
      <a href="/sign-up" className={cn(
        'block text-center font-semibold text-sm py-3 rounded-xl transition-all',
        highlight ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/30 hover:shadow-sky-400/40 hover:scale-105' : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
      )}>
        {cta}
      </a>
    </div>
  );
}

function Pricing() {
  const { t } = useLanguage();

  const plans = [
    {
      plan:      t('land_plan_free_name'),
      price:     '$0',
      period:    '',
      tokens:    t('land_plan_free_token'),
      features:  [t('land_plan_free_f1'), t('land_plan_free_f2'), t('land_plan_free_f3'), t('land_plan_free_f4'), t('land_plan_free_f5')],
      cta:       t('land_plan_free_cta'),
      highlight: false,
    },
    {
      plan:      t('land_plan_starter_name'),
      price:     '$29',
      period:    '/month',
      tokens:    t('land_plan_starter_token'),
      badge:     t('land_price_popular'),
      features:  [t('land_plan_starter_f1'), t('land_plan_starter_f2'), t('land_plan_starter_f3'), t('land_plan_starter_f4'), t('land_plan_starter_f5')],
      cta:       t('land_plan_starter_cta'),
      highlight: true,
    },
    {
      plan:      t('land_plan_growth_name'),
      price:     '$79',
      period:    '/month',
      tokens:    t('land_plan_growth_token'),
      features:  [t('land_plan_growth_f1'), t('land_plan_growth_f2'), t('land_plan_growth_f3'), t('land_plan_growth_f4'), t('land_plan_growth_f5'), t('land_plan_growth_f6')],
      cta:       t('land_plan_growth_cta'),
      highlight: false,
    },
  ];

  const packs = [
    { label: '500 tokens',   price: '$10',  per: '2¢/token'    },
    { label: '1,500 tokens', price: '$25',  per: '1.7¢/token'  },
    { label: '3,500 tokens', price: '$50',  per: '1.4¢/token',  popular: true },
    { label: '8,000 tokens', price: '$100', per: '1.25¢/token' },
  ];

  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <p className="text-sky-400 text-sm font-semibold uppercase tracking-widest">{t('land_price_label')}</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold">{t('land_price_title')}</h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">{t('land_price_sub')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-center mb-16">
          {plans.map((p) => <PricingCard key={p.plan} {...p} />)}
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-2xl p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold">{t('land_price_packTitle')}</h3>
            <p className="text-slate-400 text-sm mt-1">{t('land_price_packSub')}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {packs.map(({ label, price, per, popular }) => (
              <div key={label} className={cn(
                'relative flex flex-col items-center gap-3 border rounded-xl p-5 text-center transition-all hover:border-sky-500/50',
                popular ? 'border-amber-500/50 bg-amber-500/5' : 'border-white/5 bg-white/2'
              )}>
                {popular && (
                  <span className="absolute -top-3 bg-amber-500 text-black text-xs font-bold px-3 py-0.5 rounded-full">
                    {t('land_price_bestVal')}
                  </span>
                )}
                <div className="text-3xl font-extrabold text-white">{price}</div>
                <div className="text-amber-300 font-semibold text-sm">🪙 {label}</div>
                <div className="text-slate-500 text-xs">{per}</div>
                <a href="/sign-up" className="w-full mt-1 bg-white/5 hover:bg-sky-500 hover:text-white border border-white/10 hover:border-sky-500 text-slate-300 text-sm font-semibold py-2 rounded-lg transition-all">
                  {t('land_price_buynow')}
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
  const { t } = useLanguage();

  const rows = [
    { action: t('land_cost_r1_act'), tokens: 50, note: t('land_cost_r1_note') },
    { action: t('land_cost_r2_act'), tokens: 20, note: t('land_cost_r2_note') },
    { action: t('land_cost_r3_act'), tokens: 10, note: t('land_cost_r3_note') },
    { action: t('land_cost_r4_act'), tokens:  3, note: t('land_cost_r4_note') },
  ];

  return (
    <section className="py-24 px-4 bg-[#0d0d0d]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12 space-y-3">
          <p className="text-amber-400 text-sm font-semibold uppercase tracking-widest">{t('land_cost_label')}</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold">
            {t('land_cost_title')}
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">{t('land_cost_sub')}</p>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-3 text-xs font-semibold uppercase tracking-widest text-slate-500 px-6 py-3 border-b border-white/5">
            <span>{t('land_cost_col1')}</span>
            <span className="text-center">{t('land_cost_col2')}</span>
            <span className="text-right">{t('land_cost_col3')}</span>
          </div>
          {rows.map(({ action, tokens, note }, i) => (
            <div key={action} className={cn('grid grid-cols-3 items-center px-6 py-5 gap-4', i < rows.length - 1 && 'border-b border-white/5')}>
              <span className="font-semibold text-white text-sm">{action}</span>
              <div className="flex justify-center">
                <span className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-sm px-3 py-1 rounded-full">
                  🪙 {tokens} {t('tokens')}
                </span>
              </div>
              <span className="text-slate-400 text-xs text-right">{note}</span>
            </div>
          ))}
          <div className="bg-sky-950/30 border-t border-sky-500/20 px-6 py-4 flex items-center gap-3">
            <span className="text-2xl">👁️</span>
            <div>
              <p className="text-sky-300 text-sm font-semibold">{t('land_cost_preview_title')}</p>
              <p className="text-slate-400 text-xs">{t('land_cost_preview_sub')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Referral Banner ──────────────────────────────────────────────────────────

function ReferralBanner() {
  const { t } = useLanguage();

  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative overflow-hidden bg-gradient-to-br from-sky-950/60 via-[#111111] to-amber-950/30 border border-sky-500/20 rounded-3xl p-12 text-center">
          <div className="absolute top-0 right-0 w-72 h-72 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-6">
            <div className="text-5xl">🤝</div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-2">
                {t('land_ref_title').split('50 tokens').length > 1
                  ? t('land_ref_title').split('50 tokens').map((part: string, i: number, arr: string[]) =>
                      i < arr.length - 1
                        ? <span key={i}>{part}<span className="text-gradient-amber">50 tokens</span></span>
                        : <span key={i}>{part}</span>
                    )
                  : t('land_ref_title')
                }
              </h2>
              <p className="text-slate-400 text-lg max-w-lg mx-auto">{t('land_ref_sub')}</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 font-mono text-sm text-slate-300 select-all">
                tokenflow.io/r/your-code
              </div>
              <a href="/sign-up" className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl transition-all hover:scale-105 shadow-lg shadow-amber-500/30 text-sm">
                {t('land_ref_cta')}
              </a>
            </div>
            <div className="grid sm:grid-cols-3 gap-6 pt-4 border-t border-white/5">
              {[
                { icon: '🔗', label: t('land_ref_step1') },
                { icon: '✅', label: t('land_ref_step2') },
                { icon: '🪙', label: t('land_ref_step3') },
              ].map(({ icon, label }) => (
                <div key={label} className="text-sm text-slate-400 flex flex-col items-center gap-2">
                  <span className="text-2xl">{icon}</span>{label}
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
  const { t }          = useLanguage();
  const [open, setOpen] = useState<number | null>(null);

  const faqs = [
    { q: t('land_faq_1q'), a: t('land_faq_1a') },
    { q: t('land_faq_2q'), a: t('land_faq_2a') },
    { q: t('land_faq_3q'), a: t('land_faq_3a') },
    { q: t('land_faq_4q'), a: t('land_faq_4a') },
    { q: t('land_faq_5q'), a: t('land_faq_5a') },
  ];

  return (
    <section className="py-24 px-4 bg-[#0d0d0d]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12 space-y-3">
          <p className="text-sky-400 text-sm font-semibold uppercase tracking-widest">{t('land_faq_label')}</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold">{t('land_faq_title')}</h2>
        </div>
        <div className="space-y-3">
          {faqs.map(({ q, a }, i) => (
            <div key={i} className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/2 transition-colors">
                <span className="font-semibold text-white text-sm sm:text-base">{q}</span>
                <span className={cn('text-sky-400 text-xl shrink-0 ml-4 transition-transform duration-200', open === i && 'rotate-45')}>+</span>
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-4">{a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  const { t } = useLanguage();

  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto text-center space-y-8">
        <div className="text-6xl">⬡</div>
        <h2 className="text-4xl sm:text-5xl font-extrabold">{t('land_cta_title')}</h2>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">{t('land_cta_sub')}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/sign-up" className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold text-base px-10 py-4 rounded-xl shadow-2xl shadow-sky-500/30 transition-all hover:scale-105">
            {t('land_cta_btn')}
          </a>
          <a href="#pricing" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
            {t('land_cta_link')}
          </a>
        </div>
        <p className="text-slate-600 text-xs">{t('land_cta_fine')}</p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const { t } = useLanguage();

  const cols = [
    { heading: t('land_footer_h1'), links: t('land_footer_product') },
    { heading: t('land_footer_h2'), links: t('land_footer_dev')     },
    { heading: t('land_footer_h3'), links: t('land_footer_company') },
    { heading: t('land_footer_h4'), links: t('land_footer_legal')   },
  ];

  return (
    <footer className="border-t border-white/5 bg-[#0a0a0a] py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-5 gap-10 mb-12">
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⬡</span>
              <span className="font-bold text-lg text-white">TokenFlow</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">{t('land_footer_tagline')}</p>
            <div className="flex gap-3 pt-1">
              {['𝕏', '📘', '💼', '⌨️'].map((icon, i) => (
                <a key={i} href="#" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-sky-500/20 flex items-center justify-center text-slate-400 hover:text-sky-400 transition-all text-sm">{icon}</a>
              ))}
            </div>
          </div>
          {cols.map(({ heading, links }) => (
            <div key={heading}>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">{heading}</h4>
              <ul className="space-y-2.5">
                {links.map((l: string) => (
                  <li key={l}><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5">
          <p className="text-slate-600 text-xs">© {new Date().getFullYear()} {t('land_footer_copy')}</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-500 text-xs">{t('land_footer_status')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function LandingPage() {
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

export default function HomePage() {
  return (
    <LanguageProvider>
      <LandingPage />
    </LanguageProvider>
  );
}

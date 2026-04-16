'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'tokenflow_onboarded';

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to TokenFlow',
    subtitle: "You're all set up. Here's how it works in 60 seconds.",
    content: (
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/15">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-400/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">You have 100 free tokens</p>
              <p className="text-xs text-gray-400">Your welcome bonus is ready to spend</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-300 leading-relaxed">
          TokenFlow is a pay-as-you-go platform. You spend tokens to create websites, connect domains, and set up emails. No hidden fees — you only pay for what you use.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Create website', cost: '50 tokens' },
            { label: 'Add domain', cost: '20 tokens' },
            { label: 'Set up email', cost: '10 tokens' },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
              <p className="text-xs font-semibold text-amber-400">{item.cost}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'features',
    title: 'What you can build',
    subtitle: 'Three powerful tools in one platform.',
    content: (
      <div className="space-y-3">
        {[
          {
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            ),
            color: 'text-blue-400 bg-blue-500/15 border-blue-500/20',
            title: 'AI Website Builder',
            desc: 'Describe your site in plain language and AI generates a professional website in seconds. Hosted on your own subdomain instantly.',
          },
          {
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            ),
            color: 'text-purple-400 bg-purple-500/15 border-purple-500/20',
            title: 'Custom Domains',
            desc: 'Point your own domain at any TokenFlow site. We verify ownership via a TXT record and handle the DNS routing automatically.',
          },
          {
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            ),
            color: 'text-green-400 bg-green-500/15 border-green-500/20',
            title: 'Business Emails',
            desc: 'Create professional email accounts on your verified domain. hello@yourdomain.com is just 10 tokens away.',
          },
        ].map((item) => (
          <div key={item.title} className={`flex items-start gap-3 p-3.5 rounded-xl border ${item.color}`}>
            <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
            <div>
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'start',
    title: "You're ready to go",
    subtitle: 'Start with your first website — it only takes a minute.',
    content: (
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-[#1a1a1a] border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Suggested first steps</p>
          <div className="space-y-3">
            {[
              { step: '1', label: 'Create your first website', sub: 'Use AI to build it in seconds', cost: '50 tokens', href: '/dashboard/websites' },
              { step: '2', label: 'Connect a custom domain', sub: 'Make it yours with your own URL', cost: '20 tokens', href: '/dashboard/domains' },
              { step: '3', label: 'Set up a business email', sub: 'hello@yourdomain.com', cost: '10 tokens', href: '/dashboard/emails' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-400">{item.step}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.sub}</p>
                </div>
                <span className="text-xs font-semibold text-amber-400 flex-shrink-0">{item.cost}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Need more tokens? Top up anytime from the sidebar.
        </p>
      </div>
    ),
    cta: { label: 'Create my first website', href: '/dashboard/websites' },
  },
];

export default function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) setVisible(true);
    } catch {
      // localStorage not available (SSR safety)
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#111] border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header gradient accent */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-amber-400" />

        <div className="p-6">
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-5">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === step ? 'bg-blue-400 flex-1' : i < step ? 'bg-blue-400/40 w-6' : 'bg-white/10 w-6'
                }`}
              />
            ))}
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white mb-1">{current.title}</h2>
          <p className="text-sm text-gray-400 mb-5">{current.subtitle}</p>

          {/* Content */}
          <div className="mb-6">{current.content}</div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {isLast && current.cta ? (
              <>
                <button
                  onClick={dismiss}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Go to dashboard
                </button>
                <Link
                  href={current.cta.href}
                  onClick={dismiss}
                  className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold text-center transition-all"
                >
                  {current.cta.label}
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={dismiss}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors px-2"
                >
                  Skip
                </button>
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all"
                >
                  Next →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

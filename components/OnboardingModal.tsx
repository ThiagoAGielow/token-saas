'use client';

import { useEffect, useState } from 'react';

interface OnboardingSlide {
  emoji: string;
  title: string;
  description: string;
}

const SLIDES: readonly OnboardingSlide[] = [
  {
    emoji: '🎁',
    title: 'Welcome! You got 100 free tokens',
    description: 'Your wallet is loaded. Spend tokens on anything you build. No subscriptions required.',
  },
  {
    emoji: '🎯',
    title: 'Every action shows its cost',
    description: 'Before confirming, you always see exactly how many tokens it will cost. No surprises, ever.',
  },
  {
    emoji: '🔓',
    title: 'Tokens never expire',
    description: 'Your tokens are yours forever. Buy once, use when you need. No pressure to use them fast.',
  },
];

const STORAGE_KEY = 'velocitysites_onboarded_v1';

export default function OnboardingModal() {
  const [isOpen, setIsOpen]     = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setIsOpen(true);
  }, []);

  function complete(): void {
    localStorage.setItem(STORAGE_KEY, '1');
    setIsOpen(false);
  }

  function next(): void {
    if (slideIndex < SLIDES.length - 1) {
      setSlideIndex(slideIndex + 1);
    } else {
      complete();
    }
  }

  if (!isOpen) return null;

  const current = SLIDES[slideIndex];
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-xl">
        <div className="text-center">
          <div className="text-6xl mb-4">{current.emoji}</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{current.title}</h2>
          <p className="text-slate-600">{current.description}</p>
        </div>

        <div className="flex justify-center gap-2 mt-8">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === slideIndex ? 'bg-blue-600 w-8' : 'bg-slate-200 w-1.5'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3 mt-8">
          {slideIndex > 0 && (
            <button
              onClick={() => setSlideIndex(slideIndex - 1)}
              className="flex-1 py-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition font-medium"
            >
              Back
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-semibold"
          >
            {slideIndex === SLIDES.length - 1 ? "Let's go! →" : 'Next →'}
          </button>
        </div>

        <button
          onClick={complete}
          className="block mx-auto mt-4 text-xs text-slate-400 hover:text-slate-600"
        >
          Skip intro
        </button>
      </div>
    </div>
  );
}

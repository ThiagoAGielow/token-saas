'use client';

import { useLanguage } from '@/contexts/LanguageContext';

const LANGUAGES = [
  {
    code:  'en',
    label: 'English',
    short: 'EN',
    flag:  (
      // US flag SVG (simplified stripes + union)
      <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-sm overflow-hidden flex-shrink-0">
        <rect width="20" height="14" fill="#B22234"/>
        <rect y="1.077" width="20" height="1.077" fill="white"/>
        <rect y="3.231" width="20" height="1.077" fill="white"/>
        <rect y="5.385" width="20" height="1.077" fill="white"/>
        <rect y="7.538" width="20" height="1.077" fill="white"/>
        <rect y="9.692" width="20" height="1.077" fill="white"/>
        <rect y="11.846" width="20" height="1.077" fill="white"/>
        <rect width="9" height="7.538" fill="#3C3B6E"/>
      </svg>
    ),
  },
  {
    code:  'pt',
    label: 'Português (BR)',
    short: 'PT',
    flag:  (
      // Brazil flag SVG (green + yellow diamond + blue circle)
      <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-sm overflow-hidden flex-shrink-0">
        <rect width="20" height="14" fill="#009C3B"/>
        <polygon points="10,1 19,7 10,13 1,7" fill="#FFDF00"/>
        <circle cx="10" cy="7" r="3" fill="#002776"/>
        <path d="M7.2 6.1 Q10 5 12.8 6.1" stroke="white" strokeWidth="0.6" fill="none"/>
      </svg>
    ),
  },
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  const other   = LANGUAGES.find(l => l.code !== lang);

  return (
    <div className="relative group">
      {/* Trigger button */}
      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all text-xs text-gray-300 font-medium">
        {current.flag}
        <span>{current.short}</span>
        <svg className="w-3 h-3 text-gray-500 group-hover:text-gray-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-[#111] border border-white/10 shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
        {LANGUAGES.map(l => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
              lang === l.code
                ? 'bg-blue-500/10 text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            {l.flag}
            <span className="flex-1 text-left">{l.label}</span>
            {lang === l.code && (
              <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

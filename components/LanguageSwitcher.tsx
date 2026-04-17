'use client';

import { useLanguage, type Language } from '@/contexts/LanguageContext';

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  const languages: ReadonlyArray<{ code: Language; flag: string; label: string }> = [
    { code: 'en', flag: '🇺🇸', label: 'EN' },
    { code: 'pt', flag: '🇧🇷', label: 'PT' },
  ];

  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition ${
            lang === l.code
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-label={`Switch to ${l.label}`}
        >
          <span>{l.flag}</span>
          <span>{l.label}</span>
        </button>
      ))}
    </div>
  );
}

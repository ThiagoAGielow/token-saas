'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { translations } from './translations';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Language = 'en' | 'pt';

export type TranslationKey = keyof typeof translations.en;

// `t` returns `any` because translation values can be `string` or `string[]`;
// consumer components decide how to render each key at the call site.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Translator = (key: TranslationKey) => any;

interface LanguageContextValue {
  lang: Language;
  t: Translator;
  setLang: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang:    'en',
  t:       (key) => key,
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('vs_lang');
    if (saved === 'pt' || saved === 'en') setLangState(saved);
  }, []);

  function setLang(newLang: Language): void {
    setLangState(newLang);
    localStorage.setItem('vs_lang', newLang);
  }

  const t: Translator = (key) => {
    const bag = translations[lang] as Record<TranslationKey, unknown>;
    return bag[key] ?? (translations.en as Record<TranslationKey, unknown>)[key];
  };

  return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

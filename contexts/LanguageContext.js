'use client';

import { createContext, useContext, useState, useEffect } from 'react';

// ─── Translations ─────────────────────────────────────────────────────────────

const translations = {
  en: {
    // Nav
    nav_overview:     'Overview',
    nav_websites:     'Websites',
    nav_domains:      'Domains',
    nav_emails:       'Emails',
    nav_agency:       'Agency',
    nav_apiKeys:      'API Keys',
    nav_usage:        'Usage',
    nav_settings:     'Settings',
    nav_buyTokens:    'Buy Tokens',
    nav_aiAssistant:  'AI Assistant',

    // Page titles
    page_overview:    'Overview',
    page_websites:    'Websites',
    page_domains:     'Domains',
    page_emails:      'Emails',
    page_apiKeys:     'API Keys',
    page_usage:       'Usage & Analytics',
    page_buyTokens:   'Buy Tokens',
    page_settings:    'Settings',
    page_agency:      'Agency Portal',
    page_dashboard:   'Dashboard',

    // AI Assistant drawer
    ai_editingWebsite:   'Editing website',
    ai_whatToChange:     'What would you like to change?',
    ai_placeholder:      'Ask me to change',
    ai_noWebsites:       'No websites yet. Create one first.',
    ai_ctrlEnter:        'Ctrl+Enter to send',
    ai_siteUpdated:      'Site updated — refresh preview to see changes',

    // Common
    tokens:           'tokens',
    live:             'Live',
    draft:            'Draft',
    building:         'Building',
    paused:           'Paused',
  },

  pt: {
    // Nav
    nav_overview:     'Visão Geral',
    nav_websites:     'Sites',
    nav_domains:      'Domínios',
    nav_emails:       'E-mails',
    nav_agency:       'Agência',
    nav_apiKeys:      'Chaves API',
    nav_usage:        'Uso',
    nav_settings:     'Configurações',
    nav_buyTokens:    'Comprar Tokens',
    nav_aiAssistant:  'Assistente IA',

    // Page titles
    page_overview:    'Visão Geral',
    page_websites:    'Sites',
    page_domains:     'Domínios',
    page_emails:      'E-mails',
    page_apiKeys:     'Chaves API',
    page_usage:       'Uso e Análises',
    page_buyTokens:   'Comprar Tokens',
    page_settings:    'Configurações',
    page_agency:      'Portal da Agência',
    page_dashboard:   'Painel',

    // AI Assistant drawer
    ai_editingWebsite:   'Editando site',
    ai_whatToChange:     'O que você gostaria de mudar?',
    ai_placeholder:      'Me peça para alterar',
    ai_noWebsites:       'Nenhum site ainda. Crie um primeiro.',
    ai_ctrlEnter:        'Ctrl+Enter para enviar',
    ai_siteUpdated:      'Site atualizado — atualize o preview para ver as mudanças',

    // Common
    tokens:           'tokens',
    live:             'Ao Vivo',
    draft:            'Rascunho',
    building:         'Construindo',
    paused:           'Pausado',
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────

const LanguageContext = createContext({
  lang:   'en',
  t:      (key) => key,
  setLang: () => {},
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('en');

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('vs_lang');
    if (saved === 'pt' || saved === 'en') setLangState(saved);
  }, []);

  function setLang(newLang) {
    setLangState(newLang);
    localStorage.setItem('vs_lang', newLang);
  }

  function t(key) {
    return translations[lang]?.[key] ?? translations.en[key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

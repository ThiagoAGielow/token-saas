'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import TokenBalance from '@/components/TokenBalance';
import OnboardingModal from '@/components/OnboardingModal';
import SidebarAIChat from '@/components/SidebarAIChat';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';

// TODO: replace with real data from API/context
const MOCK_USER = {
  name: 'Thiago',
  email: 'thiago@example.com',
  plan: 'Growth',
};

// ─── SVG Icon components ──────────────────────────────────────────────────────
// Explicit width/height ensures correct size even if CSS classes fail to load.

function IcoOverview() {
  return (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
    </svg>
  );
}

function IcoWebsites() {
  return (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function IcoDomains() {
  return (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function IcoEmails() {
  return (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function IcoApiKeys() {
  return (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function IcoUsage() {
  return (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function IcoSettings() {
  return (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IcoCoin() {
  return (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function IcoAgency() {
  return (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 11-8 0 4 4 0 018 0zm6 4a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

type NavItemData = {
  labelKey: string;
  href: string;
  icon: React.ReactNode;
  exact?: boolean;
  badge?: string;
};

type Translate = (key: string) => string;

const NAV_ITEMS: NavItemData[] = [
  { labelKey: 'nav_overview',  href: '/dashboard',           icon: <IcoOverview />,  exact: true },
  { labelKey: 'nav_websites',  href: '/dashboard/websites',  icon: <IcoWebsites />,  badge: '3' },
  { labelKey: 'nav_domains',   href: '/dashboard/domains',   icon: <IcoDomains />,   badge: '2' },
  { labelKey: 'nav_emails',    href: '/dashboard/emails',    icon: <IcoEmails />,    badge: '5' },
  { labelKey: 'nav_agency',    href: '/dashboard/agency',    icon: <IcoAgency /> },
  { labelKey: 'nav_apiKeys',   href: '/dashboard/api-keys',  icon: <IcoApiKeys /> },
  { labelKey: 'nav_usage',     href: '/dashboard/usage',     icon: <IcoUsage /> },
  { labelKey: 'nav_settings',  href: '/dashboard/settings',  icon: <IcoSettings /> },
];

const BUY_TOKENS_HREF = '/dashboard/tokens';

function NavItem({ item, pathname, t }: { item: NavItemData; pathname: string; t: Translate }) {
  const isActive = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
        isActive
          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
          : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
      }`}
    >
      <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
        {item.icon}
      </span>
      <span className="flex-1">{t(item.labelKey)}</span>
      {item.badge && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${isActive ? 'bg-blue-500/20 text-blue-300' : 'bg-white/10 text-gray-400'}`}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// ─── Inner layout (needs access to LanguageContext) ───────────────────────────

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t }    = useLanguage();

  const getPageTitle = () => {
    if (pathname === '/dashboard')                       return t('page_overview');
    if (pathname.startsWith('/dashboard/websites'))      return t('page_websites');
    if (pathname.startsWith('/dashboard/domains'))       return t('page_domains');
    if (pathname.startsWith('/dashboard/emails'))        return t('page_emails');
    if (pathname.startsWith('/dashboard/api-keys'))      return t('page_apiKeys');
    if (pathname.startsWith('/dashboard/usage'))         return t('page_usage');
    if (pathname.startsWith('/dashboard/tokens'))        return t('page_buyTokens');
    if (pathname.startsWith('/dashboard/settings'))      return t('page_settings');
    if (pathname.startsWith('/dashboard/agency'))        return t('page_agency');
    return t('page_dashboard');
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden" style={{ minWidth: '900px' }}>
      <OnboardingModal />

      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0 border-r border-white/10"
        style={{ width: '240px' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-white/10 flex-shrink-0">
          <div
            className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black"
            style={{ width: '32px', height: '32px', fontSize: '14px' }}
          >
            V
          </div>
          <span className="font-bold text-white text-base tracking-tight">TokenFlow</span>
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">
            {MOCK_USER.plan}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} t={t} />
          ))}

          <div className="my-3 border-t border-white/10" />

          {/* Buy Tokens - highlighted */}
          <Link
            href={BUY_TOKENS_HREF}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 group border ${
              pathname.startsWith('/dashboard/tokens')
                ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                : 'text-amber-400 hover:bg-amber-400/10 border-amber-400/20 hover:border-amber-400/30'
            }`}
          >
            <span className="text-amber-400 flex-shrink-0"><IcoCoin /></span>
            <span>{t('nav_buyTokens')}</span>
          </Link>

          {/* AI Assistant */}
          <SidebarAIChat />
        </nav>

        {/* Token Balance */}
        <div className="px-3 pb-3 flex-shrink-0">
          <TokenBalance compact />
        </div>

        {/* User section */}
        <div className="px-3 pb-4 flex-shrink-0 border-t border-white/10 pt-3">
          <div className="flex items-center gap-3 px-2">
            <div
              className="rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ width: '32px', height: '32px', fontSize: '14px' }}
            >
              {MOCK_USER.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{MOCK_USER.name}</p>
              <p className="text-xs text-gray-500 truncate">{MOCK_USER.email}</p>
            </div>
            <button className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0">
              <svg width="16" height="16" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{ minWidth: 0 }}>
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 h-16 border-b border-white/10 bg-[#0a0a0a] flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-white">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Language switcher */}
            <LanguageSwitcher />

            {/* Notification bell */}
            <button
              className="relative rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
              style={{ width: '36px', height: '36px' }}
            >
              <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border border-[#0a0a0a]" />
            </button>

            {/* User avatar */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer transition-colors">
              <div
                className="rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold"
                style={{ width: '28px', height: '28px', fontSize: '12px' }}
              >
                {MOCK_USER.name.charAt(0)}
              </div>
              <span className="text-sm text-gray-300 font-medium">{MOCK_USER.name}</span>
              <svg width="14" height="14" className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Outer layout — wraps with LanguageProvider ───────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <DashboardInner>{children}</DashboardInner>
    </LanguageProvider>
  );
}
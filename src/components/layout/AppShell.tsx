'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Sparkles, Calculator, Compass, GraduationCap, BookOpen, PenTool,
  Crown, Shield, Menu, X, Search, LogOut, ChevronDown, ArrowUpRight,
} from 'lucide-react';
import { GauthPlusModal } from '@/components/modals/GauthPlusModal';

export const GAUTH_SUBJECTS = [
  'Math', 'Physics', 'Chemistry', 'Biology', 'Writing', 'Literature',
  'Business', 'Computer Science', 'Statistics', 'Economics', 'Social Science', 'Accounting',
] as const;

const PRIMARY_NAV_ITEMS = [
  { href: '/', label: 'Solve', icon: Sparkles },
  { href: '/calculator', label: 'Calculator', icon: Calculator },
  { href: '/writing-examples', label: 'Writing', icon: PenTool },
  { href: '/search-question', label: 'Study Bank', icon: Search },
];

const EXPLORE_NAV_ITEMS = [
  { href: '/atlas', label: 'Atlas', description: 'Explore a bigger idea', icon: Compass },
  { href: '/course', label: 'Academy', description: 'Learn, one step at a time', icon: GraduationCap },
  { href: '/study-resources', label: 'Subjects', description: 'Find your field of study', icon: BookOpen },
];

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [plusModalOpen, setPlusModalOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [planTier, setPlanTier] = useState<'FREE' | 'PLUS'>('FREE');
  const drawerRef = useRef<HTMLDialogElement>(null);
  const exploreRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
    if (exploreRef.current) exploreRef.current.open = false;
    fetch('/api/subscription')
      .then((r) => r.json())
      .then((data) => {
        if (data?.subscription) setPlanTier(data.subscription.planTier);
        setSessionUser(data?.user?.email ? data.user : null);
      })
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    if (!mobileMenuOpen) {
      drawer.close();
      return;
    }
    drawer.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      drawer.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const isActive = (href: string) =>
    href === '/'
      ? pathname === '/' || pathname.startsWith('/solution')
      : pathname.startsWith(href);

  const mobileNavItems = [
    ...PRIMARY_NAV_ITEMS,
    ...EXPLORE_NAV_ITEMS,
    ...(sessionUser?.role === 'ADMIN' ? [{ href: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link">{t("Skip to content")}</a>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label={t("Gauth home")} data-testid="gauth-brand-logo">
            <svg className="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 2C16 11 11 16 2 16C11 16 16 21 16 30C16 21 21 16 30 16C21 16 16 11 16 2Z" fill="currentColor" />
            </svg>
            <span className="brand-name">gauth</span>
            <span className="brand-caption">{t("A clearer way to learn.")}</span>
          </Link>

          <nav aria-label={t("Main navigation")} className="desktop-nav">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link"
                aria-current={isActive(item.href) ? 'page' : undefined}
                data-testid={`nav-link-${item.href.replace(/\//g, '') || 'home'}`}
              >
                {t(item.label)}
              </Link>
            ))}
            <details
              ref={exploreRef}
              className="nav-explore"
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector('summary')?.focus();
                }
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  event.currentTarget.open = false;
                }
              }}
            >
              <summary className="nav-link">{t("Explore")}<ChevronDown className="h-3 w-3" aria-hidden="true" />
              </summary>
              <div className="nav-popover">
                {EXPLORE_NAV_ITEMS.map(({ href, label, description, icon: Icon }) => (
                  <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined}>
                    <Icon className="h-4 w-4 text-atelier-vermilion" aria-hidden="true" />
                    <span>{t(label)}<small>{t(description)}</small></span>
                  </Link>
                ))}
              </div>
            </details>
          </nav>

          <div className="header-actions">
            <button
              type="button"
              className="language-toggle"
              data-testid="language-toggle"
              aria-label={locale === 'en' ? 'Switch to Chinese' : 'Switch to English'}
              lang={locale === 'en' ? 'zh-CN' : 'en'}
              onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
            >
              {locale === 'en' ? '中文' : 'EN'}
            </button>
            <button
              type="button"
              onClick={() => setPlusModalOpen(true)}
              className="header-plus"
              data-testid="open-gauth-plus-btn"
            >
              <Crown className="h-3.5 w-3.5" aria-hidden="true" />
              {planTier === 'PLUS' ? t('PLUS Active') : t('Go Plus')}
            </button>
            {sessionUser ? (
              <div className="flex items-center gap-3">
                <Link href="/auth" className="account-link" data-testid="user-profile-pill">
                  <span className="account-avatar">
                    {(sessionUser.name || sessionUser.email).charAt(0).toUpperCase()}
                  </span>
                  <span className="account-name truncate">{sessionUser.name || sessionUser.email}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/auth' })}
                  aria-label={t("Sign out")}
                  data-testid="navbar-signout-btn"
                  className="hidden p-2 text-atelier-muted sm:block"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link href="/auth" className="primary-button" data-testid="user-profile-pill">{t("Sign in")}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="mobile-menu-button"
            aria-label={t("Open navigation")}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            data-testid="mobile-menu-toggle"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <dialog
        ref={drawerRef}
        id="mobile-navigation"
        className="mobile-drawer"
        aria-labelledby="mobile-navigation-title"
        onCancel={() => setMobileMenuOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right) {
              setMobileMenuOpen(false);
            }
          }
        }}
      >
        <div className="flex items-center justify-between">
          <span id="mobile-navigation-title" className="text-lg font-semibold">{t("Find your focus.")}</span>
          <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label={t("Close navigation")} className="p-2">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav aria-label={t("Mobile navigation")}>
          {mobileNavItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Icon className="h-4 w-4" aria-hidden="true" /> {t(label)}
            </Link>
          ))}
        </nav>
        <div className="mt-10 flex flex-col gap-4 border-t border-atelier-border pt-6">
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setMobileMenuOpen(false);
              setPlusModalOpen(true);
            }}
          >
            <Crown className="h-4 w-4" /> {planTier === 'PLUS' ? t('Manage Plus') : t('Discover Gauth Plus')}
          </button>
          {sessionUser && (
            <button type="button" className="text-button" onClick={() => signOut({ callbackUrl: '/auth' })}>{t("Sign out")}</button>
          )}
        </div>
      </dialog>

      <main id="main-content" className="min-w-0 flex-1" tabIndex={-1}>{children}</main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div><strong className="font-semibold text-atelier-ink">gauth</strong><span className="ml-3">{t("A little clarity goes a long way.")}</span></div>
          <div className="footer-links">
            <Link href="/aboutus">{t("About")}</Link>
            <Link href="/blog">{t("Journal")}</Link>
            <Link href="/plus">{t("Membership")}</Link>
            <Link href="/download">{t("Get the app")}</Link>
            <Link href="/honor">{t("Honor code")}</Link>
            {sessionUser?.role === 'ADMIN' && <Link href="/admin">{t("Admin")}</Link>}
          </div>
        </div>
      </footer>

      <GauthPlusModal
        isOpen={plusModalOpen}
        onClose={() => setPlusModalOpen(false)}
        currentTier={planTier}
        onUpgradeSuccess={(tier) => {
          if (tier === 'FREE' || tier === 'PLUS') setPlanTier(tier);
        }}
      />
    </div>
  );
}

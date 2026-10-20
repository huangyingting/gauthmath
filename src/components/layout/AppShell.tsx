'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  Calculator,
  Compass,
  GraduationCap,
  BookOpen,
  PenTool,
  Crown,
  Shield,
  Menu,
  X,
  UserCheck,
  History,
  ChevronRight,
  Cpu,
} from 'lucide-react';
import { GauthPlusModal } from '@/components/modals/GauthPlusModal';

export const GAUTH_SUBJECTS = [
  'Math',
  'Physics',
  'Chemistry',
  'Biology',
  'Writing',
  'Literature',
  'Business',
  'Computer Science',
  'Statistics',
  'Economics',
  'Social Science',
  'Accounting',
] as const;

const NAV_ITEMS = [
  {
    href: '/',
    label: 'AI Homework Helper',
    icon: Sparkles,
    badge: 'HOT',
  },
  {
    href: '/calculator',
    label: 'AI Calculator',
    icon: Calculator,
  },
  {
    href: '/atlas',
    label: 'Gauth Atlas',
    icon: Compass,
    badge: 'VISUAL',
  },
  {
    href: '/course',
    label: 'Gauth Academy',
    icon: GraduationCap,
    badge: 'NEW',
  },
  {
    href: '/study-resources',
    label: 'Study Resources',
    icon: BookOpen,
  },
  {
    href: '/writing-examples',
    label: 'Writing Helper',
    icon: PenTool,
  },
  {
    href: '/plus',
    label: 'Gauth PLUS',
    icon: Crown,
  },
  {
    href: '/admin',
    label: 'Admin & Invites',
    icon: Shield,
  },
];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [plusModalOpen, setPlusModalOpen] = useState(false);
  const [userTier, setUserTier] = useState<'FREE' | 'PLUS'>('FREE');
  const [userName, setUserName] = useState('Joshuah Powlowski');
  const [userRole, setUserRole] = useState('STUDENT');
  const [recentHistory, setRecentHistory] = useState<
    Array<{ id: string; slug: string; promptText: string; subject: string }>
  >([]);

  useEffect(() => {
    fetch('/api/subscription')
      .then((r) => r.json())
      .then((data) => {
        if (data?.subscription?.planTier) {
          setUserTier(data.subscription.planTier);
        }
        if (data?.user?.name) {
          setUserName(data.user.name);
        }
        if (data?.user?.role) {
          setUserRole(data.user.role);
        }
      })
      .catch(() => {});

    fetch('/api/questions')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.questions)) {
          setRecentHistory(data.questions.slice(0, 5));
        }
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Global Navigation Bar */}
      <header className="sticky top-0 z-40 h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-6">
          {/* Left: Hamburger + Gauth Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Toggle Navigation Drawer"
              data-testid="mobile-menu-toggle"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            <Link
              href="/"
              className="flex items-center gap-2.5"
              data-testid="gauth-brand-logo"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF4B4B] font-black text-white shadow-sm">
                G
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-tight text-slate-900">
                    Gauth
                  </span>
                  <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-[#FF4B4B]">
                    AI Pro
                  </span>
                </div>
                <span className="hidden text-[10px] text-slate-400 sm:inline">
                  #1 AI Study Companion · 12 STEM Subjects
                </span>
              </div>
            </Link>

            {/* Quick Top Links on Desktop */}
            <nav className="ml-6 hidden items-center gap-1 xl:flex">
              <Link
                href="/study-resources"
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Subjects (12)
              </Link>
              <Link
                href="/calculator"
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Calculator
              </Link>
              <Link
                href="/atlas"
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Atlas
              </Link>
              <Link
                href="/course"
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Academy
              </Link>
              <Link
                href="/blog"
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Blog
              </Link>
              <Link
                href="/download"
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Download App
              </Link>
            </nav>
          </div>

          {/* Right: Pluggable AI Badge, Gauth PLUS CTA & Authenticated Profile */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/admin"
              className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 md:inline-flex"
              title="Pluggable AI Engine: Copilot SDK + Azure OpenAI + Symbolic CAS"
            >
              <Cpu className="h-3.5 w-3.5 text-indigo-600" />
              <span>Copilot SDK + CAS</span>
            </Link>

            <button
              type="button"
              onClick={() => setPlusModalOpen(true)}
              data-testid="open-gauth-plus-btn"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow-xs transition hover:brightness-105"
            >
              <Crown className="h-3.5 w-3.5" />
              <span>{userTier === 'PLUS' ? 'GAUTH PLUS ACTIVE' : 'Gauth PLUS'}</span>
            </button>

            <Link
              href="/auth"
              data-testid="user-profile-pill"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-600">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden max-w-[130px] truncate sm:inline">
                {userName}
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                {userRole}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area with Left Collapsible Sidebar */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-1">
        {/* Desktop Left Navigation Rail */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-white p-4 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-6">
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/'
                    ? pathname === '/' || pathname.startsWith('/solution')
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-testid={`nav-link-${item.href.replace(/\//g, '') || 'home'}`}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                      isActive
                        ? 'bg-rose-50 text-[#FF4B4B]'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                          isActive
                            ? 'bg-[#FF4B4B] text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Recent Solved History */}
            <div className="border-t border-slate-100 pt-4">
              <div className="mb-2 flex items-center justify-between px-2">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <History className="h-3.5 w-3.5" />
                  Recent Solutions
                </span>
                <Link
                  href="/search-question"
                  className="text-[11px] font-semibold text-rose-500 hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="space-y-1">
                {recentHistory.map((q) => (
                  <Link
                    key={q.id}
                    href={`/solution/${q.slug || q.id}`}
                    className="group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <div className="truncate pr-2">
                      <span className="mr-1.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                        {q.subject}
                      </span>
                      <span className="font-medium">{q.promptText}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-rose-500" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Company & Honor Code Links */}
          <div className="border-t border-slate-100 pt-4 text-[11px] text-slate-400">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <Link href="/aboutus" className="hover:text-slate-700">
                About Us
              </Link>
              <Link href="/honor" className="hover:text-slate-700">
                Honor Code
              </Link>
              <Link href="/blog" className="hover:text-slate-700">
                Blog
              </Link>
              <Link href="/download" className="hover:text-slate-700">
                App
              </Link>
            </div>
            <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
              <UserCheck className="h-3 w-3 text-emerald-500" />
              Invite-Only Security · Audited
            </p>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-slate-900/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-10 flex w-72 flex-col justify-between bg-white p-4 shadow-2xl">
              <div className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-[#FF4B4B]"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                Signed in as <strong>{userName}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Primary Viewport Content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Gauth PLUS Modal */}
      <GauthPlusModal
        isOpen={plusModalOpen}
        onClose={() => setPlusModalOpen(false)}
        currentTier={userTier}
        onUpgradeSuccess={(tier) => setUserTier(tier as 'FREE' | 'PLUS')}
      />
    </div>
  );
}

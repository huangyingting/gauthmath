'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import type { LocalizedMessage } from '@/lib/i18n';
import React, { useState, useEffect } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut,
  CheckCircle2,
  AlertCircle,
  Globe,
} from 'lucide-react';

export default function AuthPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<'signin' | 'register'>('signin');

  // Active session state (no hardcoded demo user)
  const [activeUser, setActiveUser] = useState<{
    id: string;
    email: string;
    name: string;
    role: string;
  } | null>(null);

  // Sign In state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginStatus, setLoginStatus] = useState<LocalizedMessage | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Invite-Only Registration state
  const [inviteCode, setInviteCode] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<LocalizedMessage | null>(null);

  useEffect(() => {
    fetch('/api/subscription')
      .then((r) => r.json())
      .then((data) => {
        if (data?.user && data.user.email) {
          setActiveUser(data.user);
        } else {
          setActiveUser(null);
        }
      })
      .catch(() => {});
  }, [loginStatus]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    setLoginStatus(null);
    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: loginEmail,
        password: loginPassword,
      });
      if (res?.error) {
        setLoginError(
          res.error === 'ACCOUNT_REVOKED'
            ? 'Your account access has been revoked by a platform administrator.'
            : 'Invalid email or password.'
        );
      } else {
        setLoginStatus({ key: 'Signed in successfully as {email}!', values: { email: loginEmail } });
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setLoginError(null);
    await signIn('google', { callbackUrl: '/' });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRegError(null);
    setRegSuccess(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationCode: inviteCode,
          email: regEmail,
          name: regName,
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setRegError(data.error || 'Invitation registration failed.');
      } else {
        setRegSuccess({
          key: 'Account created for {email} with role {role}! Signing you in...',
          values: { email: data.user.email, role: data.user.role },
        });
        await signIn('credentials', {
          redirect: false,
          email: regEmail,
          password: regPassword,
        });
        router.push('/');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-layout"
      data-testid="auth-page"
    >
      <aside className="auth-intro">
        <span className="eyebrow text-atelier-vermilion">{t("Make a little room for learning")}</span>
        <h1>{t("A clearer mind")}<br />{t("starts here.")}</h1>
        <p>{t("Your questions, your discoveries, your next big idea. Pick up where your curiosity left off.")}</p>
        <div className="auth-note">{t("New here? An invitation is your way in.")}<Link href="/aboutus" className="mt-3 block font-medium text-atelier-vermilion">{t("Get to know Tavi →")}</Link>
        </div>
      </aside>

      <div className="min-w-0">

      {/* Active Session Banner (Only shown when signed in) */}
      {activeUser && (
        <div className="lumina-card mt-6 flex items-center justify-between p-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">{t('Active Session · {role}', { role: t(activeUser.role) })}
            </div>
            <div className="mt-0.5 text-sm font-bold text-atelier-obsidian">
              {activeUser.name}
            </div>
            <div className="text-xs text-slate-500">{activeUser.email}</div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/auth' })}
            data-testid="auth-signout-btn"
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
          >
            <LogOut className="h-3.5 w-3.5" />{t("Sign Out")}</button>
        </div>
      )}

      {/* Primary Focal Stage: Authentication Card */}
      <div className="paper-panel p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-semibold">{tab === 'signin' ? t('Welcome back.') : t('A new chapter.')}</h2>
          <p className="mt-2 text-sm text-atelier-muted">{tab === 'signin' ? t('Sign in and find your focus.') : t('Redeem your invitation to get started.')}</p>
        </div>
        <div className="flex border-b border-atelier-border">
          <button
            type="button"
            onClick={() => setTab('signin')}
            data-testid="auth-tab-signin"
            aria-pressed={tab === 'signin'}
            className={`flex-1 border-b-2 py-3 text-sm transition ${
              tab === 'signin'
                ? 'border-atelier-obsidian font-semibold text-atelier-obsidian'
                : 'border-transparent text-atelier-muted'
            }`}
          >{t("Sign In")}</button>
          <button
            type="button"
            onClick={() => setTab('register')}
            data-testid="auth-tab-register"
            aria-pressed={tab === 'register'}
            className={`flex-1 border-b-2 py-3 text-sm transition ${
              tab === 'register'
                ? 'border-atelier-obsidian font-semibold text-atelier-obsidian'
                : 'border-transparent text-atelier-muted'
            }`}
          >{t("Redeem Invite")}</button>
        </div>

        {tab === 'signin' ? (
          <div className="mt-5 space-y-4">
            {/* Google OAuth 2.0 Provider Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              data-testid="google-oauth-signin-btn"
              className="secondary-button w-full disabled:opacity-50"
            >
              <Globe className="h-4 w-4 text-atelier-cobalt" />
              <span>{t("Continue with Google")}</span>
            </button>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-slate-100" />
              <span className="mx-3 shrink-0 text-[11px] font-medium text-slate-400">{t("or sign in with email")}</span>
              <div className="flex-grow border-t border-slate-100" />
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              {loginError && (
                <div
                  className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3.5 text-xs font-medium text-rose-700"
                  data-testid="auth-signin-error"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{t(loginError)}</span>
                </div>
              )}

              {loginStatus && (
                <div
                  className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3.5 text-xs font-medium text-emerald-800"
                  data-testid="auth-signin-success"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{t(loginStatus.key, loginStatus.values)}</span>
                </div>
              )}

              <div>
                <label htmlFor="signin-email" className="block text-xs font-semibold text-slate-600">{t("Email Address")}</label>
                <input
                  type="email"
                  id="signin-email"
                  autoComplete="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@institution.edu"
                  data-testid="signin-email-input"
                  className="lumina-input mt-1.5 w-full px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label htmlFor="signin-password" className="block text-xs font-semibold text-slate-600">{t("Password")}</label>
                <input
                  type="password"
                  id="signin-password"
                  autoComplete="current-password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder={t("Enter your password")}
                  data-testid="signin-password-input"
                  className="lumina-input mt-1.5 w-full px-4 py-3 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                data-testid="signin-submit-btn"
                className="primary-button mt-2 w-full"
              >
                {loading ? t('Signing in...') : t('Sign In')}
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="mt-5 space-y-3">
            <p className="text-xs leading-relaxed text-slate-500">{t("Registration requires a single-use invitation code (")}<code className="font-mono text-atelier-obsidian">TAVI-XXXX-XXXX</code>{t(") issued for your email address.")}</p>

            {regError && (
              <div
                className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3.5 text-xs font-medium text-rose-700"
                data-testid="auth-register-error"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{t(regError)}</span>
              </div>
            )}

            {regSuccess && (
              <div
                className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3.5 text-xs font-medium text-emerald-800"
                data-testid="auth-register-success"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{t(regSuccess.key, { ...regSuccess.values, role: t(String(regSuccess.values?.role || '')) })}</span>
              </div>
            )}

            <div>
              <label htmlFor="register-invite" className="block text-xs font-semibold text-slate-600">{t("Invitation Code")}</label>
              <input
                type="text"
                id="register-invite"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="TAVI-XXXX-XXXX"
                data-testid="register-invite-code-input"
                className="lumina-input mt-1.5 w-full px-4 py-3 font-mono text-sm font-semibold"
              />
            </div>

            <div>
              <label htmlFor="register-email" className="block text-xs font-semibold text-slate-600">{t("Invited Email Address")}</label>
              <input
                type="email"
                id="register-email"
                autoComplete="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="invited-email@domain.com"
                data-testid="register-email-input"
                className="lumina-input mt-1.5 w-full px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label htmlFor="register-name" className="block text-xs font-semibold text-slate-600">{t("Full Name")}</label>
              <input
                type="text"
                id="register-name"
                autoComplete="name"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder={t("Your Full Name")}
                data-testid="register-name-input"
                className="lumina-input mt-1.5 w-full px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="block text-xs font-semibold text-slate-600">{t("Password")}</label>
              <input
                type="password"
                id="register-password"
                autoComplete="new-password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder={t("At least 8 characters")}
                data-testid="register-password-input"
                className="lumina-input mt-1.5 w-full px-4 py-3 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="register-submit-btn"
              className="primary-button mt-2 w-full"
            >
              {loading
                ? t('Creating Account...')
                : t('Redeem Invite & Create Account')}
            </button>
          </form>
        )}
      </div>

      {/* Quiet Tertiary Security Footnote */}
      <div className="mt-6 text-center text-xs text-atelier-muted">
        <p>{t("Learn with curiosity. Create with integrity.")}{' '}
          <Link href="/honor" className="font-medium text-atelier-vermilion hover:underline">{t("Our honor code")}</Link>
        </p>
      </div>
      </div>
    </div>
  );
}

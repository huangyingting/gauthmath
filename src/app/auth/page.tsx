'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  KeyRound,
  LogIn,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'signin' | 'register'>('signin');

  // Sign In state
  const [loginEmail, setLoginEmail] = useState('joshuah@gauthmath.com');
  const [loginPassword, setLoginPassword] = useState('GauthPassword123!');
  const [loginStatus, setLoginStatus] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Invite-Only Registration state
  const [inviteCode, setInviteCode] = useState('GAUTH-2026-STUD');
  const [regEmail, setRegEmail] = useState('student-invite@gauthmath.com');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

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
        setLoginStatus(`Signed in successfully as ${loginEmail}!`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
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
        setRegSuccess(
          `Account created for ${data.user.email} with role ${data.user.role}! Signing you in...`
        );
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
      className="mx-auto max-w-4xl px-4 py-10 sm:px-8"
      data-testid="auth-page"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 7 Columns: Sign In / Invite-Only Registration Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8 lg:col-span-7">
          <div className="flex gap-2 border-b border-slate-100 pb-4">
            <button
              type="button"
              onClick={() => setTab('signin')}
              data-testid="auth-tab-signin"
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold transition ${
                tab === 'signin'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab('register')}
              data-testid="auth-tab-register"
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold transition ${
                tab === 'register'
                  ? 'bg-[#FF4B4B] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Invite-Only Registration
            </button>
          </div>

          {tab === 'signin' ? (
            <form onSubmit={handleSignIn} className="mt-5 space-y-4">
              <div>
                <h1 className="text-xl font-black text-slate-900">
                  Sign In to Gauth AI
                </h1>
                <p className="mt-1 text-xs text-slate-500">
                  Authenticate with your student, tutor, or administrator credentials
                </p>
              </div>

              {loginError && (
                <div
                  className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700"
                  data-testid="auth-signin-error"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {loginStatus && (
                <div
                  className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800"
                  data-testid="auth-signin-success"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{loginStatus}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  data-testid="signin-email-input"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  data-testid="signin-password-input"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                data-testid="signin-submit-btn"
                className="w-full rounded-xl bg-slate-900 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="mt-5 space-y-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-extrabold text-[#FF4B4B]">
                  <KeyRound className="h-3 w-3" />
                  <span>SINGLE-USE INVITATION ADMISSION POLICY</span>
                </div>
                <h1 className="mt-2 text-xl font-black text-slate-900">
                  Redeem Invitation Code
                </h1>
                <p className="mt-1 text-xs text-slate-500">
                  Public sign-up is disabled. Enter a valid single-use GAUTH-XXXX-XXXX invitation code issued for your email.
                </p>
              </div>

              {regError && (
                <div
                  className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700"
                  data-testid="auth-register-error"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              {regSuccess && (
                <div
                  className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800"
                  data-testid="auth-register-success"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{regSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Invitation Code or Token
                </label>
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="GAUTH-XXXX-XXXX"
                  data-testid="register-invite-code-input"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs font-bold text-slate-900 focus:border-[#FF4B4B] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Invited Email Address
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  data-testid="register-email-input"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#FF4B4B] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Full Name
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Alex Rivera"
                  data-testid="register-name-input"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#FF4B4B] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Password (8–128 characters, scrypt hashed)
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 8 characters..."
                  data-testid="register-password-input"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#FF4B4B] focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                data-testid="register-submit-btn"
                className="w-full rounded-xl bg-[#FF4B4B] py-3 text-xs font-extrabold text-white shadow-sm hover:bg-rose-600 disabled:opacity-50"
              >
                {loading
                  ? 'Verifying Invitation & Creating Account...'
                  : 'Redeem Invitation & Register'}
              </button>
            </form>
          )}
        </div>

        {/* Right 5 Columns: Quick Persona Switcher & Security Architecture Info */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Pre-Seeded Accounts for Testing
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Click any persona below to auto-fill credentials:
            </p>
            <div className="mt-3 space-y-2">
              {[
                {
                  label: 'Joshuah Powlowski (.cred Student)',
                  email: 'joshuah@gauthmath.com',
                  pass: 'GauthPassword123!',
                  role: 'STUDENT',
                },
                {
                  label: 'Gauth Platform Administrator',
                  email: 'admin@gauthmath.com',
                  pass: 'AdminPassword123!',
                  role: 'ADMIN',
                },
                {
                  label: 'Dr. Evelyn Vance (Verified Tutor)',
                  email: 'tutor@gauthmath.com',
                  pass: 'TutorPassword123!',
                  role: 'TUTOR',
                },
              ].map((acc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setTab('signin');
                    setLoginEmail(acc.email);
                    setLoginPassword(acc.pass);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-xs hover:border-slate-400"
                >
                  <div>
                    <div className="font-bold text-slate-900">{acc.label}</div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {acc.email}
                    </div>
                  </div>
                  <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              CLI-Only Admin Bootstrap Invariant
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Root administrator accounts can never be created via an HTTP API endpoint. Provisioning requires host terminal access:
            </p>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-emerald-300">
              npm run bootstrap:admin -- --email admin@gauthmath.com --password-stdin
            </pre>
            <Link
              href="/admin"
              className="mt-3 inline-block text-xs font-bold text-[#FF4B4B] hover:underline"
            >
              Open Admin Governance & Audit Logs →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

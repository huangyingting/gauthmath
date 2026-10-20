'use client';

import React, { useState, useEffect, use } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export default function InviteRedemptionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [inviteInfo, setInviteInfo] = useState<{
    code: string;
    role: string;
    status: string;
    maskedEmail: string | null;
    email?: string;
  } | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/auth/register?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.invitation) {
          setInviteInfo(data.invitation);
          if (data.invitation.email) {
            setEmail(data.invitation.email);
          }
        }
      })
      .catch(() => {});
  }, [token]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationCode: token,
          email,
          name,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Invitation redemption failed.');
      } else {
        setSuccess(`Welcome ${data.user.name}! Redirecting...`);
        await signIn('credentials', {
          redirect: false,
          email,
          password,
        });
        router.push('/');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="mx-auto max-w-lg px-4 py-12"
      data-testid="invite-redemption-page"
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-extrabold text-[#FF4B4B]">
          <KeyRound className="h-3.5 w-3.5" />
          <span>INVITATION REDEMPTION · {token}</span>
        </div>

        <h1 className="mt-3 text-2xl font-black text-slate-900">
          Accept Your Gauth AI Invitation
        </h1>

        {inviteInfo && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
            <div>
              Status:{' '}
              <strong className="uppercase text-slate-900">
                {inviteInfo.status}
              </strong>
            </div>
            <div className="mt-1">
              Assigned Role: <strong>{inviteInfo.role}</strong> · Target:{' '}
              <span className="font-mono">{inviteInfo.maskedEmail || 'N/A'}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleRedeem} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700">
              Invited Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">
              Create Password (min 8 chars)
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#FF4B4B] py-3 text-xs font-extrabold text-white hover:bg-rose-600 disabled:opacity-50"
          >
            {submitting ? 'Redeeming...' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
}

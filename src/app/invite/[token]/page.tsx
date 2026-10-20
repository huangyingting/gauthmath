'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import type { LocalizedMessage } from '@/lib/i18n';
import React, { useState, useEffect, use } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export default function InviteRedemptionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { t } = useI18n();
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
  const [success, setSuccess] = useState<LocalizedMessage | null>(null);
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
        setSuccess({ key: 'Welcome {name}! Redirecting...', values: { name: data.user.name } });
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
      className="mx-auto max-w-lg px-5 py-8 sm:py-10"
      data-testid="invite-redemption-page"
    >
      <div className="paper-panel p-6">
        <div className="eyebrow flex flex-wrap items-center gap-2 text-atelier-vermilion">
          <KeyRound className="h-3.5 w-3.5" />
          <span>{t("Your invitation / ")}{token}</span>
        </div>

        <h1 className="mt-6 text-3xl font-semibold text-atelier-ink">{t("Make yourself at home.")}</h1>

        {inviteInfo && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
            <div>{t("Status:")}{' '}
              <strong className="uppercase text-slate-900">
                {t(inviteInfo.status)}
              </strong>
            </div>
            <div className="mt-1">{t("Assigned Role: ")}<strong>{t(inviteInfo.role)}</strong>{t(" · Target:")}{' '}
              <span className="font-mono">{inviteInfo.maskedEmail || 'N/A'}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{t(error)}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{t(success.key, success.values)}</span>
          </div>
        )}

        <form onSubmit={handleRedeem} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700">{t("Invited Email")}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="lumina-input mt-2 w-full px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">{t("Display Name")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("Your Name")}
              className="lumina-input mt-2 w-full px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">{t("Create Password (min 8 chars)")}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="lumina-input mt-2 w-full px-4 py-3 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="primary-button w-full"
          >
            {submitting ? t('Redeeming...') : t('Complete Registration')}
          </button>
        </form>
      </div>
    </div>
  );
}

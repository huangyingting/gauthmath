'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import type { LocalizedMessage } from '@/lib/i18n';
import React, { useState, useEffect } from 'react';
import { Crown, Check, Zap, ShieldCheck, Sparkles } from 'lucide-react';

export default function GauthPlusPage() {
  const { t } = useI18n();
  const [selectedCycle, setSelectedCycle] = useState<'yearly' | 'quarterly' | 'monthly'>('yearly');
  const [subscription, setSubscription] = useState<{
    planTier: string;
    billingCycle: string;
    freeQueriesRemaining: number;
    aiProRemaining: number;
    courseCreditsRemaining: number;
  } | null>(null);
  const [activating, setActivating] = useState(false);
  const [banner, setBanner] = useState<LocalizedMessage | null>(null);

  useEffect(() => {
    fetch('/api/subscription')
      .then((r) => r.json())
      .then((data) => {
        if (data?.subscription) {
          setSubscription(data.subscription);
        }
      })
      .catch(() => {});
  }, []);

  const handleUpdateTier = async (planTier: 'PLUS' | 'FREE') => {
    setActivating(true);
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier, billingCycle: selectedCycle }),
      });
      const data = await res.json();
      if (data.ok) {
        setSubscription(data.subscription);
        setBanner({
          key: planTier === 'PLUS'
            ? 'Gauth PLUS ({cycle}) is now active! Unlimited solutions unlocked.'
            : 'Switched back to Gauth FREE tier.',
          values: { cycle: selectedCycle.toUpperCase() },
        });
      }
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="page-container" data-testid="plus-page">
      <div>
        <div className="page-heading">
        <div className="eyebrow flex items-center gap-2 text-atelier-vermilion">
          <Crown className="h-4 w-4" />
          <span>{t("Gauth Plus / A little more possibility")}</span>
        </div>
        <h1>{t("More room for your curiosity.")}</h1>
        <p className="mt-4 text-atelier-muted">{t("More questions, deeper explanations, and more ways to work through what's on your mind.")}</p>
        </div>

        {subscription && (
          <div className="grid grid-cols-2 gap-6 border-y border-atelier-border py-6 sm:grid-cols-4">
            <div>
              <div className="text-[11px] text-slate-400">{t("Current Plan")}</div>
              <div
                className="mt-2 text-sm font-semibold"
                data-testid="current-plan-tier"
              >
                {t(subscription.planTier)} ({t(subscription.billingCycle)})
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">{t("Homework Quota")}</div>
              <div className="mt-2 text-sm font-semibold">
                {t('{count} remaining', { count: subscription.freeQueriesRemaining })}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">{t("AI Pro Super Tutor")}</div>
              <div className="mt-2 text-sm font-semibold">
                {t('{count} / mo', { count: subscription.aiProRemaining })}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">{t("Academy Credits")}</div>
              <div className="mt-2 text-sm font-semibold">
                {t('{count} credits', { count: subscription.courseCreditsRemaining })}</div>
            </div>
          </div>
        )}
      </div>

      {banner && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          {t(banner.key, { ...banner.values, cycle: t(String(banner.values?.cycle || '')) })}
        </div>
      )}

      {/* 3 Pricing Cards */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            id: 'yearly' as const,
            title: 'Annual Gauth PLUS',
            badge: 'BEST VALUE · SAVE 42%',
            price: '$6.99',
            sub: 'Billed $83.88 / year',
          },
          {
            id: 'quarterly' as const,
            title: 'Quarterly Gauth PLUS',
            badge: 'SAVE 19%',
            price: '$9.67',
            sub: 'Billed $28.99 / 3 months',
          },
          {
            id: 'monthly' as const,
            title: 'Monthly Gauth PLUS',
            badge: 'FLEXIBLE',
            price: '$11.99',
            sub: 'Billed $11.99 / month',
          },
        ].map((p) => {
          const active = selectedCycle === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedCycle(p.id)}
              aria-pressed={active}
              className={`rounded-xl border p-5 text-left transition ${
                active
                  ? 'border-atelier-vermilion bg-atelier-lilac'
                  : 'border-atelier-border bg-atelier-surface hover:bg-atelier-subtle'
              }`}
            >
              <span className="inline-block rounded bg-atelier-citron px-2.5 py-1 text-[10px] font-medium text-atelier-ink">
                {t(p.badge)}
              </span>
              <h3 className="mt-3 text-base font-extrabold text-slate-900">
                {t(p.title)}
              </h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">
                  {p.price}
                </span>
                <span className="text-xs text-slate-500">{t("/ month")}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{t(p.sub)}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-5 border-t border-atelier-border pt-6">
        <div className="space-y-2">
          {[
            'Unlimited step-by-step solutions across all 12 subjects',
            '20 Gauth AI Pro deep-reasoning sessions per month',
            '24/7 Live Human Verified Expert Tutor whiteboard help',
          ].map((feat, i) => (
            <div key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>{t(feat)}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleUpdateTier('PLUS')}
            disabled={activating}
            data-testid="upgrade-plus-page-btn"
            className="primary-button"
          >
            <Zap className="h-4 w-4" />
            <span>{activating ? t('Updating...') : t('Activate Gauth PLUS Now')}</span>
          </button>

          {subscription?.planTier === 'PLUS' && (
            <button
              type="button"
              onClick={() => handleUpdateTier('FREE')}
              className="secondary-button"
            >{t("Switch to Free Tier")}</button>
          )}
        </div>
      </div>
    </div>
  );
}

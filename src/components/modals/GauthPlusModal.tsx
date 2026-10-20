'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import type { LocalizedMessage } from '@/lib/i18n';
import React, { useState } from 'react';
import { X, Crown, Check, Sparkles, ShieldCheck, Zap } from 'lucide-react';

interface GauthPlusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: string;
  onUpgradeSuccess?: (newTier: string, cycle: string) => void;
}

const PRICING_PLANS = [
  {
    id: 'yearly',
    name: 'Annual Plan',
    badge: 'MOST POPULAR · SAVE 42%',
    monthlyPrice: '$6.99',
    billedNote: 'Billed $83.88 / year',
    perDay: '$0.23 / day',
  },
  {
    id: 'quarterly',
    name: 'Quarterly Plan',
    badge: 'SAVE 19%',
    monthlyPrice: '$9.67',
    billedNote: 'Billed $28.99 / 3 months',
    perDay: '$0.32 / day',
  },
  {
    id: 'monthly',
    name: 'Monthly Plan',
    badge: 'FLEXIBLE',
    monthlyPrice: '$11.99',
    billedNote: 'Billed $11.99 / month',
    perDay: '$0.40 / day',
  },
];

export function GauthPlusModal({
  isOpen,
  onClose,
  currentTier = 'FREE',
  onUpgradeSuccess,
}: GauthPlusModalProps) {
  const { t } = useI18n();
  const [selectedCycle, setSelectedCycle] = useState('yearly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upgradedMessage, setUpgradedMessage] = useState<LocalizedMessage | null>(null);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planTier: 'PLUS',
          billingCycle: selectedCycle,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setUpgradedMessage({
          key: 'Welcome to Gauth PLUS ({cycle})! Unlimited step-by-step solutions and 20 AI Pro Super Tutor credits unlocked.',
          values: { cycle: selectedCycle.toUpperCase() },
        });
        onUpgradeSuccess?.('PLUS', selectedCycle);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      data-testid="gauth-plus-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plus-modal-title"
    >
      <div className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-atelier-surface shadow-2xl">
        {/* Hero Banner */}
        <div className="relative border-b border-atelier-border px-7 py-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 rounded-md p-2 text-atelier-muted hover:bg-atelier-subtle"
            aria-label={t("Close Gauth PLUS Modal")}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-atelier-citron text-atelier-ink">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 pr-8">
                <span id="plus-modal-title" className="text-2xl font-semibold tracking-tight">{t("A little more possibility.")}</span>
              </div>
              <p className="mt-2 text-sm text-atelier-muted">{t("Gauth Plus / More room for your curiosity.")}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {upgradedMessage ? (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              {t(upgradedMessage.key, { ...upgradedMessage.values, cycle: t(String(upgradedMessage.values?.cycle || '')) })}
            </div>
          ) : null}

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PRICING_PLANS.map((plan) => {
              const active = selectedCycle === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedCycle(plan.id)}
                  data-testid={`plan-card-${plan.id}`}
                  aria-pressed={active}
                  className={`relative flex flex-col justify-between rounded-lg border p-5 text-left transition ${
                    active
                      ? 'border-atelier-vermilion bg-atelier-lilac'
                      : 'border-atelier-border hover:bg-atelier-subtle'
                  }`}
                >
                  <div>
                    <span
                      className={`inline-block rounded px-2 py-1 text-[10px] font-medium ${
                        active
                          ? 'bg-atelier-citron text-atelier-ink'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t(plan.badge)}
                    </span>
                    <h4 className="mt-2 text-sm font-bold text-slate-900">
                      {t(plan.name)}
                    </h4>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-slate-900">
                        {plan.monthlyPrice}
                      </span>
                      <span className="text-xs font-medium text-slate-500">{t("/ month")}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {t(plan.billedNote)} ({t(plan.perDay)})
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Benefits Comparison */}
          <div className="mt-6 grid grid-cols-1 gap-4 border-y border-atelier-border py-6 sm:grid-cols-2">
            {[
              'Unlimited step-by-step homework solutions & study bank access',
              '20 Gauth AI Pro Super Tutor deep-reasoning sessions / month',
              '24/7 Live Human Verified Expert Tutor escalation',
              'Unlimited Gauth Academy 3D visual courses & Writing Helper',
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-2.5 w-2.5" />
                </div>
                <span>{t(item)}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>{t("Cancel anytime · Instant activation · Current tier: ")}{t(currentTier)}</span>
            </div>

            <button
              type="button"
              onClick={handleSubscribe}
              disabled={isSubmitting}
              data-testid="activate-gauth-plus-btn"
              className="primary-button w-full sm:w-auto"
            >
              <Zap className="h-4 w-4" />
              {isSubmitting
                ? t('Activating Gauth PLUS...')
                : t('Upgrade to Gauth PLUS ({cycle})', { cycle: t(selectedCycle.toUpperCase()) })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

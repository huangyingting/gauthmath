'use client';

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
  const [selectedCycle, setSelectedCycle] = useState('yearly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upgradedMessage, setUpgradedMessage] = useState<string | null>(null);

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
        setUpgradedMessage(
          `Welcome to Gauth PLUS (${selectedCycle.toUpperCase()})! Unlimited step-by-step solutions and 20 AI Pro Super Tutor credits unlocked.`
        );
        onUpgradeSuccess?.('PLUS', selectedCycle);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      data-testid="gauth-plus-modal"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl">
        {/* Hero Banner */}
        <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 px-6 py-6 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 rounded-xl bg-white/10 p-1.5 text-white/80 hover:bg-white/20 hover:text-white"
            aria-label="Close Gauth PLUS Modal"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 shadow-lg">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-amber-300">
                  GAUTH PLUS
                </span>
                <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-200">
                  UNLIMITED AI PRO + VERIFIED TUTORS
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Join 300M+ global learners achieving 99.8% homework accuracy across 12 STEM & Humanities subjects
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {upgradedMessage ? (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              {upgradedMessage}
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
                  className={`relative flex flex-col justify-between rounded-2xl border-2 p-4 text-left transition ${
                    active
                      ? 'border-amber-500 bg-amber-50/50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                        active
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {plan.badge}
                    </span>
                    <h4 className="mt-2 text-sm font-bold text-slate-900">
                      {plan.name}
                    </h4>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-slate-900">
                        {plan.monthlyPrice}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        / month
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {plan.billedNote} ({plan.perDay})
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Benefits Comparison */}
          <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-2">
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
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Cancel anytime · Instant activation · Current tier: {currentTier}</span>
            </div>

            <button
              type="button"
              onClick={handleSubscribe}
              disabled={isSubmitting}
              data-testid="activate-gauth-plus-btn"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-md transition hover:brightness-105 sm:w-auto"
            >
              <Zap className="h-4 w-4" />
              {isSubmitting
                ? 'Activating Gauth PLUS...'
                : `Upgrade to Gauth PLUS (${selectedCycle.toUpperCase()})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

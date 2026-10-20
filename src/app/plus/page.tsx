'use client';

import React, { useState, useEffect } from 'react';
import { Crown, Check, Zap, ShieldCheck, Sparkles } from 'lucide-react';

export default function GauthPlusPage() {
  const [selectedCycle, setSelectedCycle] = useState<'yearly' | 'quarterly' | 'monthly'>('yearly');
  const [subscription, setSubscription] = useState<{
    planTier: string;
    billingCycle: string;
    freeQueriesRemaining: number;
    aiProRemaining: number;
    courseCreditsRemaining: number;
  } | null>(null);
  const [activating, setActivating] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

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
        setBanner(
          planTier === 'PLUS'
            ? `Gauth PLUS (${selectedCycle.toUpperCase()}) is now active! Unlimited solutions unlocked.`
            : 'Switched back to Gauth FREE tier.'
        );
      }
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8" data-testid="plus-page">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-3.5 py-1 text-xs font-extrabold text-amber-300">
          <Crown className="h-4 w-4" />
          <span>GAUTH PLUS MEMBERSHIP · UNLIMITED STEM & HUMANITIES MASTERY</span>
        </div>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">
          Unlock Unlimited AI Pro Solutions & 24/7 Live Tutors
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Get instant access to Gauth AI Pro Super Tutor, 50,000+ verified human experts, and unlimited 3D visual courses.
        </p>

        {subscription && (
          <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-4">
            <div>
              <div className="text-[11px] text-slate-400">Current Plan</div>
              <div
                className="text-base font-black text-amber-300"
                data-testid="current-plan-tier"
              >
                {subscription.planTier} ({subscription.billingCycle})
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Homework Quota</div>
              <div className="text-base font-black text-white">
                {subscription.freeQueriesRemaining} remaining
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">AI Pro Super Tutor</div>
              <div className="text-base font-black text-white">
                {subscription.aiProRemaining} / mo
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Academy Credits</div>
              <div className="text-base font-black text-white">
                {subscription.courseCreditsRemaining} credits
              </div>
            </div>
          </div>
        )}
      </div>

      {banner && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          {banner}
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
              className={`rounded-3xl border-2 p-6 text-left transition ${
                active
                  ? 'border-amber-500 bg-amber-50/40 shadow-lg'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span className="inline-block rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-950">
                {p.badge}
              </span>
              <h3 className="mt-3 text-base font-extrabold text-slate-900">
                {p.title}
              </h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">
                  {p.price}
                </span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{p.sub}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6">
        <div className="space-y-2">
          {[
            'Unlimited step-by-step solutions across all 12 subjects',
            '20 Gauth AI Pro deep-reasoning sessions per month',
            '24/7 Live Human Verified Expert Tutor whiteboard help',
          ].map((feat, i) => (
            <div key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>{feat}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleUpdateTier('PLUS')}
            disabled={activating}
            data-testid="upgrade-plus-page-btn"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-md hover:brightness-105"
          >
            <Zap className="h-4 w-4" />
            <span>{activating ? 'Updating...' : 'Activate Gauth PLUS Now'}</span>
          </button>

          {subscription?.planTier === 'PLUS' && (
            <button
              type="button"
              onClick={() => handleUpdateTier('FREE')}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Switch to Free Tier
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

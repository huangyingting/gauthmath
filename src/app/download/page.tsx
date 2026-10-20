'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import React from 'react';
import Link from 'next/link';
import { Smartphone, CheckCircle2, Camera, Zap } from 'lucide-react';

export default function DownloadAppPage() {
  const { t } = useI18n();
  return (
    <div className="page-container" data-testid="download-page">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
        <div>
          <div className="eyebrow flex items-center gap-2 text-atelier-vermilion">
            <Smartphone className="h-3.5 w-3.5" />
            <span>{t("A little clarity / Wherever you are")}</span>
          </div>
          <h1 className="mt-6 text-h1">{t("Good questions don't stay at a desk.")}</h1>
          <p className="mt-6 text-base leading-8 text-atelier-muted">{t("Take a photo of the problem in front of you, explore a graph, or pick up a lesson. Your learning space works in your mobile browser, too.")}</p>

          <div className="mt-7 space-y-4 text-sm text-atelier-muted">
            {[
              'Scan a question from a photo',
              'Work through equations and interactive graphs',
              'Explore short lessons at your own pace',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>{t(item)}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="primary-button"
            >
              <Camera className="h-4 w-4" />
              <span>{t("Start with a question")}</span>
            </Link>
            <Link
              href="/calculator"
              className="secondary-button"
            >
              <Zap className="h-4 w-4" />
              <span>{t("Open Web Calculator")}</span>
            </Link>
          </div>
        </div>

        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl bg-atelier-lilac p-6 text-center">
          <div className="flex h-40 w-40 items-center justify-center rounded-full bg-atelier-citron text-atelier-ink">
            <Smartphone className="h-16 w-16" strokeWidth={1} aria-hidden="true" />
          </div>
          <h2 className="mt-8 text-2xl font-medium">{t("A pocket-sized thinking space.")}</h2>
          <p className="mt-3 text-sm text-atelier-muted">{t("Open in your browser. No installation needed.")}</p>
        </div>
      </div>
    </div>
  );
}

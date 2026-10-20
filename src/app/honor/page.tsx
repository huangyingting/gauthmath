'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import React from 'react';
import { ShieldAlert, CheckCircle2, BookOpen } from 'lucide-react';

export default function HonorCodePage() {
  const { t } = useI18n();
  return (
    <div className="page-container" data-testid="honor-page">
      <div className="max-w-3xl">
        <div className="page-heading">
        <div className="eyebrow flex items-center gap-2 text-atelier-vermilion">
          <ShieldAlert className="h-4 w-4" />
          <span>{t("The honor code / Keep the thinking yours")}</span>
        </div>
        <h1>{t("Curiosity, with integrity.")}</h1>
        <p className="mt-4 text-atelier-muted">{t("Gauth is designed to teach underlying mathematical and scientific reasoning through step-by-step explanations, interactive graphs, and follow-up tutoring—not to bypass academic assessments.")}</p>
        </div>

        <div className="mt-6 divide-y divide-atelier-border border-t border-atelier-border">
          {[
            'Use Gauth step-by-step derivations to check your own homework and understand where your reasoning diverged.',
            'Do not submit live exam, quiz, or closed-book assessment questions.',
            'Use Gauth Writing Helper annotations and outlines as structural study guides to improve your own original prose.',
          ].map((rule, i) => (
            <div
              key={i}
              className="flex items-start gap-4 py-5 text-base leading-8 text-atelier-muted"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{t(rule)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

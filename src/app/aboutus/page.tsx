'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import React from 'react';
import { Globe, Users, Award, ShieldCheck } from 'lucide-react';

export default function AboutUsPage() {
  const { t } = useI18n();
  return (
    <div className="page-container" data-testid="aboutus-page">
      <div>
        <div className="page-heading">
        <span className="eyebrow text-atelier-vermilion">{t("About Gauth / Made for the moment it clicks")}</span>
        <h1>{t("Understanding changes everything.")}</h1>
        <p className="mt-4 text-atelier-muted">{t("We bring symbolic math, clear explanations, and interactive learning into one thoughtful space. Not to skip the thinking, but to help you find your way through it.")}</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 border-t border-atelier-border pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, stat: 'Your pace.', label: 'A space to ask, revisit, and explore.' },
            { icon: Award, stat: 'The why.', label: 'Step-by-step reasoning, not just a result.' },
            { icon: Globe, stat: 'New paths.', label: 'Twelve subjects. Plenty of connections.' },
            { icon: ShieldCheck, stat: 'Your work.', label: 'Tools for understanding and original thinking.' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="py-3"
              >
                <Icon className="h-6 w-6 text-atelier-vermilion" />
                <div className="mt-6 text-2xl font-medium text-atelier-ink">
                  {t(item.stat)}
                </div>
                <div className="mt-3 text-sm leading-7 text-atelier-muted">{t(item.label)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

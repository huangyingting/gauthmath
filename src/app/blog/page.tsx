'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import React from 'react';
import Link from 'next/link';
import { BookOpen, ArrowRight, Sparkles } from 'lucide-react';

const BLOG_ARTICLES = [
  {
    slug: 'how-neuro-symbolic-ai-solves-calculus',
    category: 'AI & STEM Pedagogy',
    date: 'October 2026',
    title: 'Why Neuro-Symbolic AI Outperforms Pure LLMs on AP Calculus & Quadratic Proofs',
    excerpt:
      'Pure language models often hallucinate arithmetic sign flips. Discover how Gauth combines a deterministic Computer Algebra System (CAS) with GitHub Copilot SDK and Azure OpenAI for 99.8% verified accuracy.',
    link: '/calculator',
  },
  {
    slug: '8-handle-ocr-math-scanner-guide',
    category: 'Study Hacks',
    date: 'October 2026',
    title: 'Mastering Multi-Part Worksheets: Why Cropping One Question at a Time Boosts OCR Precision',
    excerpt:
      'Learn how our 8-handle interactive bounding box isolates handwritten equations, matrices, and chemical reactions from busy textbook pages.',
    link: '/',
  },
  {
    slug: 'visual-learning-atlas-and-academy',
    category: 'Cognitive Science',
    date: 'September 2026',
    title: 'From Static Formulas to 3D Intuition: Inside Gauth Atlas & 15-Minute Academy Courses',
    excerpt:
      'Visualizing secant lines approaching a tangent or quantum wavefunctions tunneling through barriers builds lasting exam recall 3× faster than rote memorization.',
    link: '/atlas',
  },
];

export default function BlogPage() {
  const { t } = useI18n();
  return (
    <div className="page-container" data-testid="blog-page">
      <div className="page-heading">
        <span className="eyebrow inline-flex items-center gap-2 text-atelier-vermilion">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{t("The journal / Notes on learning")}</span>
        </span>
        <h1>{t("Stay a little curious.")}</h1>
        <p className="mt-4 text-atelier-muted">{t("Fresh perspectives on how we learn, work through problems, and make ideas click.")}</p>
      </div>

      <div className="divide-y divide-atelier-border border-t border-atelier-border">
        {BLOG_ARTICLES.map((art) => (
          <div
            key={art.slug}
            className="grid grid-cols-1 gap-5 py-6 md:grid-cols-[1fr_auto] md:items-center"
          >
            <div>
              <div className="flex max-w-xl items-center justify-between text-xs text-atelier-muted">
                <span className="text-atelier-vermilion">{art.category}</span>
                <span>{art.date}</span>
              </div>
              <h2 className="mt-4 max-w-2xl text-2xl font-medium text-atelier-ink">
                {art.title}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-atelier-muted">
                {art.excerpt}
              </p>
            </div>
            <Link
              href={art.link}
              className="inline-flex items-center gap-2 text-sm font-medium text-atelier-vermilion hover:underline"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>{t("Try Interactive Feature")}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8" data-testid="blog-page">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-extrabold text-[#FF4B4B]">
          <Sparkles className="h-3.5 w-3.5" />
          <span>GAUTH EDITORIAL & STUDY TIPS BLOG</span>
        </span>
        <h1 className="mt-3 text-3xl font-black text-slate-900">
          Insights on AI Learning, Exam Prep & STEM Mastery
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Research articles, AP/SAT study guides, and deep dives from Gauth’s AI engineers and Ph.D. tutors.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
        {BLOG_ARTICLES.map((art) => (
          <div
            key={art.slug}
            className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span className="text-[#FF4B4B]">{art.category}</span>
                <span>{art.date}</span>
              </div>
              <h2 className="mt-3 text-base font-extrabold text-slate-900">
                {art.title}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {art.excerpt}
              </p>
            </div>
            <Link
              href={art.link}
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#FF4B4B] hover:underline"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Try Interactive Feature</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

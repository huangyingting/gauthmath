'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, ArrowRight, ShieldCheck, Layers } from 'lucide-react';
import { TAVI_SUBJECTS } from '@/components/layout/AppShell';
import type { QuestionSummary } from '@/lib/page-data';

const SUBJECT_CURRICULUM_MAP: Record<string, string[]> = {
  Math: ['Algebra & Quadratics', 'Calculus (Derivatives & Integrals)', 'Trigonometry & Unit Circle', 'Linear Algebra & Matrices'],
  Physics: ['Classical Mechanics & Kinematics', 'Work, Energy & Momentum', 'Electromagnetism & Circuits', 'Quantum & Modern Physics'],
  Chemistry: ['Stoichiometry & The Mole', 'Acid-Base Equilibria & pH', 'Ideal Gas Law & Thermodynamics', 'Organic Functional Groups'],
  Biology: ['Cellular Respiration & ATP', 'Mitosis, Meiosis & Ploidy', 'CRISPR & Molecular Genetics', 'Evolution & Ecology'],
  Writing: ['Argumentative Essays', 'AP Research Papers', 'College Application Statements', 'Grammar & Rhetorical Polish'],
  Literature: ['Classical Tragedy & Drama', 'Modernist Poetry Analysis', 'Shakespearean Motifs', 'Narrative Rhetoric'],
  Business: ['Net Present Value (NPV) & IRR', 'Corporate Strategy & SWOT', 'Supply Chain Operations', 'Marketing Analytics'],
  'Computer Science': ['Asymptotic Complexity & Master Theorem', 'Graph Algorithms & DP', 'Relational Databases & SQL', 'Operating Systems'],
  Statistics: ['Descriptive Stats (Mean, Median, σ)', 'Gaussian Normal Distributions', 'Hypothesis Testing & p-Values', 'Bayesian Probability'],
  Economics: ['Microeconomic Supply & Demand', 'Macroeconomic GDP & Monetary Policy', 'Game Theory & Nash Equilibrium', 'International Trade'],
  'Social Science': ['Demographic History', 'Political Philosophy', 'Human Geography', 'Cognitive Psychology'],
  Accounting: ['Balance Sheet & Double-Entry', 'Income Statement & Cash Flows', 'Cost Volume Profit (CVP)', 'Depreciation Methods'],
};

export default function StudyResourcesPage({ initialQuestions }: { initialQuestions: QuestionSummary[] }) {
  const { t } = useI18n();
  const [selectedSubject, setSelectedSubject] = useState<string>('Math');
  const [questions, setQuestions] = useState(initialQuestions);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (selectedSubject === 'Math') { setQuestions(initialQuestions); return; }
    const controller = new AbortController();
    fetch(`/api/questions?subject=${encodeURIComponent(selectedSubject)}`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error('The study bank could not be loaded. Please try again.'); return r.json(); })
      .then((data) => {
        if (Array.isArray(data?.questions)) {
          setQuestions(data.questions);
        }
      })
      .catch(() => { if (!controller.signal.aborted) setError('The study bank could not be loaded. Please try again.'); });
    return () => controller.abort();
  }, [selectedSubject, initialQuestions]);

  const subTopics = SUBJECT_CURRICULUM_MAP[selectedSubject] || [];

  return (
    <div
      className="page-container"
      data-testid="study-resources-page"
    >
      <div className="page-heading">
        <div className="eyebrow flex items-center gap-2 text-atelier-vermilion">
          <BookOpen className="h-3.5 w-3.5" />
          <span>{t("The subject library / Find your starting point")}</span>
        </div>
        <h1>{t("There's a way into every subject.")}</h1>
        <p className="mt-4 text-atelier-muted">{t("Choose a field, follow a topic, and build your understanding one worked problem at a time.")}</p>

        {/* 12 Subjects Grid */}
      </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {TAVI_SUBJECTS.map((subj) => {
            const active = selectedSubject === subj;
            return (
              <button
                key={subj}
                type="button"
                onClick={() => setSelectedSubject(subj)}
                data-testid={`resource-subject-btn-${subj.toLowerCase().replace(/\s+/g, '-')}`}
                aria-pressed={active}
                className={`rounded-md px-5 py-4 text-left transition ${
                  active
                    ? 'bg-atelier-obsidian text-atelier-citron'
                    : 'text-atelier-muted hover:bg-atelier-subtle'
                }`}
              >
                <div className="text-sm font-medium">{t(subj)}</div>
              </button>
            );
          })}
        </div>

      {/* Curriculum Sub-Topics for Selected Subject */}
      <div className="mt-8 grid grid-cols-1 gap-5 border-t border-atelier-border pt-6 sm:grid-cols-2 lg:grid-cols-4">
        {subTopics.map((topic, idx) => (
          <div
            key={idx}
            className="py-2"
          >
            <div className="eyebrow flex items-center gap-2 text-atelier-vermilion">
              <Layers className="h-3.5 w-3.5" />
              <span>{t('Module {number}', { number: String(idx + 1).padStart(2, '0') })}</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-atelier-ink">
              {topic}
            </h3>
            <p className="mt-3 text-sm text-atelier-muted">{t("Formulas, worked examples, and a fresh perspective.")}</p>
          </div>
        ))}
      </div>

      {/* Verified Questions in Selected Subject */}
      <div className="mt-8">
        {error && <p className="mb-3 text-sm text-rose-800" role="alert">{t(error)}</p>}
        <h2 className="text-2xl font-medium text-atelier-ink">{t('A little practice in {subject}.', { subject: t(selectedSubject).toLowerCase() })}
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {questions.map((q) => (
            <Link
              key={q.id}
              href={`/solution/${q.slug || q.id}`}
              className="lumina-card group flex flex-col justify-between p-6 transition-colors hover:border-atelier-vermilion"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-atelier-vermilion">
                    {t(q.subject)}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <ShieldCheck className="h-3.5 w-3.5" />{t("Verified")}</span>
                </div>
                <h3 className="mt-4 font-mono text-sm font-medium text-atelier-ink">
                  {q.promptText}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{q.topic}</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="truncate font-mono font-semibold text-slate-700">{t("Ans: ")}{q.answerSummary}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-atelier-muted group-hover:text-atelier-vermilion" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

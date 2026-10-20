'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, ArrowRight, ShieldCheck, Layers } from 'lucide-react';
import { GAUTH_SUBJECTS } from '@/components/layout/AppShell';

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

export default function StudyResourcesPage() {
  const [selectedSubject, setSelectedSubject] = useState<string>('Math');
  const [questions, setQuestions] = useState<
    Array<{
      id: string;
      slug: string;
      subject: string;
      topic: string;
      promptText: string;
      answerSummary: string;
    }>
  >([]);

  useEffect(() => {
    fetch(`/api/questions?subject=${encodeURIComponent(selectedSubject)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.questions)) {
          setQuestions(data.questions);
        }
      })
      .catch(() => {});
  }, [selectedSubject]);

  const subTopics = SUBJECT_CURRICULUM_MAP[selectedSubject] || [];

  return (
    <div
      className="mx-auto max-w-6xl px-4 py-8 sm:px-8"
      data-testid="study-resources-page"
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-extrabold text-[#FF4B4B]">
          <BookOpen className="h-3.5 w-3.5" />
          <span>12-SUBJECT CURRICULUM DIRECTORY & VERIFIED Q&A BANK</span>
        </div>
        <h1 className="mt-3 text-2xl font-black text-slate-900 sm:text-4xl">
          Gauth Study Resources & Subject Hub
        </h1>
        <p className="mt-2 max-w-2xl text-xs text-slate-600 sm:text-sm">
          Select any of the 12 core academic disciplines below to explore structured sub-topics and verified step-by-step homework solutions.
        </p>

        {/* 12 Subjects Grid */}
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {GAUTH_SUBJECTS.map((subj) => {
            const active = selectedSubject === subj;
            return (
              <button
                key={subj}
                type="button"
                onClick={() => setSelectedSubject(subj)}
                data-testid={`resource-subject-btn-${subj.toLowerCase().replace(/\s+/g, '-')}`}
                className={`rounded-2xl border p-3 text-left transition ${
                  active
                    ? 'border-[#FF4B4B] bg-rose-50 text-[#FF4B4B] shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-white'
                }`}
              >
                <div className="text-xs font-extrabold">{subj}</div>
                <div className="mt-1 text-[10px] text-slate-500">
                  4 Core Modules
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Curriculum Sub-Topics for Selected Subject */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {subTopics.map((topic, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-[#FF4B4B]">
              <Layers className="h-3.5 w-3.5" />
              <span>Module 0{idx + 1}</span>
            </div>
            <h3 className="mt-1.5 text-sm font-extrabold text-slate-900">
              {topic}
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">
              Verified formulas, worked examples & AI Pro hints
            </p>
          </div>
        ))}
      </div>

      {/* Verified Questions in Selected Subject */}
      <div className="mt-8">
        <h2 className="text-lg font-black text-slate-900">
          Verified {selectedSubject} Homework Solutions ({questions.length})
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {questions.map((q) => (
            <Link
              key={q.id}
              href={`/solution/${q.slug || q.id}`}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-rose-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-[#FF4B4B]">
                    {q.subject}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified
                  </span>
                </div>
                <h3 className="mt-3 font-mono text-sm font-bold text-slate-900 group-hover:text-[#FF4B4B]">
                  {q.promptText}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{q.topic}</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="truncate font-mono font-semibold text-slate-700">
                  Ans: {q.answerSummary}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#FF4B4B]" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

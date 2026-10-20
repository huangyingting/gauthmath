'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Camera,
  Calculator,
  ArrowRight,
  CheckCircle2,
  Compass,
  GraduationCap,
  BookOpen,
  Flame,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { GAUTH_SUBJECTS } from '@/components/layout/AppShell';
import { MathKeyboardModal } from '@/components/modals/MathKeyboardModal';
import { ImageCropModal } from '@/components/modals/ImageCropModal';
import { FunctionGraphSvg } from '@/components/math/FunctionGraphSvg';
import type { FunctionGraphData } from '@/lib/math-engine/grapher';

const QUICK_SAMPLE_PROMPTS = [
  {
    label: 'Quadratic: x² - 5x + 6 = 0',
    prompt: 'Solve x^2 - 5x + 6 = 0',
    subject: 'Math',
  },
  {
    label: 'Derivative: d/dx (x³ - 6x² + 9x + 2)',
    prompt: 'derivative of x^3 - 6x^2 + 9x + 2',
    subject: 'Math',
  },
  {
    label: 'Definite Integral: ∫₀³ (x² + 4x) dx',
    prompt: 'integrate x^2 + 4x from 0 to 3',
    subject: 'Math',
  },
  {
    label: 'Physics: Kinetic Energy (m=4kg, v=15m/s)',
    prompt:
      'A 4 kg projectile is launched at velocity 15 m/s. Find its kinetic energy and explain Newton’s Second Law F = ma.',
    subject: 'Physics',
  },
  {
    label: 'Chemistry: pH of 0.001 M HCl',
    prompt:
      'Calculate the pH of a 0.001 M HCl strong acid solution at 25°C and state the Ideal Gas Law PV = nRT.',
    subject: 'Chemistry',
  },
  {
    label: 'Statistics: Mean, Median & σ',
    prompt: 'stats of 4, 8, 15, 16, 23, 42',
    subject: 'Statistics',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [selectedSubject, setSelectedSubject] = useState<string>('Math');
  const [prompt, setPrompt] = useState<string>('');
  const [mode, setMode] = useState<'STANDARD' | 'PRO'>('PRO');
  const [cropBadge, setCropBadge] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [instantSolution, setInstantSolution] = useState<{
    id: string;
    slug: string;
    subject: string;
    topic: string;
    promptText: string;
    answerSummary: string;
    providerUsed: string;
    steps: Array<{
      number: number;
      title: string;
      latex: string;
      explanation: string;
    }>;
    graphConfig: FunctionGraphData | null;
  } | null>(null);

  const [studyBank, setStudyBank] = useState<
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
    fetch('/api/questions')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.questions)) {
          setStudyBank(data.questions.slice(0, 6));
        }
      })
      .catch(() => {});
  }, []);

  const handleSolve = async (overridePrompt?: string, overrideSubject?: string) => {
    const query = (overridePrompt ?? prompt).trim();
    const subj = overrideSubject ?? selectedSubject;
    if (!query) {
      setErrorMsg('Please enter a math expression, homework question, or upload an image crop.');
      return;
    }

    setErrorMsg(null);
    setIsSolving(true);
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          subject: subj,
          mode,
          croppedImageData: cropBadge,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Failed to solve homework problem.');
        return;
      }
      setInstantSolution(data.question);
    } catch {
      setErrorMsg('Network error while solving question.');
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      {/* Hero Banner */}
      <div className="text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1 text-xs font-bold text-[#FF4B4B]">
          <Flame className="h-3.5 w-3.5" />
          <span>GAUTH AI HOMEWORK HELPER · NEURO-SYMBOLIC CAS + LIVE TUTORS</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
          Your Fast, Accurate{' '}
          <span className="bg-gradient-to-r from-[#FF4B4B] via-rose-500 to-orange-500 bg-clip-text text-transparent">
            AI Study Companion
          </span>
        </h1>
        <p className="mx-auto mt-2.5 max-w-2xl text-sm text-slate-600 sm:text-base">
          Snap a photo with 8-handle OCR cropping, type LaTeX with our scientific keyboard, or ask any STEM question for verified step-by-step solutions and interactive 2D graphs.
        </p>
      </div>

      {/* 12 Subject Selector Bar */}
      <div
        className="mt-6 flex flex-wrap items-center justify-center gap-1.5"
        data-testid="subject-pills-bar"
      >
        {GAUTH_SUBJECTS.map((subj) => {
          const active = selectedSubject === subj;
          return (
            <button
              key={subj}
              type="button"
              onClick={() => setSelectedSubject(subj)}
              data-testid={`subject-pill-${subj.toLowerCase().replace(/\s+/g, '-')}`}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                active
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {subj}
            </button>
          );
        })}
      </div>

      {/* Main Homework Composer Card */}
      <div
        className="mt-5 rounded-3xl border-2 border-slate-200/90 bg-white p-5 shadow-xl transition focus-within:border-[#FF4B4B]"
        data-testid="homework-composer-card"
      >
        {/* Top Mode Toggle: Standard vs Gauth AI Pro */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('STANDARD')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                mode === 'STANDARD'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Standard Fast Solver
            </button>
            <button
              type="button"
              onClick={() => setMode('PRO')}
              data-testid="toggle-ai-pro-btn"
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition ${
                mode === 'PRO'
                  ? 'bg-gradient-to-r from-[#FF4B4B] to-orange-500 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Gauth AI Pro (Deep Reasoning + CAS)
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Subject: <strong className="text-slate-700">{selectedSubject}</strong></span>
            <span>·</span>
            <span className="font-mono">{prompt.length} / 2000</span>
          </div>
        </div>

        {/* Cropped Image OCR Badge if present */}
        {cropBadge && (
          <div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>8-Handle Image OCR Active: {cropBadge}</span>
            </div>
            <button
              type="button"
              onClick={() => setCropBadge(null)}
              className="text-emerald-700 underline hover:text-emerald-900"
            >
              Clear
            </button>
          </div>
        )}

        {/* Textarea Input */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
          placeholder={`Type any ${selectedSubject} problem, equation (e.g. Solve x^2 - 5x + 6 = 0), derivative, or paste an essay prompt...`}
          rows={3}
          data-testid="homework-prompt-input"
          className="w-full resize-none border-0 bg-transparent text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSolve();
            }
          }}
        />

        {errorMsg && (
          <div className="mt-2 rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-600">
            {errorMsg}
          </div>
        )}

        {/* Bottom Action Toolbar: Upload/Crop, Math Keyboard, Solve CTA */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCropModalOpen(true)}
              data-testid="open-crop-modal-btn"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-[#FF4B4B]"
            >
              <Camera className="h-4 w-4 text-[#FF4B4B]" />
              <span>Upload Image / 8-Handle Crop</span>
            </button>

            <button
              type="button"
              onClick={() => setKeyboardOpen(true)}
              data-testid="open-math-keyboard-btn"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
            >
              <Calculator className="h-4 w-4 text-indigo-600" />
              <span>Math Keyboard (LaTeX)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleSolve()}
            disabled={isSolving}
            data-testid="solve-homework-submit-btn"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#FF4B4B] px-6 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-rose-600 disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            <span>{isSolving ? 'Solving Step-by-Step...' : 'Solve Now'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Quick Try Sample Prompts */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs font-bold text-slate-400">Try instant examples:</span>
        {QUICK_SAMPLE_PROMPTS.map((sample, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setSelectedSubject(sample.subject);
              setPrompt(sample.prompt);
              handleSolve(sample.prompt, sample.subject);
            }}
            data-testid={`sample-prompt-${idx}`}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-rose-300 hover:bg-rose-50 hover:text-[#FF4B4B]"
          >
            {sample.label}
          </button>
        ))}
      </div>

      {/* Instant Step-by-Step Solution Result Panel (When a problem is solved on Home) */}
      {instantSolution && (
        <div
          className="mt-8 rounded-3xl border-2 border-emerald-200 bg-white p-6 shadow-xl"
          data-testid="instant-solution-panel"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800">
                  VERIFIED SOLUTION · 99.8% ACCURACY
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  {instantSolution.subject} · {instantSolution.topic}
                </span>
              </div>
              <h2 className="mt-2 font-mono text-lg font-extrabold text-slate-900">
                {instantSolution.promptText}
              </h2>
            </div>

            <Link
              href={`/solution/${instantSolution.slug || instantSolution.id}`}
              data-testid="open-full-solution-link"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              <span>Open Interactive Tutor & Full Solution</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Final Answer Banner */}
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Final Verified Answer
            </div>
            <div
              className="mt-1 font-mono text-xl font-black text-slate-900"
              data-testid="instant-answer-summary"
            >
              {instantSolution.answerSummary}
            </div>
          </div>

          {/* Steps Breakdown */}
          <div className="mt-5 space-y-3">
            {instantSolution.steps.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF4B4B] text-xs font-extrabold text-white">
                    {step.number}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    {step.title}
                  </h3>
                </div>
                <div className="mt-2 rounded-xl bg-white px-3.5 py-2 font-mono text-sm font-semibold text-indigo-950 border border-slate-100">
                  {step.latex}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {step.explanation}
                </p>
              </div>
            ))}
          </div>

          {/* 2D Function Graph if available */}
          {instantSolution.graphConfig && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-bold text-slate-800">
                Interactive 2D Cartesian Function Plot
              </h3>
              <FunctionGraphSvg graph={instantSolution.graphConfig} />
            </div>
          )}
        </div>
      )}

      {/* Feature Pillars Grid: Calculator, Gauth Atlas, Gauth Academy */}
      <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
        <Link
          href="/calculator"
          className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-[#FF4B4B]">
            <Calculator className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-[#FF4B4B]">
            AI Symbolic Calculator & 2D Grapher
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            Solve quadratics, derivatives, definite integrals, trigonometry, and plot continuous 2D SVG graphs with automatic root and extrema markers.
          </p>
        </Link>

        <Link
          href="/atlas"
          className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Compass className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-indigo-600">
            Gauth Atlas · Visual Encyclopedia
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            Explore interactive multi-chapter visual investigations—from Quantum Tunneling and CRISPR-Cas9 to Fourier Transforms and Medieval History.
          </p>
        </Link>

        <Link
          href="/course"
          className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-emerald-600">
            Gauth Academy · 15-Min Visual Courses
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            Master AP Calculus, Parabola Geometry, Newtonian Mechanics, and Statistical Inference with interactive slide decks and live AI tutor Q&A.
          </p>
        </Link>
      </div>

      {/* Verified Study Bank Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Verified Homework Study Bank
            </h2>
            <p className="text-xs text-slate-500">
              Explore peer-reviewed step-by-step solutions across all 12 STEM & Humanities subjects
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/study-resources')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <BookOpen className="h-3.5 w-3.5 text-[#FF4B4B]" />
            <span>Browse All 12 Subjects</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studyBank.map((item) => (
            <Link
              key={item.id}
              href={`/solution/${item.slug || item.id}`}
              data-testid={`study-bank-card-${item.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-rose-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-lg bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-[#FF4B4B]">
                    {item.subject}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified
                  </span>
                </div>
                <h3 className="mt-3 font-mono text-sm font-bold text-slate-900 group-hover:text-[#FF4B4B]">
                  {item.promptText}
                </h3>
                <p className="mt-1 text-[11px] text-slate-500">{item.topic}</p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="truncate font-mono font-semibold text-slate-700">
                  Ans: {item.answerSummary}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-[#FF4B4B]" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Modals */}
      <MathKeyboardModal
        isOpen={keyboardOpen}
        onClose={() => setKeyboardOpen(false)}
        onInsertSymbol={(sym) => setPrompt((prev) => `${prev}${sym}`)}
        onBackspace={() => setPrompt((prev) => prev.slice(0, -1))}
        onSubmit={() => handleSolve()}
      />

      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        onExtractedQuestion={(extracted) => {
          setSelectedSubject(extracted.subject);
          setPrompt(extracted.promptText);
          setCropBadge(extracted.cropSummary);
          handleSolve(extracted.promptText, extracted.subject);
        }}
      />
    </div>
  );
}

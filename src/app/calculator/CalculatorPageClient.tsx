'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Play,
  RotateCcw,
  Delete,
  CheckCircle2,
} from 'lucide-react';
import { FunctionGraphSvg } from '@/components/math/FunctionGraphSvg';
import { MathFormula } from '@/components/ui/MathFormula';
import { RichText } from '@/components/ui/RichText';
import { VerificationEvidence } from '@/components/ui/VerificationEvidence';
import { WorkingIndicator } from '@/components/ui/WorkingIndicator';
import type { FunctionGraphData } from '@/lib/math-engine/grapher';
import type { MathSolutionResult } from '@/lib/math-engine/solver';

const CALCULATOR_TABS = [
  {
    id: 'algebra',
    label: 'Algebra',
    presets: [
      { label: 'x² − 5x + 6 = 0', expr: 'x^2 - 5x + 6 = 0' },
      { label: '4x − 7 = 2x + 9', expr: '4x - 7 = 2x + 9' },
      { label: 'x³ − 4x', expr: 'x^3 - 4*x' },
    ],
    keys: [
      { label: 'x²', val: '^2' },
      { label: 'x³', val: '^3' },
      { label: '√(', val: 'sqrt(' },
      { label: '(', val: '(' },
      { label: ')', val: ')' },
      { label: '=', val: ' = ' },
      { label: '7', val: '7' },
      { label: '8', val: '8' },
      { label: '9', val: '9' },
      { label: '÷', val: '/' },
      { label: 'x', val: 'x' },
      { label: '^', val: '^' },
      { label: '4', val: '4' },
      { label: '5', val: '5' },
      { label: '6', val: '6' },
      { label: '×', val: '*' },
      { label: 'π', val: 'pi' },
      { label: 'e', val: 'e' },
      { label: '1', val: '1' },
      { label: '2', val: '2' },
      { label: '3', val: '3' },
      { label: '−', val: '-' },
      { label: '0', val: '0' },
      { label: '+', val: '+' },
    ],
  },
  {
    id: 'calculus',
    label: 'Calculus',
    presets: [
      { label: 'd/dx (x³ − 6x² + 9x + 2)', expr: 'derivative of x^3 - 6x^2 + 9x + 2' },
      { label: '∫₀³ (x² + 4x) dx', expr: 'integrate x^2 + 4x from 0 to 3' },
      { label: 'd/dx (sin(x)·x²)', expr: 'derivative of sin(x) * x^2' },
    ],
    keys: [
      { label: 'd/dx', val: 'derivative of ' },
      { label: '∫ dx', val: 'integrate ' },
      { label: '0..3', val: ' from 0 to 3' },
      { label: 'sin(x)', val: 'sin(x)' },
      { label: 'cos(x)', val: 'cos(x)' },
      { label: 'tan(x)', val: 'tan(x)' },
      { label: 'ln(x)', val: 'ln(x)' },
      { label: 'exp(x)', val: 'exp(x)' },
      { label: 'x^4', val: 'x^4' },
      { label: 'x^3', val: 'x^3' },
      { label: 'x^2', val: 'x^2' },
      { label: '1/x', val: '1/x' },
    ],
  },
  {
    id: 'trig_stats',
    label: 'Trig & Stats',
    presets: [
      { label: 'sin²(π/4) + cos²(π/4)', expr: 'sin(pi/4)^2 + cos(pi/4)^2 + tan(pi/4)' },
      { label: 'Stats (4, 8, 15, 16, 23, 42)', expr: 'stats of 4, 8, 15, 16, 23, 42' },
      { label: 'sin(x)·cos(0.5x)', expr: 'sin(x) * cos(0.5*x)' },
    ],
    keys: [
      { label: 'sin(', val: 'sin(' },
      { label: 'cos(', val: 'cos(' },
      { label: 'tan(', val: 'tan(' },
      { label: 'asin(', val: 'asin(' },
      { label: 'acos(', val: 'acos(' },
      { label: 'atan(', val: 'atan(' },
      { label: 'mean(', val: 'mean(' },
      { label: 'median(', val: 'median(' },
      { label: 'std(', val: 'std(' },
      { label: 'log10(', val: 'log10(' },
      { label: 'abs(', val: 'abs(' },
      { label: 'pi/4', val: 'pi/4' },
    ],
  },
];

export default function CalculatorPage({ initialSolution, initialGraph }: { initialSolution: MathSolutionResult; initialGraph: FunctionGraphData | null }) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('algebra');
  const [expression, setExpression] = useState('x^2 - 5x + 6 = 0');
  const [xMin, setXMin] = useState(-6);
  const [xMax, setXMax] = useState(8);
  const [solution, setSolution] = useState<MathSolutionResult | null>(initialSolution);
  const [graph, setGraph] = useState<FunctionGraphData | null>(initialGraph);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solvedExpression, setSolvedExpression] = useState('x^2 - 5x + 6 = 0');
  const latestRequest = useRef<AbortController | null>(null);

  const evaluateExpression = async (exprToEval = expression, min = xMin, max = xMax) => {
    if (!exprToEval.trim()) return;
    latestRequest.current?.abort();
    const controller = new AbortController();
    latestRequest.current = controller;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/calculator/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expression: exprToEval,
          xMin: min,
          xMax: max,
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'The calculation failed. Please try again.');
      if (!controller.signal.aborted) {
        setSolution(data.solution);
        setGraph(data.graph);
        setSolvedExpression(exprToEval);
      }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof TypeError ? 'The calculation failed. Please try again.' : failure instanceof Error ? failure.message : 'The calculation failed. Please try again.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  useEffect(() => () => latestRequest.current?.abort(), []);

  const currentTab =
    CALCULATOR_TABS.find((t) => t.id === activeTab) || CALCULATOR_TABS[0];

  return (
    <div
      className="page-container"
      data-testid="calculator-page"
    >
      {/* Calm Page Header */}
      <div className="page-heading">
        <p className="eyebrow">{t("The calculator / A space for working things out")}</p>
        <h1>{t("Make the numbers make sense.")}</h1>
        <p>{t("From the first equation to the final curve. Explore the answer and the thinking behind it.")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 5 Columns: Primary Composer & Soft Tonal Keypad */}
        <div className="lg:col-span-5">
          <div className="paper-panel p-5 sm:p-6">
            <label htmlFor="calculator-expression" className="block text-sm font-semibold">{t("Expression or Equation")}</label>
            <div className="mt-2">
              <input
                type="text"
                id="calculator-expression"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                data-testid="calculator-expression-input"
                placeholder="e.g. x^2 - 5x + 6 = 0"
                className="lumina-input w-full px-4 py-3.5 font-mono text-base font-bold text-atelier-obsidian"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    evaluateExpression();
                  }
                }}
              />
            </div>

            {/* Domain Range & Primary Action */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{t("Domain x:")}</span>
                <input
                  type="number"
                  aria-label={t("Domain minimum")}
                  value={xMin}
                  onChange={(e) => setXMin(Number(e.target.value))}
                  className="lumina-input w-16 px-2.5 py-1.5 text-center font-mono text-xs"
                />
                <span>{t("to")}</span>
                <input
                  type="number"
                  aria-label={t("Domain maximum")}
                  value={xMax}
                  onChange={(e) => setXMax(Number(e.target.value))}
                  className="lumina-input w-16 px-2.5 py-1.5 text-center font-mono text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => evaluateExpression()}
                disabled={loading}
                data-testid="calculator-evaluate-btn"
                className="primary-button"
              >
                <Play className="h-3.5 w-3.5" />
                <span>{loading ? t('Computing...') : t('Evaluate & Plot')}</span>
              </button>
            </div>

            {/* Segmented Mode Tabs */}
            <div className="mt-6 flex border-b border-atelier-border">
              {CALCULATOR_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`calc-tab-${tab.id}`}
                  aria-pressed={activeTab === tab.id}
                  className={`flex-1 border-b-2 py-3 text-xs transition ${
                    activeTab === tab.id
                      ? 'border-atelier-obsidian font-semibold text-atelier-obsidian'
                      : 'border-transparent text-atelier-muted'
                  }`}
                >
                  {t(tab.label)}
                </button>
              ))}
            </div>

            {/* Quiet One-Click Presets */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {currentTab.presets.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setExpression(p.expr);
                    evaluateExpression(p.expr);
                  }}
                  data-testid={`calc-preset-${activeTab}-${i}`}
                  className="rounded-md px-2 py-1.5 text-[11px] text-atelier-muted transition hover:bg-atelier-subtle hover:text-atelier-obsidian"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Soft Tonal Scientific Keypad (No Harsh Borders) */}
            <div className="mt-5 grid grid-cols-6 gap-2">
              {currentTab.keys.map((k, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setExpression((prev) => `${prev}${k.val}`)}
                  className="flex h-12 items-center justify-center rounded-md bg-atelier-subtle/60 font-mono text-xs font-medium text-atelier-obsidian transition hover:bg-atelier-lilac"
                >
                  {k.label}
                </button>
              ))}
            </div>

            {/* Quiet Clear & Backspace Row */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setExpression((prev) => prev.slice(0, -1))}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-atelier-subtle/60 hover:text-atelier-obsidian"
              >
                <Delete className="h-3.5 w-3.5" />{t("Backspace")}</button>
              <button
                type="button"
                onClick={() => setExpression('')}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-atelier-subtle/60 hover:text-atelier-obsidian"
              >
                <RotateCcw className="h-3.5 w-3.5" />{t("Clear")}</button>
            </div>
          </div>
        </div>

        {/* Right 7 Columns: Primary Symbolic Result + Timeline Derivation + 2D Graph */}
        <div className="min-w-0 space-y-6 lg:col-span-7">
          {loading && <WorkingIndicator label="Solving and checking the calculation..." />}
          {error && <p role="alert" className="text-sm text-rose-800">{t(error)}</p>}
          {solution && (
            <div
              className="lumina-card p-5 sm:p-6"
              data-testid="calculator-solution-card"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {solution.subTopic}
                </span>
              </div>
              <VerificationEvidence status={solution.verificationStatus} detail={solution.verificationDetail} />
              <Link href={`/?question=${encodeURIComponent(solvedExpression)}`} className="text-button mt-3" data-testid="calculator-tutor-handoff">{t('Explore this with a tutor')}</Link>

              {/* Primary Result Stage */}
              <div className="solution-answer">
                <div className="eyebrow text-atelier-jade">{t("Result")}</div>
                <div
                  className="mt-1.5 font-mono text-2xl font-bold text-atelier-obsidian"
                  data-testid="calculator-result-value"
                  aria-label={solution.answerSummary}
                >
                  <MathFormula latex={solution.finalLatex} display />
                </div>
              </div>

              {/* Clean Timeline Derivation */}
              <div className="mt-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t("Step-by-Step Derivation")}</h3>
                {solution.steps.map((step) => (
                  <div
                    key={step.number}
                    className="border-l border-atelier-border pl-5"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-400">
                        0{step.number}
                      </span>
                      <span className="font-semibold text-atelier-obsidian">
                        {step.title}
                      </span>
                    </div>
                    <div className="mt-2 min-w-0 rounded-md bg-atelier-subtle/60 px-3 py-2 text-base text-atelier-obsidian">
                      <MathFormula latex={step.latex} display />
                    </div>
                    <RichText text={step.explanation} className="mt-3 text-sm leading-relaxed text-atelier-muted" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {graph && <FunctionGraphSvg graph={graph} />}
        </div>
      </div>
    </div>
  );
}

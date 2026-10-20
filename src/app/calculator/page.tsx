'use client';

import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Sparkles,
  Play,
  RotateCcw,
  Delete,
  CheckCircle2,
} from 'lucide-react';
import { FunctionGraphSvg } from '@/components/math/FunctionGraphSvg';
import { MathFormula } from '@/components/ui/MathFormula';
import type { FunctionGraphData } from '@/lib/math-engine/grapher';
import type { MathSolutionResult } from '@/lib/math-engine/solver';

const CALCULATOR_TABS = [
  {
    id: 'algebra',
    label: 'Basic & Algebra',
    presets: [
      { label: 'Quadratic Roots', expr: 'x^2 - 5x + 6 = 0' },
      { label: 'Linear System', expr: '4x - 7 = 2x + 9' },
      { label: 'Cubic Polynomial', expr: 'x^3 - 4*x' },
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
    label: 'Calculus (d/dx & ∫)',
    presets: [
      { label: 'Derivative d/dx', expr: 'derivative of x^3 - 6x^2 + 9x + 2' },
      { label: 'Definite Integral ∫₀³', expr: 'integrate x^2 + 4x from 0 to 3' },
      { label: 'Trig Derivative', expr: 'derivative of sin(x) * x^2' },
    ],
    keys: [
      { label: 'd/dx', val: 'derivative of ' },
      { label: '∫ dx', val: 'integrate ' },
      { label: 'from 0 to 3', val: ' from 0 to 3' },
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
    label: 'Trig & Statistics',
    presets: [
      { label: 'Trig Identity Eval', expr: 'sin(pi/4)^2 + cos(pi/4)^2 + tan(pi/4)' },
      { label: 'Descriptive Stats', expr: 'stats of 4, 8, 15, 16, 23, 42' },
      { label: 'Damped Wave Plot', expr: 'sin(x) * cos(0.5*x)' },
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

export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState('algebra');
  const [expression, setExpression] = useState('x^2 - 5x + 6 = 0');
  const [xMin, setXMin] = useState(-6);
  const [xMax, setXMax] = useState(8);
  const [solution, setSolution] = useState<MathSolutionResult | null>(null);
  const [graph, setGraph] = useState<FunctionGraphData | null>(null);
  const [loading, setLoading] = useState(false);

  const evaluateExpression = async (exprToEval = expression, min = xMin, max = xMax) => {
    if (!exprToEval.trim()) return;
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
      });
      const data = await res.json();
      if (data.ok) {
        setSolution(data.solution);
        setGraph(data.graph);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    evaluateExpression('x^2 - 5x + 6 = 0', -6, 8);
  }, []);

  const currentTab =
    CALCULATOR_TABS.find((t) => t.id === activeTab) || CALCULATOR_TABS[0];

  return (
    <div
      className="mx-auto max-w-6xl px-4 py-8 sm:px-8"
      data-testid="calculator-page"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-extrabold text-[#FF4B4B]">
            <Calculator className="h-3.5 w-3.5" />
            <span>GAUTH SYMBOLIC CAS & 2D GRAPHING ENGINE</span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
            AI Math Calculator & Function Plotter
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Instant symbolic algebra, quadratic root finder, derivatives, definite Simpson quadrature, and interactive 2D SVG plotting
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 5 Columns: Expression Composer & Scientific Keypad */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Mathematical Expression or Equation
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                data-testid="calculator-expression-input"
                placeholder="e.g. x^2 - 5x + 6 = 0"
                className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 font-mono text-base font-bold text-slate-900 focus:border-[#FF4B4B] focus:bg-white focus:outline-hidden"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    evaluateExpression();
                  }
                }}
              />
            </div>

            {/* Domain Range Controls */}
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Plot Domain x:</span>
                <input
                  type="number"
                  value={xMin}
                  onChange={(e) => setXMin(Number(e.target.value))}
                  className="w-16 rounded-lg border border-slate-200 px-2 py-1 font-mono text-xs"
                />
                <span>to</span>
                <input
                  type="number"
                  value={xMax}
                  onChange={(e) => setXMax(Number(e.target.value))}
                  className="w-16 rounded-lg border border-slate-200 px-2 py-1 font-mono text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => evaluateExpression()}
                disabled={loading}
                data-testid="calculator-evaluate-btn"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF4B4B] px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-rose-600"
              >
                <Play className="h-3.5 w-3.5" />
                <span>{loading ? 'Computing...' : 'Calculate & Plot'}</span>
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="mt-5 flex gap-1.5 border-t border-slate-100 pt-4">
              {CALCULATOR_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  data-testid={`calc-tab-${t.id}`}
                  className={`flex-1 rounded-xl px-2.5 py-2 text-xs font-bold transition ${
                    activeTab === t.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* One-Click Presets */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {currentTab.presets.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setExpression(p.expr);
                    evaluateExpression(p.expr);
                  }}
                  data-testid={`calc-preset-${activeTab}-${i}`}
                  className="rounded-lg border border-rose-200 bg-rose-50/70 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Keypad Buttons */}
            <div className="mt-4 grid grid-cols-6 gap-1.5">
              {currentTab.keys.map((k, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setExpression((prev) => `${prev}${k.val}`)}
                  className="flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs font-bold text-slate-800 transition hover:border-rose-400 hover:bg-rose-50 hover:text-[#FF4B4B]"
                >
                  {k.label}
                </button>
              ))}
            </div>

            {/* Clear & Backspace Row */}
            <div className="mt-3 flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExpression((prev) => prev.slice(0, -1))}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                <Delete className="h-3.5 w-3.5" />
                Backspace
              </button>
              <button
                type="button"
                onClick={() => setExpression('')}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Right 7 Columns: Symbolic Result + Steps + 2D Graph */}
        <div className="space-y-5 lg:col-span-7">
          {solution && (
            <div
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              data-testid="calculator-solution-card"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {solution.subTopic}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  Confidence: {Math.round(solution.confidence * 100)}%
                </span>
              </div>

              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Exact Symbolic & Numerical Result
                </div>
                <div
                  className="mt-1 font-mono text-2xl font-black text-slate-900"
                  data-testid="calculator-result-value"
                >
                  {solution.answerSummary}
                </div>
              </div>

              {/* Step-by-Step Breakdown */}
              <div className="mt-5 space-y-3">
                <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  <Sparkles className="h-3.5 w-3.5 text-[#FF4B4B]" />
                  Step-by-Step Symbolic Derivation
                </h3>
                {solution.steps.map((step) => (
                  <div
                    key={step.number}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF4B4B] text-[11px] font-bold text-white">
                        {step.number}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {step.title}
                      </span>
                    </div>
                    <div className="mt-2 rounded-xl border border-slate-100 bg-white px-3 py-2 font-mono text-xs font-bold text-indigo-950">
                      <MathFormula latex={step.latex} />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600">
                      {step.explanation}
                    </p>
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

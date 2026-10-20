'use client';

import React, { useState } from 'react';
import { X, Calculator, CornerDownLeft, Delete } from 'lucide-react';

interface MathKeyboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSymbol: (latex: string) => void;
  onBackspace?: () => void;
  onSubmit?: () => void;
}

const KEYBOARD_TABS = [
  {
    id: 'basic',
    label: 'Basic & Algebra',
    keys: [
      { display: 'x²', insert: '^2' },
      { display: 'xⁿ', insert: '^' },
      { display: '√x', insert: 'sqrt(' },
      { display: 'ⁿ√x', insert: 'nthRoot(' },
      { display: 'a/b', insert: '/' },
      { display: '( )', insert: '()' },
      { display: '|x|', insert: 'abs(' },
      { display: 'π', insert: 'pi' },
      { display: 'e', insert: 'e' },
      { display: '=', insert: ' = ' },
      { display: '≤', insert: ' <= ' },
      { display: '≥', insert: ' >= ' },
      { display: '7', insert: '7' },
      { display: '8', insert: '8' },
      { display: '9', insert: '9' },
      { display: '÷', insert: ' / ' },
      { display: '4', insert: '4' },
      { display: '5', insert: '5' },
      { display: '6', insert: '6' },
      { display: '×', insert: ' * ' },
      { display: '1', insert: '1' },
      { display: '2', insert: '2' },
      { display: '3', insert: '3' },
      { display: '−', insert: ' - ' },
      { display: '0', insert: '0' },
      { display: '.', insert: '.' },
      { display: 'x', insert: 'x' },
      { display: '+', insert: ' + ' },
    ],
  },
  {
    id: 'functions',
    label: 'Trig & Logs',
    keys: [
      { display: 'sin(x)', insert: 'sin(x)' },
      { display: 'cos(x)', insert: 'cos(x)' },
      { display: 'tan(x)', insert: 'tan(x)' },
      { display: 'cot(x)', insert: 'cot(x)' },
      { display: 'sec(x)', insert: 'sec(x)' },
      { display: 'csc(x)', insert: 'csc(x)' },
      { display: 'arcsin', insert: 'asin(' },
      { display: 'arccos', insert: 'acos(' },
      { display: 'arctan', insert: 'atan(' },
      { display: 'ln(x)', insert: 'ln(x)' },
      { display: 'log₁₀(x)', insert: 'log(x)' },
      { display: 'eˣ', insert: 'exp(x)' },
      { display: '10ˣ', insert: '10^x' },
      { display: 'sinh(x)', insert: 'sinh(x)' },
      { display: 'cosh(x)', insert: 'cosh(x)' },
      { display: 'tanh(x)', insert: 'tanh(x)' },
    ],
  },
  {
    id: 'calculus',
    label: 'Calculus & Stats',
    keys: [
      { display: 'd/dx', insert: 'derivative of ' },
      { display: '∫ f(x) dx', insert: 'integrate ' },
      { display: '∫₀³ f(x) dx', insert: 'integrate x^2 + 4x from 0 to 3' },
      { display: 'lim x→0', insert: 'sin(x)/x' },
      { display: 'Σ sum', insert: 'sum(' },
      { display: 'n!', insert: 'factorial(' },
      { display: 'mean()', insert: 'mean(4, 8, 15, 16, 23, 42)' },
      { display: 'median()', insert: 'median(4, 8, 15, 16, 23, 42)' },
      { display: 'std()', insert: 'std(4, 8, 15, 16, 23, 42)' },
      { display: 'det(A)', insert: 'det([[1, 2], [3, 4]])' },
      { display: 'f(x)=0', insert: 'x^2 - 5x + 6 = 0' },
      { display: 'Δ = b²-4ac', insert: 'b^2 - 4*a*c' },
    ],
  },
  {
    id: 'greek',
    label: 'Greek & Symbols',
    keys: [
      { display: 'α', insert: 'alpha' },
      { display: 'β', insert: 'beta' },
      { display: 'γ', insert: 'gamma' },
      { display: 'θ', insert: 'x' },
      { display: 'λ', insert: 'lambda' },
      { display: 'μ', insert: 'mu' },
      { display: 'σ', insert: 'sigma' },
      { display: 'ω', insert: 'omega' },
      { display: 'Δ', insert: 'Delta' },
      { display: '∞', insert: 'Infinity' },
      { display: '±', insert: ' + ' },
      { display: '≈', insert: ' = ' },
    ],
  },
];

export function MathKeyboardModal({
  isOpen,
  onClose,
  onInsertSymbol,
  onBackspace,
  onSubmit,
}: MathKeyboardModalProps) {
  const [activeTab, setActiveTab] = useState('basic');

  if (!isOpen) return null;

  const currentTab =
    KEYBOARD_TABS.find((t) => t.id === activeTab) || KEYBOARD_TABS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-2 backdrop-blur-xs sm:items-center sm:p-4"
      data-testid="math-keyboard-modal"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500 text-white">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Gauth Scientific & LaTeX Math Keyboard
              </h3>
              <p className="text-[11px] text-slate-500">
                Click any mathematical operator, calculus template, or function to insert
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-700"
            aria-label="Close Math Keyboard"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 border-b border-slate-100 bg-white px-5 py-2.5">
          {KEYBOARD_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Keys Grid */}
        <div className="grid grid-cols-4 gap-2 p-5">
          {currentTab.keys.map((k, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onInsertSymbol(k.insert)}
              className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 font-mono text-sm font-semibold text-slate-800 transition hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
            >
              {k.display}
            </button>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
          <div className="flex items-center gap-2">
            {onBackspace && (
              <button
                type="button"
                onClick={onBackspace}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Delete className="h-3.5 w-3.5" />
                Backspace
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
            >
              Done
            </button>
            {onSubmit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSubmit();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-600"
              >
                <CornerDownLeft className="h-3.5 w-3.5" />
                Solve Expression
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

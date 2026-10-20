import React from 'react';

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  n: 'ⁿ',
  x: 'ˣ',
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  a: 'ₐ',
  e: 'ₑ',
  i: 'ᵢ',
  n: 'ₙ',
  x: 'ₓ',
};

function toSuperscript(text: string): string {
  const chars = [...text];
  if (chars.every((c) => c in SUPERSCRIPT_MAP)) {
    return chars.map((c) => SUPERSCRIPT_MAP[c]).join('');
  }
  return `^(${text})`;
}

function toSubscript(text: string): string {
  const chars = [...text];
  if (chars.every((c) => c in SUBSCRIPT_MAP)) {
    return chars.map((c) => SUBSCRIPT_MAP[c]).join('');
  }
  return `_(${text})`;
}

/**
 * Safe, zero-XSS mathematical notation formatter that converts LaTeX macros
 * (\frac, \sqrt, \int, \lim, \text, Greek letters, operators, sub/superscripts)
 * into clean Unicode mathematical typography.
 */
export function formatLatexToReadableMath(rawLatex: string): string {
  if (!rawLatex) return '';
  let s = rawLatex.trim();

  // Strip display math delimiters
  s = s.replace(/^\$\$|\$\$$/g, '').replace(/^\\\(|\\\)$/g, '').replace(/^\\\[|\\\]$/g, '');

  // Replace \text{...} and \mathrm{...}
  for (let i = 0; i < 4; i++) {
    s = s.replace(/\\(?:text|mathrm|textbf)\{([^{}]*)\}/g, '$1');
  }

  // Replace \int_{a}^{b} and \lim_{x \to a}
  s = s.replace(
    /\\int_\{([^{}]+)\}\^\{([^{}]+)\}/g,
    (_, lower, upper) => `∫[${lower} → ${upper}]`
  );
  s = s.replace(
    /\\int_([0-9a-zA-Z-]+)\^([0-9a-zA-Z-]+)/g,
    (_, lower, upper) => `∫[${lower} → ${upper}]`
  );
  s = s.replace(
    /\\lim_\{([^{}]+)\}/g,
    (_, sub) => `lim(${sub.replace(/\\to\b/g, '→')})`
  );

  // Iteratively expand nested \sqrt{...} and \frac{...}{...}
  for (let i = 0; i < 5; i++) {
    s = s.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (_, num, den) => {
      const cleanNum = num.trim();
      const cleanDen = den.trim();
      const numWrapped = /[+\-]/.test(cleanNum) ? `(${cleanNum})` : cleanNum;
      const denWrapped = /[+\-*/\s]/.test(cleanDen) ? `(${cleanDen})` : cleanDen;
      return `${numWrapped} / ${denWrapped}`;
    });
  }

  // Replace standard LaTeX math symbols & Greek letters
  const symbolReplacements: Array<[RegExp, string]> = [
    [/\\left\(/g, '('],
    [/\\right\)/g, ')'],
    [/\\left\[/g, '['],
    [/\\right\]/g, ']'],
    [/\\left\\\{/g, '{'],
    [/\\right\\\}/g, '}'],
    [/\\pm\b/g, '±'],
    [/\\mp\b/g, '∓'],
    [/\\times\b/g, '×'],
    [/\\cdot\b/g, '·'],
    [/\\div\b/g, '÷'],
    [/\\le\b|\\leq\b/g, '≤'],
    [/\\ge\b|\\geq\b/g, '≥'],
    [/\\neq\b|\\ne\b/g, '≠'],
    [/\\approx\b/g, '≈'],
    [/\\infty\b/g, '∞'],
    [/\\to\b|\\rightarrow\b/g, '→'],
    [/\\Rightarrow\b/g, '⇒'],
    [/\\in\b/g, '∈'],
    [/\\cup\b/g, '∪'],
    [/\\cap\b/g, '∩'],
    [/\\emptyset\b/g, '∅'],
    [/\\mathbb\{R\}/g, 'ℝ'],
    [/\\Delta\b/g, 'Δ'],
    [/\\alpha\b/g, 'α'],
    [/\\beta\b/g, 'β'],
    [/\\gamma\b/g, 'γ'],
    [/\\theta\b/g, 'θ'],
    [/\\lambda\b/g, 'λ'],
    [/\\mu\b/g, 'μ'],
    [/\\pi\b/g, 'π'],
    [/\\sigma\b/g, 'σ'],
    [/\\omega\b/g, 'ω'],
    [/\\int\b/g, '∫'],
    [/\\sum\b/g, '∑'],
    [/\\,/g, ' '],
    [/\\quad\b|\\qquad\b/g, '  '],
  ];

  for (const [pattern, replacement] of symbolReplacements) {
    s = s.replace(pattern, replacement);
  }

  // Convert ^{...} and ^n, _{...} and _n
  s = s.replace(/\^\{([^{}]+)\}/g, (_, exp) => toSuperscript(exp));
  s = s.replace(/\^([0-9+\-n])/g, (_, exp) => toSuperscript(exp));
  s = s.replace(/_\{([^{}]+)\}/g, (_, sub) => toSubscript(sub));
  s = s.replace(/_([0-9a-z])/g, (_, sub) => toSubscript(sub));

  return s.replace(/\s{2,}/g, ' ').trim();
}

export function MathFormula({
  latex,
  className = '',
}: {
  latex: string;
  className?: string;
}) {
  const formatted = formatLatexToReadableMath(latex);
  return (
    <span
      className={`inline-block font-mono tracking-tight ${className}`}
      data-latex={latex}
      title={latex}
    >
      {formatted}
    </span>
  );
}

'use client';

import React, { memo } from 'react';
import katex from 'katex';
import { useI18n } from '@/components/i18n/LanguageProvider';

interface MathFormulaProps {
  latex: string;
  display?: boolean;
  className?: string;
}

export const MathFormula = memo(function MathFormula({
  latex,
  display = false,
  className = '',
}: MathFormulaProps) {
  const { t } = useI18n();
  let source = latex.trim();
  for (const [start, end] of [['$$', '$$'], ['\\[', '\\]'], ['\\(', '\\)'], ['$', '$']]) {
    if (source.startsWith(start) && source.endsWith(end) && source.length >= start.length + end.length) {
      source = source.slice(start.length, -end.length).trim();
      break;
    }
  }
  if (!source) return null;

  let markup: string;
  try {
    markup = katex.renderToString(source, {
      displayMode: display,
      output: 'htmlAndMathml',
      throwOnError: true,
      trust: false,
      maxExpand: 1000,
    });
  } catch (error) {
    if (!(error instanceof katex.ParseError)) throw error;
    return (
      <span className={`math-formula-error ${className}`} data-math-error title={error.message}>
        <code>{latex}</code>
        <span>{t('Formula formatting error')}</span>
      </span>
    );
  }

  return (
    <span
      className={`math-formula ${className}`}
      data-latex={latex}
      data-display={display}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
});

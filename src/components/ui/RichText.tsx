'use client';

import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import { MathFormula } from './MathFormula';

export function normalizeMathDelimiters(source: string): string {
  let result = '';
  let cursor = 0;
  while (cursor < source.length) {
    const character = source[cursor];
    if (character === '`' || character === '~') {
      let length = 1;
      while (source[cursor + length] === character) length++;
      const linePrefix = source.slice(source.lastIndexOf('\n', cursor - 1) + 1, cursor);
      if (length >= 3 && /^ {0,3}$/.test(linePrefix)) {
        const closing = new RegExp(`^ {0,3}${character}{${length},}[\\t ]*$`, 'gm');
        closing.lastIndex = cursor + length;
        const match = closing.exec(source);
        const end = match ? match.index + match[0].length : source.length;
        result += source.slice(cursor, end);
        cursor = end;
        continue;
      }
      if (character === '`') {
        const runs = /`+/g;
        runs.lastIndex = cursor + length;
        let closing;
        while ((closing = runs.exec(source)) && closing[0].length !== length) {}
        if (closing) {
          const end = closing.index + length;
          result += source.slice(cursor, end);
          cursor = end;
          continue;
        }
      }
    }
    if (character === '\\') {
      const next = source[cursor + 1];
      if (next === '\\') {
        result += '\\\\';
        cursor += 2;
        continue;
      }
      if (next === '(' || next === '[') {
        const closer = next === '(' ? ')' : ']';
        let end = cursor + 2;
        for (; end < source.length - 1; end++) {
          if (source[end] !== '\\') continue;
          if (source[end + 1] === closer) break;
          if (source[end + 1] === '\\') end++;
        }
        if (end < source.length - 1) {
          const formula = source.slice(cursor + 2, end);
          result += next === '(' ? `$${formula}$` : `\n\n$$\n${formula}\n$$\n\n`;
          cursor = end + 2;
          continue;
        }
      }
    }
    result += character;
    cursor++;
  }
  return result;
}

export const RichText = memo(function RichText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`rich-text ${className}`}>
      <ReactMarkdown
        skipHtml
        remarkPlugins={[remarkMath]}
        components={{
          code({ className: codeClassName, children }) {
            if (codeClassName?.split(/\s+/).includes('language-math')) {
              return <MathFormula latex={String(children)} display={codeClassName.split(/\s+/).includes('math-display')} />;
            }
            return <code className={codeClassName}>{children}</code>;
          },
          pre({ node, children }) {
            const first = node?.children[0];
            const classes = first?.type === 'element' ? first.properties.className : undefined;
            return Array.isArray(classes) && classes.includes('math-display')
              ? <div className="rich-text-display-math">{children}</div>
              : <pre>{children}</pre>;
          },
        }}
      >
        {normalizeMathDelimiters(text)}
      </ReactMarkdown>
    </div>
  );
});

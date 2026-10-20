import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathFormula } from '../src/components/ui/MathFormula';
import { LanguageProvider } from '../src/components/i18n/LanguageProvider';
import { RichText, normalizeMathDelimiters } from '../src/components/ui/RichText';
import { solveMathOrStemProblem } from '../src/lib/math-engine/solver';

const render = (latex: string, display = true) =>
  renderToStaticMarkup(createElement(LanguageProvider, { initialLocale: 'en', children: createElement(MathFormula, { latex, display }) }));

const quadratic = render(String.raw`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} \implies x \in \mathbb{R}`);
for (const element of ['<mfrac>', '<msqrt>', '<msup>', 'katex-html', 'katex-mathml']) {
  assert.ok(quadratic.includes(element), `Quadratic formula must contain ${element}`);
}
assert.ok(!quadratic.includes('data-math-error'));

for (const delimited of ['$x^2$', '$$x^2$$', String.raw`\(x^2\)`, String.raw`\[x^2\]`]) {
  assert.ok(render(delimited).includes('<msup>'), `Unable to render delimiters: ${delimited}`);
}

const cases = render(String.raw`\begin{cases} 2x + y = 5 \\ x - y = 1 \end{cases}`);
assert.ok(cases.includes('<mtable'));
assert.ok(!cases.includes('data-math-error'));

const integral = render(String.raw`\int_0^3 \frac{x^2 + 4x}{\sqrt{1 + x^2}}\,dx`);
assert.ok(integral.includes('<mfrac>') && integral.includes('<msqrt>'));
assert.ok(!integral.includes('data-math-error'));

for (const prompt of [
  'x^2 - 5x + 6 = 0',
  'derivative of sin(x) * x^2',
  'integrate x^2 + 4x from 0 to 3',
  '2x + y = 5; x - y = 1',
  'stats of 4, 8, 15, 16, 23, 42',
]) {
  const solution = solveMathOrStemProblem(prompt);
  for (const formula of [solution.finalLatex, ...solution.steps.map((step) => step.latex), ...solution.keyConcepts.map((concept) => concept.formula)]) {
    assert.ok(!render(formula).includes('data-math-error'), `Could not typeset ${formula}`);
  }
}

const invalid = render(String.raw`\frac{1}{`);
assert.ok(invalid.includes('data-math-error') && invalid.includes('Formula formatting error'));
const untrusted = render(String.raw`\href{javascript:alert(1)}{click}`);
assert.ok(!untrusted.includes('href="javascript:'));
const text = render(String.raw`\text{<img src=x onerror=alert(1)>}`);
assert.ok(!text.includes('<img'));

const renderText = (text: string) => renderToStaticMarkup(createElement(LanguageProvider, {
  initialLocale: 'en',
  children: createElement(RichText, { text }),
}));
const hintSource = String.raw`**Hint:** HCl dissociates completely, so \([H^+] = 0.0001 = 10^{-4}\,\text{M}\); use \(\text{pH} = -\log_{10}[H^+]\).`;
const hint = renderText(hintSource);
assert.ok(hint.includes('<strong>Hint:</strong>'), 'Markdown emphasis must be rendered');
assert.equal((hint.match(/class="katex-html"/g) || []).length, 2, 'Both inline equations must be rendered');
assert.ok(hint.includes('<msup>') && hint.includes('<msub>'), 'Ion charges, powers, and logarithm bases must be typeset');
assert.ok(!hint.includes('data-math-error'));
for (const source of [
  String.raw`Before \[\frac{1}{2}+\sqrt{x}\] after.`,
  '$$\n\\frac{1}{2}+\\sqrt{x}\n$$',
]) {
  const block = renderText(source);
  assert.ok(block.includes('data-display="true"') && block.includes('<mfrac>') && block.includes('<msqrt>'));
}
assert.ok(renderText('Inline $x^2$ and $$y^2$$.').includes('<msup>'));
for (const code of [
  'Use `\\(x^2\\)` as source.',
  '``Use `\\(x^2\\)` as source.``',
  '```latex\n\\(x^2\\)\n```',
  '~~~~latex\n\\[x^2\\]\n~~~~~',
  '```latex\n\\(x^2\\)',
]) {
  assert.equal(normalizeMathDelimiters(code), code, 'Code samples must remain unchanged');
}
assert.equal(normalizeMathDelimiters(String.raw`Unclosed \(x^2`), String.raw`Unclosed \(x^2`);
assert.ok(!renderText('<img src=x onerror=alert(1)>').includes('<img'));
assert.ok(!renderText('[click](javascript:alert(1))').includes('href="javascript:'));
console.log('Math rendering passed: fractions, cases, real solver output, Markdown, inline/block LaTeX, preserved code, and explicit errors.');

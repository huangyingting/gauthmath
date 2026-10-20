import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chineseMessages, getPreferredLocale, translate } from '../src/lib/i18n';
import { LanguageProvider } from '../src/components/i18n/LanguageProvider';
import { MathFormula } from '../src/components/ui/MathFormula';

assert.equal(getPreferredLocale('zh', 'en-US'), 'zh');
assert.equal(getPreferredLocale('en', 'zh-CN'), 'en');
assert.equal(getPreferredLocale(undefined, 'zh-TW,zh;q=0.9,en;q=0.8'), 'zh');
assert.equal(getPreferredLocale(undefined, 'en;q=0.2,zh-CN;q=0.9'), 'zh');
assert.equal(getPreferredLocale(undefined, 'zh;q=0,en;q=0.8'), 'en');
assert.equal(getPreferredLocale('invalid', 'en-US'), 'en');
assert.equal(getPreferredLocale(undefined, 'fr-FR'), 'en');
assert.equal(getPreferredLocale(undefined, null), 'en');
assert.equal(translate('zh', 'Solve'), '解题');
assert.equal(translate('en', 'Solve'), 'Solve');
assert.equal(translate('zh', '  Solve '), '  解题 ');
assert.equal(translate('zh', ' '), ' ');
assert.equal(translate('zh', 'constructor'), 'constructor');
assert.equal(translate('zh', 'x^2 + 3x = 0'), 'x^2 + 3x = 0');
assert.equal(translate('zh', 'Original user content'), 'Original user content');
assert.equal(translate('zh', 'Slide {current} of {total}', { current: 2, total: 4 }), '第 2 / 4 章');
assert.equal(translate('en', 'Slide {current} of {total}', { current: 2, total: 4 }), 'Slide 2 of 4');
for (const [key, translated] of Object.entries(chineseMessages)) {
  assert.deepEqual(
    [...key.matchAll(/\{\w+\}/g)].map(match => match[0]).sort(),
    [...translated.matchAll(/\{\w+\}/g)].map(match => match[0]).sort(),
    `Interpolation must preserve parameters: ${key}`
  );
}
const invalidMath = renderToStaticMarkup(createElement(LanguageProvider, {
  initialLocale: 'zh',
  children: createElement(MathFormula, { latex: '\\frac{1}{' }),
}));
assert.ok(invalidMath.includes('公式格式错误'));
console.log('Chinese/English locale selection, interpolation, content preservation, and formula errors passed.');

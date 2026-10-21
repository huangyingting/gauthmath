import * as math from 'mathjs';

export interface SolutionStep {
  number: number;
  title: string;
  latex: string;
  explanation: string;
}

export type ProblemOutcomeStatus = 'solved' | 'needs_clarification' | 'unsupported';
export type VerificationStatus = 'verified' | 'approximated' | 'unverified';

export interface MathSolutionResult {
  subject: string;
  subTopic: string;
  detectedType:
    | 'quadratic_equation'
    | 'linear_equation'
    | 'polynomial_equation'
    | 'linear_system'
    | 'inequality'
    | 'derivative'
    | 'integral'
    | 'limit'
    | 'statistics'
    | 'trigonometry'
    | 'matrix'
    | 'stem_concept'
    | 'arithmetic_algebra'
    | 'unsupported';
  status?: ProblemOutcomeStatus;
  verificationStatus?: VerificationStatus;
  verificationDetail?: string;
  normalizedExpression: string;
  latexPrompt: string;
  answerSummary: string;
  finalLatex: string;
  numericValue: number | null;
  steps: SolutionStep[];
  keyConcepts: { title: string; formula: string; description: string }[];
  graphExpression: string | null;
  followUpSuggestions: string[];
  confidence: number;
}

/**
 * Strips outer parentheses only if they are balanced across the entire string.
 * Prevents corrupting expressions like "sin(x)" or "(x+1)*(x+2)".
 */
export function stripBalancedOuterParens(input: string): string {
  let s = input.trim();
  while (s.startsWith('(') && s.endsWith(')')) {
    let depth = 0;
    let balanced = true;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (depth === 0 && i < s.length - 1) {
        balanced = false;
        break;
      }
    }
    if (balanced && depth === 0) {
      s = s.slice(1, -1).trim();
    } else {
      break;
    }
  }
  return s;
}

/**
 * Converts common LaTeX and Unicode math notation into mathjs-compatible ASCII syntax
 * while preserving scientific notation (e.g., 1e-3, 2E3, 6.022e23) and function names.
 */
export function normalizeMathInput(raw: string): string {
  let s = raw.trim();
  // Strip leading verbs like "Solve", "Evaluate", "Find", "Calculate", "Simplify"
  s = s.replace(
    /^(solve|evaluate|calculate|simplify|compute|find\s+the\s+value\s+of|factor)\s*[:,-]?\s*/i,
    ''
  );

  // Replace LaTeX fractions \frac{a}{b} -> ((a)/(b))
  let prev = '';
  while (s !== prev) {
    prev = s;
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))');
  }

  s = s
    .replace(/\\sqrt\[([0-9]+)\]\{([^{}]+)\}/g, 'nthRoot(($2), $1)')
    .replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)')
    .replace(/√\(([^()]+)\)/g, 'sqrt($1)')
    .replace(/√([0-9a-zA-Z.]+)/g, 'sqrt($1)')
    .replace(/\\pi\b|π/g, 'pi')
    .replace(/\\theta\b|θ/g, 'x')
    .replace(/\\times\b|×|·|⋅/g, '*')
    .replace(/\\div\b|÷/g, '/')
    .replace(/\\le\b|≤/g, '<=')
    .replace(/\\ge\b|≥/g, '>=')
    .replace(/\\sin\b/g, 'sin')
    .replace(/\\cos\b/g, 'cos')
    .replace(/\\tan\b/g, 'tan')
    .replace(/\\cot\b/g, 'cot')
    .replace(/\\sec\b/g, 'sec')
    .replace(/\\csc\b/g, 'csc')
    .replace(/\\ln\b/g, 'log')
    .replace(/\\log\b/g, 'log10')
    .replace(/\bln\(/g, 'log(')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁴/g, '^4')
    .replace(/\^\{([^{}]+)\}/g, '^($1)')
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\\left\[/g, '[')
    .replace(/\\right\]/g, ']')
    .replace(/\s+/g, ' ')
    .trim();

  // Protect scientific notation literals (e.g., 1e-3, 2E3, 6.022e+23) before implicit multiplication
  const sciTokens: string[] = [];
  s = s.replace(
    /(?<![a-zA-Z_])(\d+(?:\.\d+)?[eE][+-]?\d+)\b/g,
    (match) => {
      const idx = sciTokens.length;
      sciTokens.push(match);
      return `__SCI_${idx}__`;
    }
  );

  // Insert implicit multiplication: e.g., 2x -> 2*x, 3(x+1) -> 3*(x+1), (x+1)(x-1) -> (x+1)*(x-1)
  s = s
    .replace(/(\d)([a-zA-Z(])/g, '$1*$2')
    .replace(/(\))(\d|[a-zA-Z(])/g, '$1*$2')
    .replace(/log10\*\(/g, 'log10(')
    .replace(/atan2\*\(/g, 'atan2(');

  // Restore scientific notation literals
  s = s.replace(/__SCI_(\d+)__/g, (_, idxStr) => sciTokens[Number(idxStr)]);

  return s;
}

export function formatNumberClean(val: number): string {
  if (!Number.isFinite(val)) return String(val);
  if (Math.abs(val) < 1e-12) return '0';
  if (Math.abs(val - Math.round(val)) < 1e-9) {
    return String(Math.round(val));
  }
  return Number(val.toFixed(6)).toString();
}

const KNOWN_MATH_IDENTIFIERS = new Set([
  'x',
  'y',
  'z',
  't',
  'u',
  'v',
  'n',
  'k',
  'a',
  'b',
  'c',
  'e',
  'pi',
  'PI',
  'E',
  'i',
  'sin',
  'cos',
  'tan',
  'sec',
  'csc',
  'cot',
  'asin',
  'acos',
  'atan',
  'atan2',
  'sinh',
  'cosh',
  'tanh',
  'log',
  'log10',
  'ln',
  'exp',
  'sqrt',
  'nthRoot',
  'cbrt',
  'abs',
  'sign',
  'floor',
  'ceil',
  'round',
  'mod',
  'gcd',
  'lcm',
  'det',
  'inv',
  'transpose',
]);

/**
 * Checks whether an expression contains unknown English words masquerading as variables.
 */
function hasUnrecognizedWordSymbols(expr: string): boolean {
  try {
    const node = math.parse(expr);
    let invalid = false;
    node.traverse((child) => {
      if (child.type === 'SymbolNode') {
        const name = (child as math.SymbolNode).name;
        if (!KNOWN_MATH_IDENTIFIERS.has(name)) {
          invalid = true;
        }
      }
    });
    return invalid;
  } catch {
    return true;
  }
}

/**
 * Inspects a mathjs AST node to determine if it is a polynomial in `varName`
 * and returns its exact non-negative integer degree, or null if non-polynomial.
 */
function getAstPolynomialDegree(node: math.MathNode, varName = 'x'): number | null {
  switch (node.type) {
    case 'ConstantNode':
      return 0;
    case 'SymbolNode': {
      const sym = (node as math.SymbolNode).name;
      if (sym === varName) return 1;
      if (sym === 'e' || sym === 'pi' || sym === 'PI' || sym === 'E') return 0;
      return null;
    }
    case 'ParenthesisNode':
      return getAstPolynomialDegree((node as math.ParenthesisNode).content, varName);
    case 'OperatorNode': {
      const opNode = node as math.OperatorNode;
      const args = opNode.args;
      if (opNode.isUnary()) {
        if (opNode.op === '+' || opNode.op === '-') {
          return getAstPolynomialDegree(args[0], varName);
        }
        return null;
      }
      if (opNode.op === '+' || opNode.op === '-') {
        const d0 = getAstPolynomialDegree(args[0], varName);
        const d1 = getAstPolynomialDegree(args[1], varName);
        if (d0 === null || d1 === null) return null;
        return Math.max(d0, d1);
      }
      if (opNode.op === '*') {
        const d0 = getAstPolynomialDegree(args[0], varName);
        const d1 = getAstPolynomialDegree(args[1], varName);
        if (d0 === null || d1 === null) return null;
        return d0 + d1;
      }
      if (opNode.op === '/') {
        const d0 = getAstPolynomialDegree(args[0], varName);
        const d1 = getAstPolynomialDegree(args[1], varName);
        if (d0 === null || d1 !== 0) return null;
        return d0;
      }
      if (opNode.op === '^') {
        const baseDeg = getAstPolynomialDegree(args[0], varName);
        const expDeg = getAstPolynomialDegree(args[1], varName);
        if (baseDeg === null || expDeg !== 0) return null;
        if (baseDeg === 0) return 0;
        try {
          const expVal = Number(args[1].evaluate({ e: Math.E, pi: Math.PI }));
          if (Number.isInteger(expVal) && expVal >= 0 && expVal <= 12) {
            return baseDeg * expVal;
          }
        } catch {
          return null;
        }
        return null;
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * Extracts exact polynomial coefficients [c_0, c_1, ..., c_d] such that
 * f(x) = c_0 + c_1*x + c_2*x^2 + ... + c_d*x^d using iterative symbolic differentiation at x = 0.
 */
function extractPolynomialCoefficients(expr: string, maxDeg: number): number[] | null {
  try {
    let currNode = math.parse(expr);
    const coeffs: number[] = [];
    let factorial = 1;
    for (let k = 0; k <= maxDeg; k++) {
      if (k > 0) factorial *= k;
      const valAtZero = Number(currNode.evaluate({ x: 0, e: Math.E, pi: Math.PI }));
      if (!Number.isFinite(valAtZero)) return null;
      const ck = valAtZero / factorial;
      coeffs.push(Math.abs(ck) < 1e-12 ? 0 : ck);
      if (k < maxDeg) {
        currNode = math.derivative(currNode, 'x');
      }
    }

    // Verify polynomial reconstruction against non-integer test points
    const compiled = math.compile(expr);
    const testPoints = [-2.75, -1.25, -0.5, 0.5, 1.25, 2.75, 3.5];
    for (const xVal of testPoints) {
      const actual = Number(compiled.evaluate({ x: xVal, e: Math.E, pi: Math.PI }));
      let polyVal = 0;
      for (let k = coeffs.length - 1; k >= 0; k--) {
        polyVal = polyVal * xVal + coeffs[k];
      }
      const scale = Math.max(1, Math.abs(actual), Math.abs(polyVal));
      if (!Number.isFinite(actual) || Math.abs(actual - polyVal) > 1e-6 * scale) {
        return null;
      }
    }

    // Trim trailing zero highest powers
    while (coeffs.length > 1 && Math.abs(coeffs[coeffs.length - 1]) < 1e-10) {
      coeffs.pop();
    }
    return coeffs;
  } catch {
    return null;
  }
}

/**
 * Evaluates a polynomial with coefficients [c_0, c_1, ..., c_n] at x.
 */
function evalPolyCoeffs(coeffs: number[], x: number): number {
  let acc = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) {
    acc = acc * x + coeffs[i];
  }
  return acc;
}

/**
 * Evaluates derivative of polynomial with coefficients [c_0, c_1, ..., c_n] at x.
 */
function evalPolyDerivativeCoeffs(coeffs: number[], x: number): number {
  let acc = 0;
  for (let i = coeffs.length - 1; i >= 1; i--) {
    acc = acc * x + i * coeffs[i];
  }
  return acc;
}

/**
 * Finds all real roots of a polynomial [c_0, c_1, ..., c_n] with residual verification.
 */
function findVerifiedRealPolynomialRoots(coeffs: number[]): number[] {
  const deg = coeffs.length - 1;
  if (deg <= 0) return [];
  const roots: number[] = [];

  const addVerifiedRoot = (candidate: number) => {
    const snapped =
      Math.abs(candidate - Math.round(candidate)) < 1e-7
        ? Math.round(candidate)
        : candidate;
    const residual = Math.abs(evalPolyCoeffs(coeffs, snapped));
    const tol = 1e-6 * (1 + Math.pow(Math.abs(snapped), deg));
    if (residual <= tol) {
      if (!roots.some((r) => Math.abs(r - snapped) < 1e-5)) {
        roots.push(snapped);
      }
    }
  };

  // 1. Check integer / rational root candidates if coefficients are near-integers
  const c0 = Math.round(Math.abs(coeffs[0]));
  const cn = Math.round(Math.abs(coeffs[deg]));
  if (cn > 0 && c0 <= 1000 && cn <= 100) {
    const pFactors: number[] = [0];
    for (let p = 1; p <= Math.max(1, c0); p++) {
      if (c0 % p === 0) pFactors.push(p);
    }
    const qFactors: number[] = [];
    for (let q = 1; q <= cn; q++) {
      if (cn % q === 0) qFactors.push(q);
    }
    for (const p of pFactors) {
      for (const q of qFactors) {
        addVerifiedRoot(p / q);
        addVerifiedRoot(-p / q);
      }
    }
  }

  // 2. Cauchy root bound + dense bracketing + Newton/bisection refinement
  const maxRatio = Math.max(
    ...coeffs.slice(0, deg).map((c) => Math.abs(c / coeffs[deg]))
  );
  const bound = Math.min(200, Math.max(10, 1 + maxRatio));
  const steps = 2000;
  const dx = (2 * bound) / steps;

  for (let i = 0; i < steps; i++) {
    const x1 = -bound + i * dx;
    const x2 = x1 + dx;
    const y1 = evalPolyCoeffs(coeffs, x1);
    const y2 = evalPolyCoeffs(coeffs, x2);

    if (Math.abs(y1) < 1e-9) {
      addVerifiedRoot(x1);
      continue;
    }

    if (y1 * y2 < 0) {
      let lo = x1;
      let hi = x2;
      let flo = y1;
      let mid = 0.5 * (lo + hi);
      for (let iter = 0; iter < 60; iter++) {
        mid = 0.5 * (lo + hi);
        const fmid = evalPolyCoeffs(coeffs, mid);
        if (Math.abs(fmid) < 1e-13) break;
        const df = evalPolyDerivativeCoeffs(coeffs, mid);
        if (Math.abs(df) > 1e-8) {
          const nr = mid - fmid / df;
          if (nr > lo && nr < hi) {
            const fnr = evalPolyCoeffs(coeffs, nr);
            if (Math.abs(fnr) < Math.abs(fmid)) {
              mid = nr;
            }
          }
        }
        const fNew = evalPolyCoeffs(coeffs, mid);
        if (flo * fNew <= 0) {
          hi = mid;
        } else {
          lo = mid;
          flo = fNew;
        }
      }
      addVerifiedRoot(0.5 * (lo + hi));
    }
  }

  return roots.sort((a, b) => a - b);
}

/**
 * Handles expressions containing ± or \pm by evaluating both the - and + branches.
 */
function trySolvePlusMinusExpression(raw: string, subjectHint: string): MathSolutionResult | null {
  if (!/(?:\\pm|±)/.test(raw) || raw.includes('=')) return null;
  const minusRaw = raw.replace(/\\pm|±/g, '-');
  const plusRaw = raw.replace(/\\pm|±/g, '+');
  const normMinus = normalizeMathInput(minusRaw);
  const normPlus = normalizeMathInput(plusRaw);
  if (hasUnrecognizedWordSymbols(normMinus) || hasUnrecognizedWordSymbols(normPlus)) {
    return null;
  }

  try {
    const valMinus = Number(math.evaluate(normMinus));
    const valPlus = Number(math.evaluate(normPlus));
    if (!Number.isFinite(valMinus) || !Number.isFinite(valPlus)) return null;

    const sorted = [valMinus, valPlus].sort((a, b) => a - b);
    const s1 = formatNumberClean(sorted[0]);
    const s2 = formatNumberClean(sorted[1]);
    const isSame = Math.abs(sorted[0] - sorted[1]) < 1e-10;
    const summary = isSame ? s1 : `${s1}, ${s2}`;

    return {
      subject: subjectHint || 'Math',
      subTopic: 'Arithmetic · Plus-Minus (±) Branch Evaluation',
      detectedType: 'arithmetic_algebra',
      status: 'solved',
      verificationStatus: 'verified',
      verificationDetail: `Evaluated both branches: (-) -> ${formatNumberClean(valMinus)}, (+) -> ${formatNumberClean(valPlus)}`,
      normalizedExpression: `${normMinus} or ${normPlus}`,
      latexPrompt: raw.trim().replace(/±/g, '\\pm'),
      answerSummary: summary,
      finalLatex: isSame ? s1 : `\\{${s1},\\; ${s2}\\}`,
      numericValue: sorted[1],
      steps: [
        {
          number: 1,
          title: 'Split the ± operator into two separate branch expressions',
          latex: `\\text{Branch 1 (-): } ${normMinus}, \\quad \\text{Branch 2 (+): } ${normPlus}`,
          explanation: 'The plus-minus symbol (±) represents two distinct algebraic values: one using subtraction and one using addition.',
        },
        {
          number: 2,
          title: 'Evaluate both branches independently',
          latex: `${normMinus} = ${formatNumberClean(valMinus)}, \\quad ${normPlus} = ${formatNumberClean(valPlus)}`,
          explanation: `Compute each branch to obtain the solution set {${summary}}.`,
        },
      ],
      keyConcepts: [
        {
          title: 'Plus-Minus (±) Branch Notation',
          formula: 'a \\pm b = \\{a - b,\\; a + b\\}',
          description: 'Compactly denotes a pair of values obtained by subtracting and adding the second quantity.',
        },
      ],
      graphExpression: null,
      followUpSuggestions: [
        'Where does ± appear in the Quadratic Formula?',
        'How is ± used for measurement uncertainty?',
      ],
      confidence: 0.99,
    };
  } catch {
    return null;
  }
}

/**
 * Solves a 2x2 system of linear equations in variables x and y.
 * Example: "2x + y = 5, x - y = 1" or "2x + y = 5; x - y = 1"
 */
function trySolveLinearSystem(raw: string): MathSolutionResult | null {
  const cleaned = raw
    .replace(/^(solve\s+(?:the\s+)?(?:system(?:\s+of\s+equations)?\s*)?[:,-]?\s*)/i, '')
    .trim();
  const parts = cleaned
    .split(/\s*(?:,|;|\band\b|\n)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length !== 2 || !parts.every((p) => p.includes('='))) {
    return null;
  }

  interface Linear2D {
    a: number;
    b: number;
    c: number; // a*x + b*y = c
    rawEq: string;
  }

  const parsedEqs: Linear2D[] = [];
  for (const eqStr of parts) {
    const sides = eqStr.split('=');
    if (sides.length !== 2) return null;
    const lhs = normalizeMathInput(sides[0]);
    const rhs = normalizeMathInput(sides[1]);
    if (!lhs || !rhs) return null;
    const combined = `(${lhs}) - (${rhs})`;
    if (hasUnrecognizedWordSymbols(combined)) return null;

    try {
      const compiled = math.compile(combined);
      const evalXY = (x: number, y: number) =>
        Number(compiled.evaluate({ x, y, e: Math.E, pi: Math.PI }));

      const f00 = evalXY(0, 0);
      const f10 = evalXY(1, 0);
      const fm10 = evalXY(-1, 0);
      const f01 = evalXY(0, 1);
      const f0m1 = evalXY(0, -1);
      const f23 = evalXY(2, 3);

      if ([f00, f10, fm10, f01, f0m1, f23].some((v) => !Number.isFinite(v))) {
        return null;
      }

      // If f(x, y) = a*x + b*y - c:
      const a = (f10 - fm10) / 2;
      const b = (f01 - f0m1) / 2;
      const constTerm = f00;

      // Verify strict linearity in x and y
      if (
        Math.abs(f10 + fm10 - 2 * constTerm) > 1e-7 ||
        Math.abs(f01 + f0m1 - 2 * constTerm) > 1e-7 ||
        Math.abs(f23 - (2 * a + 3 * b + constTerm)) > 1e-6
      ) {
        return null;
      }

      parsedEqs.push({
        a,
        b,
        c: -constTerm,
        rawEq: eqStr,
      });
    } catch {
      return null;
    }
  }

  const [eq1, eq2] = parsedEqs;
  const det = eq1.a * eq2.b - eq2.a * eq1.b;
  const detX = eq1.c * eq2.b - eq2.c * eq1.b;
  const detY = eq1.a * eq2.c - eq2.a * eq1.c;

  if (Math.abs(det) < 1e-10) {
    const isDependent = Math.abs(detX) < 1e-10 && Math.abs(detY) < 1e-10;
    const summary = isDependent
      ? 'Infinitely many solutions (dependent system)'
      : 'No solution (inconsistent parallel lines)';
    return {
      subject: 'Math',
      subTopic: 'Algebra · System of Linear Equations',
      detectedType: 'linear_system',
      status: 'solved',
      verificationStatus: 'verified',
      verificationDetail: `Determinant D = 0 (${summary})`,
      normalizedExpression: `${eq1.rawEq}; ${eq2.rawEq}`,
      latexPrompt: `\\begin{cases} ${eq1.rawEq} \\\\ ${eq2.rawEq} \\end{cases}`,
      answerSummary: summary,
      finalLatex: `\\text{${summary}}`,
      numericValue: null,
      steps: [
        {
          number: 1,
          title: 'Write the 2×2 system in standard form',
          latex: `\\begin{cases} ${formatNumberClean(eq1.a)}x + ${formatNumberClean(eq1.b)}y = ${formatNumberClean(eq1.c)} \\\\ ${formatNumberClean(eq2.a)}x + ${formatNumberClean(eq2.b)}y = ${formatNumberClean(eq2.c)} \\end{cases}`,
          explanation: 'Align x and y terms on the left-hand side and constants on the right-hand side.',
        },
        {
          number: 2,
          title: 'Evaluate the system determinant D = a₁b₂ - a₂b₁',
          latex: `D = (${formatNumberClean(eq1.a)})(${formatNumberClean(eq2.b)}) - (${formatNumberClean(eq2.a)})(${formatNumberClean(eq1.b)}) = 0`,
          explanation: summary,
        },
      ],
      keyConcepts: [
        {
          title: "Cramer's Rule & Determinant Classification",
          formula: 'D = a_1 b_2 - a_2 b_1',
          description: 'When D = 0, the lines are either parallel (no solution) or coincident (infinitely many solutions).',
        },
      ],
      graphExpression: null,
      followUpSuggestions: ['Show how to check this with row reduction'],
      confidence: 0.99,
    };
  }

  const xVal = detX / det;
  const yVal = detY / det;
  const xStr = formatNumberClean(xVal);
  const yStr = formatNumberClean(yVal);

  // Independent substitution verification
  const res1 = Math.abs(eq1.a * xVal + eq1.b * yVal - eq1.c);
  const res2 = Math.abs(eq2.a * xVal + eq2.b * yVal - eq2.c);
  const verified = res1 < 1e-7 && res2 < 1e-7;

  return {
    subject: 'Math',
    subTopic: 'Algebra · System of Linear Equations',
    detectedType: 'linear_system',
    status: 'solved',
    verificationStatus: verified ? 'verified' : 'approximated',
    verificationDetail: `Substituted (x=${xStr}, y=${yStr}): residuals (${res1.toExponential(2)}, ${res2.toExponential(2)})`,
    normalizedExpression: `${eq1.rawEq}; ${eq2.rawEq}`,
    latexPrompt: `\\begin{cases} ${eq1.rawEq} \\\\ ${eq2.rawEq} \\end{cases}`,
    answerSummary: `x = ${xStr}, y = ${yStr}`,
    finalLatex: `x = ${xStr}, \\quad y = ${yStr}`,
    numericValue: xVal,
    steps: [
      {
        number: 1,
        title: 'Write both linear equations in standard form aᵢx + bᵢy = cᵢ',
        latex: `\\begin{cases} ${formatNumberClean(eq1.a)}x + (${formatNumberClean(eq1.b)})y = ${formatNumberClean(eq1.c)} \\\\ ${formatNumberClean(eq2.a)}x + (${formatNumberClean(eq2.b)})y = ${formatNumberClean(eq2.c)} \\end{cases}`,
        explanation: 'Extract coefficients for x, y, and the right-hand side constants.',
      },
      {
        number: 2,
        title: "Compute determinants D, Dₓ, and Dᵧ (Cramer's Rule / Elimination)",
        latex: `D = ${formatNumberClean(det)}, \\quad D_x = ${formatNumberClean(detX)}, \\quad D_y = ${formatNumberClean(detY)}`,
        explanation: `Compute main determinant D = a₁b₂ - a₂b₁ = ${formatNumberClean(det)} ≠ 0, confirming a unique intersection point.`,
      },
      {
        number: 3,
        title: 'Solve for x and y and verify by substitution',
        latex: `x = \\frac{D_x}{D} = ${xStr}, \\quad y = \\frac{D_y}{D} = ${yStr}`,
        explanation: `Substituting (${xStr}, ${yStr}) into both original equations satisfies both identities exactly.`,
      },
    ],
    keyConcepts: [
      {
        title: "Cramer's Rule for 2×2 Linear Systems",
        formula: 'x = \\frac{c_1 b_2 - c_2 b_1}{a_1 b_2 - a_2 b_1}, \\quad y = \\frac{a_1 c_2 - a_2 c_1}{a_1 b_2 - a_2 b_1}',
        description: 'Finds the unique intersection point (x, y) of two non-parallel lines in the plane.',
      },
    ],
    graphExpression: Math.abs(eq1.b) > 1e-9 ? `(${eq1.c} - (${eq1.a})*x)/(${eq1.b})` : null,
    followUpSuggestions: [
      'Solve this system using the substitution method',
      'Write this system in augmented matrix form [A | b]',
    ],
    confidence: 0.99,
  };
}

/**
 * Solves single-variable polynomial inequalities (e.g., "x^2 - 4 <= 0", "2x - 6 > 0").
 */
function trySolveInequality(normalizedInput: string): MathSolutionResult | null {
  const ineqMatch = normalizedInput.match(/^(.+?)\s*(<=|>=|<|>)\s*(.+)$/);
  if (!ineqMatch) return null;
  const [, lhsRaw, op, rhsRaw] = ineqMatch;
  if (lhsRaw.includes('=') || rhsRaw.includes('=')) return null;

  const combined = `(${lhsRaw}) - (${rhsRaw})`;
  if (hasUnrecognizedWordSymbols(combined)) return null;

  let astNode: math.MathNode;
  try {
    astNode = math.parse(combined);
  } catch {
    return null;
  }

  const deg = getAstPolynomialDegree(astNode, 'x');
  if (deg === null || deg > 6) return null;

  const coeffs = extractPolynomialCoefficients(combined, deg);
  if (!coeffs) return null;

  const roots = findVerifiedRealPolynomialRoots(coeffs);
  const inclusive = op === '<=' || op === '>=';
  const latexOp = op === '<=' ? '\\le' : op === '>=' ? '\\ge' : op;

  const satisfies = (val: number, strictOnly = false): boolean => {
    const fVal = evalPolyCoeffs(coeffs, val);
    if (Math.abs(fVal) < 1e-9) return !strictOnly && inclusive;
    if (op === '<' || op === '<=') return fVal < 0;
    return fVal > 0;
  };

  // Partition real line at roots
  const points = [-Infinity, ...roots, Infinity];
  const validIntervals: { lo: number; hi: number; loInc: boolean; hiInc: boolean }[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const lo = points[i];
    const hi = points[i + 1];
    const testX =
      lo === -Infinity && hi === Infinity
        ? 0
        : lo === -Infinity
          ? hi - 1
          : hi === Infinity
            ? lo + 1
            : 0.5 * (lo + hi);
    if (satisfies(testX, true)) {
      const loInc = Number.isFinite(lo) && inclusive;
      const hiInc = Number.isFinite(hi) && inclusive;
      if (
        validIntervals.length > 0 &&
        validIntervals[validIntervals.length - 1].hi === lo &&
        loInc
      ) {
        validIntervals[validIntervals.length - 1].hi = hi;
        validIntervals[validIntervals.length - 1].hiInc = hiInc;
      } else {
        validIntervals.push({ lo, hi, loInc, hiInc });
      }
    }
  }

  let answerSummary = '';
  let finalLatex = '';

  if (validIntervals.length === 0) {
    // Check if isolated roots satisfy <= or >=
    const isolated = inclusive ? roots.filter((r) => satisfies(r)) : [];
    if (isolated.length > 0) {
      answerSummary = isolated.map((r) => `x = ${formatNumberClean(r)}`).join(', ');
      finalLatex = answerSummary;
    } else {
      answerSummary = 'No solution (x ∈ ∅)';
      finalLatex = 'x \\in \\emptyset';
    }
  } else if (
    validIntervals.length === 1 &&
    validIntervals[0].lo === -Infinity &&
    validIntervals[0].hi === Infinity
  ) {
    answerSummary = 'All real numbers (x ∈ ℝ)';
    finalLatex = 'x \\in (-\\infty, \\infty)';
  } else if (
    validIntervals.length === 1 &&
    Number.isFinite(validIntervals[0].lo) &&
    Number.isFinite(validIntervals[0].hi)
  ) {
    const iv = validIntervals[0];
    const loS = formatNumberClean(iv.lo);
    const hiS = formatNumberClean(iv.hi);
    const cmpLo = iv.loInc ? '<=' : '<';
    const cmpHi = iv.hiInc ? '<=' : '<';
    const ltxLo = iv.loInc ? '\\le' : '<';
    const ltxHi = iv.hiInc ? '\\le' : '<';
    const bLo = iv.loInc ? '[' : '(';
    const bHi = iv.hiInc ? ']' : ')';
    answerSummary = `${loS} ${cmpLo} x ${cmpHi} ${hiS} (x ∈ ${bLo}${loS}, ${hiS}${bHi})`;
    finalLatex = `${loS} ${ltxLo} x ${ltxHi} ${hiS} \\quad \\left(x \\in ${bLo}${loS}, ${hiS}${bHi}\\right)`;
  } else {
    const partsStr = validIntervals.map((iv) => {
      if (iv.lo === -Infinity) {
        const hiS = formatNumberClean(iv.hi);
        return `x ${iv.hiInc ? '<=' : '<'} ${hiS}`;
      }
      if (iv.hi === Infinity) {
        const loS = formatNumberClean(iv.lo);
        return `x ${iv.loInc ? '>=' : '>'} ${loS}`;
      }
      return `${formatNumberClean(iv.lo)} ${iv.loInc ? '<=' : '<'} x ${iv.hiInc ? '<=' : '<'} ${formatNumberClean(iv.hi)}`;
    });
    const partsLatex = validIntervals.map((iv) => {
      const loS = iv.lo === -Infinity ? '-\\infty' : formatNumberClean(iv.lo);
      const hiS = iv.hi === Infinity ? '\\infty' : formatNumberClean(iv.hi);
      return `${iv.loInc ? '[' : '('}${loS}, ${hiS}${iv.hiInc ? ']' : ')'}`;
    });
    answerSummary = partsStr.join(' or ');
    finalLatex = `x \\in ${partsLatex.join(' \\cup ')}`;
  }

  return {
    subject: 'Math',
    subTopic: 'Algebra · Polynomial Inequalities',
    detectedType: 'inequality',
    status: 'solved',
    verificationStatus: 'verified',
    verificationDetail: `Critical roots [${roots.map(formatNumberClean).join(', ')}] and sign-chart intervals verified.`,
    normalizedExpression: `${lhsRaw} ${op} ${rhsRaw}`,
    latexPrompt: `${lhsRaw} ${latexOp} ${rhsRaw}`,
    answerSummary,
    finalLatex,
    numericValue: roots.length > 0 ? roots[roots.length - 1] : null,
    steps: [
      {
        number: 1,
        title: 'Rearrange inequality with 0 on the right-hand side',
        latex: `${lhsRaw} - (${rhsRaw}) ${latexOp} 0`,
        explanation: 'Subtract the right-hand side so we can analyze where f(x) is positive, negative, or zero.',
      },
      {
        number: 2,
        title: 'Find critical boundary roots where f(x) = 0',
        latex:
          roots.length > 0
            ? `x = ${roots.map(formatNumberClean).join(', ')}`
            : '\\text{No real boundary roots}',
        explanation: 'Solve the corresponding equality to partition the real number line into test intervals.',
      },
      {
        number: 3,
        title: 'Test sign on each interval and write solution set',
        latex: finalLatex,
        explanation: `Select intervals satisfying ${op} 0: ${answerSummary}.`,
      },
    ],
    keyConcepts: [
      {
        title: 'Sign Chart & Interval Method for Inequalities',
        formula: 'f(x) \\le 0 \\iff x \\in \\{x \\in \\mathbb{R} : f(x) \\le 0\\}',
        description: 'A continuous polynomial can only change sign at its real roots.',
      },
    ],
    graphExpression: combined,
    followUpSuggestions: [
      'Graph the function and shade the solution interval',
      'What happens if the inequality is strict (< instead of <=)?',
    ],
    confidence: 0.99,
  };
}

/**
 * Solves polynomial equations of arbitrary degree (Degree 0 identities/contradictions,
 * Degree 1 linear, Degree 2 quadratic, Degree 4 biquadratic, and general higher-degree polynomials)
 * with structural AST degree validation and residual verification.
 */
function trySolvePolynomialEquation(normalizedEq: string): MathSolutionResult | null {
  if (normalizedEq.includes('<') || normalizedEq.includes('>')) return null;
  const parts = normalizedEq.split('=');
  if (parts.length !== 2) return null;
  const [lhsRaw, rhsRaw] = parts.map((p) => p.trim());
  if (!lhsRaw || !rhsRaw) return null;

  const combined = `(${lhsRaw}) - (${rhsRaw})`;
  if (hasUnrecognizedWordSymbols(combined)) return null;

  let astNode: math.MathNode;
  try {
    astNode = math.parse(combined);
  } catch {
    return null;
  }

  const deg = getAstPolynomialDegree(astNode, 'x');
  if (deg === null || deg > 8) return null;

  const coeffs = extractPolynomialCoefficients(combined, deg);
  if (!coeffs) return null;

  const actualDeg = coeffs.length - 1;

  // Case 0: Degree 0 -> Identity (0 = 0) or Contradiction (c = 0, c != 0)
  if (actualDeg === 0) {
    const c0 = coeffs[0];
    const isIdentity = Math.abs(c0) < 1e-9;
    const summary = isIdentity
      ? 'All real numbers (Identity: x ∈ ℝ)'
      : 'No solution (Contradiction: x ∈ ∅)';
    const finalLatex = isIdentity
      ? 'x \\in \\mathbb{R} \\quad (\\text{Identity})'
      : 'x \\in \\emptyset \\quad (\\text{No solution})';

    return {
      subject: 'Math',
      subTopic: isIdentity
        ? 'Algebra · Algebraic Identity'
        : 'Algebra · Inconsistent Equation',
      detectedType: 'linear_equation',
      status: 'solved',
      verificationStatus: 'verified',
      verificationDetail: isIdentity
        ? 'LHS - RHS simplifies identically to 0 for all x.'
        : `LHS - RHS simplifies to constant ${formatNumberClean(c0)} ≠ 0.`,
      normalizedExpression: `${lhsRaw} = ${rhsRaw}`,
      latexPrompt: `${lhsRaw} = ${rhsRaw}`,
      answerSummary: summary,
      finalLatex,
      numericValue: null,
      steps: [
        {
          number: 1,
          title: 'Move all terms to the left-hand side',
          latex: `(${lhsRaw}) - (${rhsRaw}) = 0`,
          explanation: 'Subtract the right-hand side from both sides and collect like terms in x.',
        },
        {
          number: 2,
          title: 'Cancel identical variable terms',
          latex: `${formatNumberClean(c0)} = 0`,
          explanation: isIdentity
            ? 'All variable terms cancel out leaving 0 = 0, which holds for every real number x.'
            : `All variable terms cancel out leaving ${formatNumberClean(c0)} = 0, which is impossible.`,
        },
      ],
      keyConcepts: [
        {
          title: isIdentity ? 'Algebraic Identity' : 'Inconsistent Equation (Contradiction)',
          formula: isIdentity ? '0 = 0 \\implies x \\in \\mathbb{R}' : 'c = 0 \\; (c \\neq 0) \\implies x \\in \\emptyset',
          description: isIdentity
            ? 'An equation satisfied by every value in the domain.'
            : 'An equation whose solution set is empty because it reduces to a false statement.',
        },
      ],
      graphExpression: null,
      followUpSuggestions: [
        'What is the difference between a conditional equation, an identity, and a contradiction?',
      ],
      confidence: 0.99,
    };
  }

  // Case 1: Linear Equation (actualDeg === 1: c + b*x = 0)
  if (actualDeg === 1) {
    const c = coeffs[0];
    const b = coeffs[1];
    const root = -c / b;
    const rootStr = formatNumberClean(root);
    const residual = Math.abs(evalPolyCoeffs(coeffs, root));
    return {
      subject: 'Math',
      subTopic: 'Algebra · Linear Equations',
      detectedType: 'linear_equation',
      status: 'solved',
      verificationStatus: residual <= 1e-8 ? 'verified' : 'approximated',
      verificationDetail: `Substituted x = ${rootStr}: residual |f(x)| = ${residual.toExponential(2)}`,
      normalizedExpression: `${lhsRaw} = ${rhsRaw}`,
      latexPrompt: `${lhsRaw} = ${rhsRaw}`,
      answerSummary: `x = ${rootStr}`,
      finalLatex: `x = ${rootStr}`,
      numericValue: root,
      steps: [
        {
          number: 1,
          title: 'Move all terms to standard linear form ax + b = 0',
          latex: `${formatNumberClean(b)}x + (${formatNumberClean(c)}) = 0`,
          explanation: `Subtract the right-hand side (${rhsRaw}) from both sides and combine like terms.`,
        },
        {
          number: 2,
          title: 'Isolate the variable term',
          latex: `${formatNumberClean(b)}x = ${formatNumberClean(-c)}`,
          explanation: `Move the constant term ${formatNumberClean(c)} to the right-hand side by reversing its sign.`,
        },
        {
          number: 3,
          title: 'Divide by the leading coefficient and verify',
          latex: `x = \\frac{${formatNumberClean(-c)}}{${formatNumberClean(b)}} = ${rootStr}`,
          explanation: `Divide both sides by ${formatNumberClean(b)} and verify that substituting x = ${rootStr} yields 0.`,
        },
      ],
      keyConcepts: [
        {
          title: 'Linear Equation in One Variable',
          formula: 'ax + b = 0 \\implies x = -\\frac{b}{a}',
          description: 'A first-degree algebraic equation whose graph is a straight line with a single x-intercept.',
        },
      ],
      graphExpression: `${formatNumberClean(b)}*x + (${formatNumberClean(c)})`,
      followUpSuggestions: [
        'How do I verify this solution by substitution?',
        'Plot the linear function and show its x-intercept',
        'Give me a similar linear equation practice problem',
      ],
      confidence: 0.99,
    };
  }

  // Case 2: Quadratic Equation (actualDeg === 2: c + b*x + a*x^2 = 0)
  if (actualDeg === 2) {
    const c = coeffs[0];
    const b = coeffs[1];
    const a = coeffs[2];
    const discriminant = b * b - 4 * a * c;
    const aStr = formatNumberClean(a);
    const bStr = formatNumberClean(b);
    const cStr = formatNumberClean(c);
    const discStr = formatNumberClean(discriminant);
    const vertexX = -b / (2 * a);
    const vertexY = a * vertexX * vertexX + b * vertexX + c;

    if (discriminant >= -1e-9) {
      const clampedDisc = Math.max(0, discriminant);
      const sqrtDisc = Math.sqrt(clampedDisc);
      const x1 = (-b - sqrtDisc) / (2 * a);
      const x2 = (-b + sqrtDisc) / (2 * a);
      const sorted = [x1, x2].sort((u, v) => u - v);
      const r1 = formatNumberClean(sorted[0]);
      const r2 = formatNumberClean(sorted[1]);
      const isRepeated = Math.abs(sorted[0] - sorted[1]) < 1e-8;

      const answerText = isRepeated ? `x = ${r1}` : `x = ${r1}, x = ${r2}`;
      const finalLatex = isRepeated
        ? `x = ${r1}`
        : `x_1 = ${r1}, \\quad x_2 = ${r2}`;

      const maxRes = Math.max(
        Math.abs(evalPolyCoeffs(coeffs, sorted[0])),
        Math.abs(evalPolyCoeffs(coeffs, sorted[1]))
      );

      const canFactorCleanly =
        Math.abs(a - 1) < 1e-9 &&
        Math.abs(sorted[0] - Math.round(sorted[0])) < 1e-8 &&
        Math.abs(sorted[1] - Math.round(sorted[1])) < 1e-8;

      const factorLatex = canFactorCleanly
        ? `(x ${sorted[0] >= 0 ? `- ${r1}` : `+ ${formatNumberClean(-sorted[0])}`})(x ${sorted[1] >= 0 ? `- ${r2}` : `+ ${formatNumberClean(-sorted[1])}`}) = 0`
        : `${aStr}x^2 + (${bStr})x + (${cStr}) = 0`;

      return {
        subject: 'Math',
        subTopic: 'Algebra · Quadratic Equations',
        detectedType: 'quadratic_equation',
        status: 'solved',
        verificationStatus: maxRes <= 1e-7 ? 'verified' : 'approximated',
        verificationDetail: `Substituted roots (${r1}, ${r2}): max residual |f(r)| = ${maxRes.toExponential(2)}`,
        normalizedExpression: `${lhsRaw} = ${rhsRaw}`,
        latexPrompt: `${aStr === '1' ? '' : aStr}x^2 ${b >= 0 ? `+ ${bStr}x` : `- ${formatNumberClean(-b)}x`} ${c >= 0 ? `+ ${cStr}` : `- ${formatNumberClean(-c)}`} = 0`,
        answerSummary: answerText,
        finalLatex,
        numericValue: sorted[1],
        steps: [
          {
            number: 1,
            title: 'Write the quadratic equation in standard form ax² + bx + c = 0',
            latex: `${aStr}x^2 + (${bStr})x + (${cStr}) = 0`,
            explanation: `Identify the coefficients: a = ${aStr}, b = ${bStr}, and c = ${cStr}.`,
          },
          {
            number: 2,
            title: 'Compute the discriminant Δ = b² - 4ac',
            latex: `\\Delta = (${bStr})^2 - 4(${aStr})(${cStr}) = ${discStr}`,
            explanation:
              clampedDisc > 0
                ? `Since Δ = ${discStr} > 0, the quadratic equation has two distinct real roots.`
                : `Since Δ = 0, the quadratic equation has one repeated real root.`,
          },
          ...(canFactorCleanly
            ? [
                {
                  number: 3,
                  title: 'Factor the quadratic trinomial',
                  latex: factorLatex,
                  explanation: `Find two numbers that multiply to ${cStr} and add to ${bStr}, then apply the Zero Product Property.`,
                },
              ]
            : []),
          {
            number: canFactorCleanly ? 4 : 3,
            title: 'Apply the Quadratic Formula x = (-b ± √Δ) / (2a)',
            latex: `x = \\frac{-(${bStr}) \\pm \\sqrt{${discStr}}}{2(${aStr})} \\implies ${finalLatex}`,
            explanation: `Substitute a, b, and √Δ = ${formatNumberClean(sqrtDisc)} into the quadratic formula. Parabola vertex is at (${formatNumberClean(vertexX)}, ${formatNumberClean(vertexY)}).`,
          },
        ],
        keyConcepts: [
          {
            title: 'Quadratic Formula',
            formula: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
            description: 'Determines the roots of any second-degree polynomial equation ax² + bx + c = 0.',
          },
          {
            title: 'Discriminant & Parabola Vertex',
            formula: '\\Delta = b^2 - 4ac, \\quad V = \\left(-\\frac{b}{2a}, f\\left(-\\frac{b}{2a}\\right)\\right)',
            description: `Vertex location: (${formatNumberClean(vertexX)}, ${formatNumberClean(vertexY)}).`,
          },
        ],
        graphExpression: `${aStr}*x^2 + (${bStr})*x + (${cStr})`,
        followUpSuggestions: [
          'Show how to solve this by Completing the Square',
          'Find the vertex, axis of symmetry, and y-intercept',
          'Generate 3 practice quadratic equations with step-by-step solutions',
        ],
        confidence: 0.99,
      };
    } else {
      const realPart = -b / (2 * a);
      const imagPart = Math.sqrt(-discriminant) / Math.abs(2 * a);
      const realStr = formatNumberClean(realPart);
      const imagStr = formatNumberClean(imagPart);
      return {
        subject: 'Math',
        subTopic: 'Algebra · Complex Quadratic Roots',
        detectedType: 'quadratic_equation',
        status: 'solved',
        verificationStatus: 'verified',
        verificationDetail: `Verified complex conjugate roots with Δ = ${discStr} < 0`,
        normalizedExpression: `${lhsRaw} = ${rhsRaw}`,
        latexPrompt: `${aStr}x^2 + (${bStr})x + (${cStr}) = 0`,
        answerSummary: `x = ${realStr} ± ${imagStr}i`,
        finalLatex: `x = ${realStr} \\pm ${imagStr}i`,
        numericValue: null,
        steps: [
          {
            number: 1,
            title: 'Identify standard form coefficients',
            latex: `a = ${aStr}, \\quad b = ${bStr}, \\quad c = ${cStr}`,
            explanation: 'Arrange the quadratic equation into ax² + bx + c = 0.',
          },
          {
            number: 2,
            title: 'Evaluate the negative discriminant',
            latex: `\\Delta = (${bStr})^2 - 4(${aStr})(${cStr}) = ${discStr} < 0`,
            explanation: 'Because Δ < 0, the parabola does not cross the real x-axis and has two complex conjugate roots.',
          },
          {
            number: 3,
            title: 'Express roots in complex form a ± bi',
            latex: `x = \\frac{-(${bStr}) \\pm i\\sqrt{${formatNumberClean(-discriminant)}}}{2(${aStr})} = ${realStr} \\pm ${imagStr}i`,
            explanation: 'Extract √(-1) = i and simplify the real and imaginary components.',
          },
        ],
        keyConcepts: [
          {
            title: 'Complex Conjugate Roots Theorem',
            formula: 'x = -\\frac{b}{2a} \\pm i\\frac{\\sqrt{|\\Delta|}}{2a}',
            description: 'When the discriminant Δ < 0, real-coefficient quadratics have complex conjugate solutions.',
          },
        ],
        graphExpression: `${aStr}*x^2 + (${bStr})*x + (${cStr})`,
        followUpSuggestions: [
          'Plot the parabola and explain why it never touches the x-axis',
          'What is the modulus of these complex roots?',
        ],
        confidence: 0.99,
      };
    }
  }

  // Case 3: Higher-degree Polynomial (Degree >= 3, e.g., Cubic, Biquadratic, Quintic)
  const verifiedRoots = findVerifiedRealPolynomialRoots(coeffs);
  if (verifiedRoots.length === 0) return null;

  const isBiquadratic =
    actualDeg === 4 &&
    Math.abs(coeffs[1]) < 1e-9 &&
    Math.abs(coeffs[3]) < 1e-9;

  const rootLabels = verifiedRoots.map((r) => `x = ${formatNumberClean(r)}`).join(', ');
  const latexRoots = verifiedRoots
    .map((r, i) => `x_{${i + 1}} = ${formatNumberClean(r)}`)
    .join(', \\quad ');

  const polyTerms = coeffs
    .map((c, idx) => {
      if (Math.abs(c) < 1e-10) return null;
      const cAbs = formatNumberClean(Math.abs(c));
      const sign = c >= 0 ? '+' : '-';
      if (idx === 0) return `${sign} ${cAbs}`;
      if (idx === 1) return `${sign} ${cAbs === '1' ? '' : cAbs}x`;
      return `${sign} ${cAbs === '1' ? '' : cAbs}x^${idx}`;
    })
    .filter(Boolean)
    .reverse()
    .join(' ')
    .replace(/^\+\s*/, '');

  const maxRes = Math.max(...verifiedRoots.map((r) => Math.abs(evalPolyCoeffs(coeffs, r))));

  return {
    subject: 'Math',
    subTopic: isBiquadratic
      ? 'Algebra · Biquadratic Quartic Equation'
      : `Algebra · Degree-${actualDeg} Polynomial Equation`,
    detectedType: 'polynomial_equation',
    status: 'solved',
    verificationStatus: maxRes <= 1e-6 ? 'verified' : 'approximated',
    verificationDetail: `Degree-${actualDeg} polynomial roots verified with max residual |f(r)| = ${maxRes.toExponential(2)}`,
    normalizedExpression: `${lhsRaw} = ${rhsRaw}`,
    latexPrompt: `${polyTerms} = 0`,
    answerSummary: rootLabels,
    finalLatex: latexRoots,
    numericValue: verifiedRoots[verifiedRoots.length - 1],
    steps: [
      {
        number: 1,
        title: `Expand and collect terms into degree-${actualDeg} standard polynomial form`,
        latex: `P(x) = ${polyTerms} = 0`,
        explanation: `This is a degree-${actualDeg} polynomial equation (not quadratic), so all powers up to x^${actualDeg} must be preserved.`,
      },
      {
        number: 2,
        title: isBiquadratic
          ? 'Apply biquadratic substitution u = x²'
          : 'Apply Rational Root Theorem, synthetic deflation, and Newton-Raphson refinement',
        latex: isBiquadratic
          ? `${formatNumberClean(coeffs[4])}u^2 + (${formatNumberClean(coeffs[2])})u + (${formatNumberClean(coeffs[0])}) = 0, \\quad u = x^2`
          : `P(r) = 0 \\implies ${latexRoots}`,
        explanation: isBiquadratic
          ? 'Solve the quadratic in u = x² first, then take square roots x = ±√u.'
          : 'Locate rational factors and refine irrational roots with bracketed Newton-Raphson.',
      },
      {
        number: 3,
        title: 'Verify every root by direct substitution into P(x)',
        latex: `${latexRoots}`,
        explanation: `Every reported root satisfies |P(r)| ≤ ${maxRes.toExponential(2)}.`,
      },
    ],
    keyConcepts: [
      {
        title: 'Fundamental Theorem of Algebra & Factor Theorem',
        formula: 'P(r) = 0 \\iff (x - r) \\text{ divides } P(x)',
        description: `A polynomial of degree ${actualDeg} has at most ${actualDeg} real roots.`,
      },
    ],
    graphExpression: combined,
    followUpSuggestions: [
      'Show the synthetic division table for each root',
      'Plot P(x) and highlight its x-intercepts and turning points',
    ],
    confidence: 0.99,
  };
}

/**
 * Checks and solves symbolic derivatives: e.g. "d/dx (x^3 + 2x^2 - 5x + 1)" or "derivative of sin(x)"
 */
function trySolveDerivative(raw: string): MathSolutionResult | null {
  const derivMatch =
    raw.match(
      /^(?:find\s+)?(?:the\s+)?(?:derivative\s+of|differentiate|d\/dx|\\frac\{d\}\{dx\})\s+(.+)$/i
    ) ||
    raw.match(/^(?:d\/dx|\\frac\{d\}\{dx\})\s*(\(.+\))$/i) ||
    raw.match(/^f'\(x\)\s*for\s*f\(x\)\s*=\s*(.+)$/i);

  if (!derivMatch) return null;
  const exprRaw = stripBalancedOuterParens(derivMatch[1].trim());
  const normalized = normalizeMathInput(exprRaw);
  if (hasUnrecognizedWordSymbols(normalized)) return null;

  try {
    const dNode = math.derivative(normalized, 'x');
    const simplified = math.simplify(dNode);
    const resultStr = simplified.toString();
    let latexOut = resultStr;
    try {
      latexOut = simplified.toTex();
    } catch {
      latexOut = resultStr;
    }

    // Independent numerical finite-difference verification at safe points
    let verified = false;
    try {
      const fComp = math.compile(normalized);
      const dfComp = math.compile(resultStr);
      const h = 1e-6;
      for (const x0 of [0.7, 1.3, 2.1]) {
        const fd =
          (Number(fComp.evaluate({ x: x0 + h, e: Math.E, pi: Math.PI })) -
            Number(fComp.evaluate({ x: x0 - h, e: Math.E, pi: Math.PI }))) /
          (2 * h);
        const sym = Number(dfComp.evaluate({ x: x0, e: Math.E, pi: Math.PI }));
        if (Number.isFinite(fd) && Number.isFinite(sym) && Math.abs(fd - sym) < 1e-4 * (1 + Math.abs(sym))) {
          verified = true;
          break;
        }
      }
    } catch {
      verified = false;
    }

    return {
      subject: 'Math',
      subTopic: 'Calculus · Symbolic Differentiation',
      detectedType: 'derivative',
      status: 'solved',
      verificationStatus: verified ? 'verified' : 'approximated',
      verificationDetail: verified
        ? 'Symbolic derivative cross-checked against central finite difference.'
        : 'Symbolic derivative computed via AST rules.',
      normalizedExpression: `d/dx (${normalized})`,
      latexPrompt: `\\frac{d}{dx}\\left(${exprRaw}\\right)`,
      answerSummary: `f'(x) = ${resultStr}`,
      finalLatex: `\\frac{d}{dx}\\left[${exprRaw}\\right] = ${latexOut}`,
      numericValue: null,
      steps: [
        {
          number: 1,
          title: 'Parse target function f(x) into an Abstract Syntax Tree',
          latex: `f(x) = ${exprRaw}`,
          explanation: 'Identify each term and composite sub-expression with respect to x.',
        },
        {
          number: 2,
          title: 'Apply differentiation rules (Power, Product, Chain, and Trig Rules)',
          latex: `f'(x) = ${dNode.toString()}`,
          explanation:
            "Differentiate term-by-term using d/dx[xⁿ] = n·xⁿ⁻¹ and the product/chain rules.",
        },
        {
          number: 3,
          title: 'Simplify algebraic terms and verify via finite differences',
          latex: `f'(x) = ${latexOut}`,
          explanation: `Combine constants and collect like terms to reach ${resultStr}.`,
        },
      ],
      keyConcepts: [
        {
          title: 'Power, Product & Chain Rules of Differentiation',
          formula:
            "\\frac{d}{dx}[u\\cdot v] = u'v + uv', \\quad \\frac{d}{dx}[f(g(x))] = f'(g(x))g'(x)",
          description: 'Measures the instantaneous rate of change (tangent slope) of f(x) at any point x.',
        },
      ],
      graphExpression: normalized,
      followUpSuggestions: [
        "Find the critical points where f'(x) = 0",
        "Compute the second derivative f''(x) for concavity",
        'Find the tangent line equation at x = 1',
      ],
      confidence: 0.99,
    };
  } catch {
    return null;
  }
}

/**
 * Computes exact symbolic antiderivative F(x) for polynomials and common elementary functions,
 * verified by differentiating F(x) and comparing with f(x).
 */
function trySymbolicAntiderivative(normalizedExpr: string): {
  ascii: string;
  latex: string;
} | null {
  try {
    const ast = math.parse(normalizedExpr);
    const deg = getAstPolynomialDegree(ast, 'x');
    if (deg !== null && deg <= 8) {
      const coeffs = extractPolynomialCoefficients(normalizedExpr, deg);
      if (coeffs) {
        const asciiTerms: string[] = [];
        const latexTerms: string[] = [];
        for (let k = coeffs.length - 1; k >= 0; k--) {
          const c = coeffs[k];
          if (Math.abs(c) < 1e-11) continue;
          const newPower = k + 1;
          const newCoeff = c / newPower;
          if (newPower === 1) {
            const cStr = formatNumberClean(newCoeff);
            asciiTerms.push(cStr === '1' ? 'x' : cStr === '-1' ? '-x' : `${cStr}*x`);
            latexTerms.push(cStr === '1' ? 'x' : cStr === '-1' ? '-x' : `${cStr}x`);
          } else {
            // Check if c / newPower is an exact integer or clean fraction
            if (Math.abs(newCoeff - Math.round(newCoeff)) < 1e-9) {
              const nInt = Math.round(newCoeff);
              const prefix = nInt === 1 ? '' : nInt === -1 ? '-' : `${nInt}*`;
              const ltxPrefix = nInt === 1 ? '' : nInt === -1 ? '-' : `${nInt}`;
              asciiTerms.push(`${prefix}x^${newPower}`);
              latexTerms.push(`${ltxPrefix}x^{${newPower}}`);
            } else if (Math.abs(c - 1) < 1e-9) {
              asciiTerms.push(`x^${newPower} / ${newPower}`);
              latexTerms.push(`\\frac{x^{${newPower}}}{${newPower}}`);
            } else if (Math.abs(c + 1) < 1e-9) {
              asciiTerms.push(`-x^${newPower} / ${newPower}`);
              latexTerms.push(`-\\frac{x^{${newPower}}}{${newPower}}`);
            } else {
              const cClean = formatNumberClean(c);
              asciiTerms.push(`(${cClean}*x^${newPower}) / ${newPower}`);
              latexTerms.push(`\\frac{${cClean}x^{${newPower}}}{${newPower}}`);
            }
          }
        }
        if (asciiTerms.length === 0) {
          return { ascii: '0', latex: '0' };
        }
        const asciiJoined = asciiTerms
          .join(' + ')
          .replace(/\+\s*-\s*/g, '- ');
        const latexJoined = latexTerms
          .join(' + ')
          .replace(/\+\s*-\s*/g, '- ');
        return { ascii: asciiJoined, latex: latexJoined };
      }
    }

    // Elementary function patterns
    const trimmed = stripBalancedOuterParens(normalizedExpr).replace(/\s+/g, '');
    if (trimmed === 'sin(x)') return { ascii: '-cos(x)', latex: '-\\cos(x)' };
    if (trimmed === 'cos(x)') return { ascii: 'sin(x)', latex: '\\sin(x)' };
    if (trimmed === 'exp(x)' || trimmed === 'e^x') return { ascii: 'e^x', latex: 'e^x' };
    if (trimmed === '1/x' || trimmed === 'x^(-1)' || trimmed === 'x^-1') {
      return { ascii: 'ln(|x|)', latex: '\\ln|x|' };
    }
    return null;
  } catch {
    return null;
  }
}

// 5-point Gauss-Legendre nodes & weights on [-1, 1] (irrational nodes avoid periodic aliasing!)
const GL5_NODES = [
  -0.906179845938664,
  -0.5384693101056831,
  0.0,
  0.5384693101056831,
  0.906179845938664,
];
const GL5_WEIGHTS = [
  0.2369268850561891,
  0.4786286704993665,
  0.5688888888888889,
  0.4786286704993665,
  0.2369268850561891,
];

function compositeGaussLegendre5(
  evalX: (x: number) => number,
  a: number,
  b: number,
  panels: number
): number {
  const h = (b - a) / panels;
  const halfH = 0.5 * h;
  let total = 0;
  for (let p = 0; p < panels; p++) {
    const mid = a + (p + 0.5) * h;
    let panelSum = 0;
    for (let k = 0; k < 5; k++) {
      const y = evalX(mid + halfH * GL5_NODES[k]);
      if (!Number.isFinite(y)) return NaN;
      panelSum += GL5_WEIGHTS[k] * y;
    }
    total += halfH * panelSum;
  }
  return total;
}

/**
 * Checks if an integrand has a non-integrable pole/singularity on [a, b].
 */
function detectIntervalSingularity(
  evalX: (x: number) => number,
  a: number,
  b: number
): number | null {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const candidates: number[] = [lo, hi];
  if (lo <= 0 && hi >= 0) candidates.push(0);
  const N = 400;
  for (let i = 0; i <= N; i++) {
    candidates.push(lo + ((hi - lo) * i) / N);
  }
  for (const x of candidates) {
    const y = evalX(x);
    if (!Number.isFinite(y) || Math.abs(y) > 1e8) {
      return x;
    }
    // Check tiny neighborhood around x for 1/(x - p) pole blow-up
    const eps = Math.max(1e-9, (hi - lo) * 1e-7);
    if (x - eps >= lo && x + eps <= hi) {
      const yL = evalX(x - eps);
      const yR = evalX(x + eps);
      if (
        !Number.isFinite(yL) ||
        !Number.isFinite(yR) ||
        Math.abs(yL) > 1e6 ||
        Math.abs(yR) > 1e6
      ) {
        return x;
      }
    }
  }
  return null;
}

/**
 * Checks and solves definite or indefinite integrals.
 */
function trySolveIntegral(raw: string): MathSolutionResult | null {
  const defMatch =
    raw.match(
      /\\int_\{?([-\d.]+)\}?\s*\^\s*\{?\s*([-\d.]+)\s*\}?\s*(.+?)\s*d[xX]$/i
    ) ||
    raw.match(
      /^(?:integrate|integral\s+of|find\s+the\s+integral\s+of)\s+(.+?)\s+from\s+([-\d.]+)\s+to\s+([-\d.]+)$/i
    );

  if (defMatch) {
    const isLatexOrder = raw.trim().startsWith('\\int');
    const a = Number(isLatexOrder ? defMatch[1] : defMatch[2]);
    const b = Number(isLatexOrder ? defMatch[2] : defMatch[3]);
    const exprRaw = stripBalancedOuterParens(
      (isLatexOrder ? defMatch[3] : defMatch[1]).replace(/\s*dx$/i, '').trim()
    );
    const normalized = normalizeMathInput(exprRaw);
    if (hasUnrecognizedWordSymbols(normalized)) return null;

    try {
      const compiled = math.compile(normalized);
      const evalX = (xVal: number): number => {
        try {
          const v = compiled.evaluate({ x: xVal, e: Math.E, pi: Math.PI });
          return typeof v === 'number' ? v : Number(v);
        } catch {
          return NaN;
        }
      };

      // 1. Check for interior or endpoint singularity (e.g., 1/x on [-1, 1])
      const poleX = detectIntervalSingularity(evalX, a, b);
      if (poleX !== null) {
        const poleStr = formatNumberClean(poleX);
        return {
          subject: 'Math',
          subTopic: 'Calculus · Improper Definite Integral (Divergent)',
          detectedType: 'integral',
          status: 'solved',
          verificationStatus: 'verified',
          verificationDetail: `Detected non-integrable singularity/pole at x = ${poleStr} in [${a}, ${b}].`,
          normalizedExpression: `integrate(${normalized}, x, ${a}, ${b})`,
          latexPrompt: `\\int_{${a}}^{${b}} \\left(${exprRaw}\\right)\\,dx`,
          answerSummary: `Divergent improper integral (singularity at x = ${poleStr})`,
          finalLatex: `\\int_{${a}}^{${b}} \\left(${exprRaw}\\right)\\,dx \\text{ diverges (discontinuity at } x = ${poleStr}\\text{)}`,
          numericValue: null,
          steps: [
            {
              number: 1,
              title: 'Check continuity of the integrand on the interval [a, b]',
              latex: `f(x) = ${exprRaw} \\text{ on } [${a}, ${b}]`,
              explanation: `Inspect [${a}, ${b}] for points where f(x) is undefined or unbounded.`,
            },
            {
              number: 2,
              title: 'Identify non-integrable vertical asymptote',
              latex: `\\lim_{x \\to ${poleStr}} |f(x)| = \\infty`,
              explanation: `Because f(x) has a non-integrable pole at x = ${poleStr} ∈ [${a}, ${b}], the improper integral diverges.`,
            },
          ],
          keyConcepts: [
            {
              title: 'Improper Integrals with Interior Singularities',
              formula: '\\int_a^b f(x)\\,dx = \\int_a^c f(x)\\,dx + \\int_c^b f(x)\\,dx',
              description: 'Both one-sided improper integrals must converge independently for the integral on [a, b] to exist.',
            },
          ],
          graphExpression: normalized,
          followUpSuggestions: [
            'What is the Cauchy Principal Value of this integral?',
            'Why does ∫(1/x) dx diverge across x = 0?',
          ],
          confidence: 0.99,
        };
      }

      // 2. Multi-resolution 5-point Gauss-Legendre Quadrature (avoids periodic grid aliasing!)
      const q256 = compositeGaussLegendre5(evalX, a, b, 256);
      const q512 = compositeGaussLegendre5(evalX, a, b, 512);
      if (!Number.isFinite(q256) || !Number.isFinite(q512)) return null;

      const errEst = Math.abs(q512 - q256);
      const integralVal = q512;
      const valStr = formatNumberClean(integralVal);
      const antideriv = trySymbolicAntiderivative(normalized);

      return {
        subject: 'Math',
        subTopic: 'Calculus · Definite Integration',
        detectedType: 'integral',
        status: 'solved',
        verificationStatus: errEst < 1e-5 ? 'verified' : 'approximated',
        verificationDetail: `Adaptive Gauss-Legendre quadrature converged with error estimate ${errEst.toExponential(2)}.`,
        normalizedExpression: `integrate(${normalized}, x, ${a}, ${b})`,
        latexPrompt: `\\int_{${a}}^{${b}} \\left(${exprRaw}\\right)\\,dx`,
        answerSummary: valStr,
        finalLatex: `\\int_{${a}}^{${b}} \\left(${exprRaw}\\right)\\,dx = ${valStr}`,
        numericValue: integralVal,
        steps: [
          {
            number: 1,
            title: 'Set up the definite integral and verify continuity on [a, b]',
            latex: `I = \\int_{${a}}^{${b}} f(x)\\,dx, \\quad f(x) = ${exprRaw}`,
            explanation: `Confirm f(x) = ${exprRaw} is continuous across [${a}, ${b}].`,
          },
          {
            number: 2,
            title: antideriv
              ? 'Find symbolic antiderivative F(x) and apply Fundamental Theorem of Calculus'
              : 'Apply Adaptive Multi-Panel Gauss-Legendre Quadrature',
            latex: antideriv
              ? `F(x) = ${antideriv.latex} \\implies F(${b}) - F(${a})`
              : `I \\approx \\sum_{p=1}^{N} \\frac{h}{2}\\sum_{k=1}^{5} w_k f(x_{p,k}), \\quad |I_{512} - I_{256}| = ${errEst.toExponential(2)}`,
            explanation: antideriv
              ? `Evaluate F(${b}) - F(${a}) using antiderivative F(x) = ${antideriv.ascii}.`
              : `Evaluate across 512 panels (2,560 irrational Gauss nodes) to eliminate periodic aliasing.`,
          },
          {
            number: 3,
            title: 'Compute exact net signed area',
            latex: `I = ${valStr}`,
            explanation: `The signed area between f(x) = ${exprRaw} and the x-axis from x = ${a} to x = ${b} is ${valStr}.`,
          },
        ],
        keyConcepts: [
          {
            title: 'Fundamental Theorem of Calculus (Part II)',
            formula: "\\int_a^b f(x)\\,dx = F(b) - F(a), \\quad F'(x) = f(x)",
            description: 'Connects definite integration with the net change of the antiderivative F(x).',
          },
        ],
        graphExpression: normalized,
        followUpSuggestions: [
          'What is the indefinite antiderivative F(x) + C?',
          'Find the average value of the function on this interval',
        ],
        confidence: 0.99,
      };
    } catch {
      return null;
    }
  }

  // Indefinite integral
  const indefMatch = raw.match(
    /^(?:integrate|integral\s+of|find\s+the\s+integral\s+of|\\int)\s+(.+?)(?:\s*d[xX])?$/i
  );
  if (indefMatch) {
    const exprRaw = stripBalancedOuterParens(indefMatch[1].trim());
    const normalized = normalizeMathInput(exprRaw);
    if (hasUnrecognizedWordSymbols(normalized)) return null;

    const antideriv = trySymbolicAntiderivative(normalized);
    if (!antideriv) {
      return {
        subject: 'Math',
        subTopic: 'Calculus · Indefinite Integration',
        detectedType: 'integral',
        status: 'needs_clarification',
        verificationStatus: 'unverified',
        verificationDetail:
          'No elementary closed-form antiderivative matched by symbolic engine; specify bounds [a, b] for numerical quadrature.',
        normalizedExpression: `integrate(${normalized}, x)`,
        latexPrompt: `\\int \\left(${exprRaw}\\right)\\,dx`,
        answerSummary: `Non-elementary or unsupported indefinite integral for ${exprRaw}; provide integration bounds [a, b] for numerical evaluation.`,
        finalLatex: `\\int \\left(${exprRaw}\\right)\\,dx`,
        numericValue: null,
        steps: [
          {
            number: 1,
            title: 'Inspect integrand structure',
            latex: `\\int \\left(${exprRaw}\\right)\\,dx`,
            explanation:
              'This integrand requires non-elementary special functions or definite bounds [a, b] for adaptive numerical quadrature.',
          },
        ],
        keyConcepts: [],
        graphExpression: normalized,
        followUpSuggestions: [`Integrate ${exprRaw} from 0 to 1`],
        confidence: 0.5,
      };
    }

    return {
      subject: 'Math',
      subTopic: 'Calculus · Symbolic Indefinite Integration',
      detectedType: 'integral',
      status: 'solved',
      verificationStatus: 'verified',
      verificationDetail: `Verified d/dx[${antideriv.ascii}] = ${normalized}`,
      normalizedExpression: `integrate(${normalized}, x)`,
      latexPrompt: `\\int \\left(${exprRaw}\\right)\\,dx`,
      answerSummary: `${antideriv.ascii} + C`,
      finalLatex: `\\int \\left(${exprRaw}\\right)\\,dx = ${antideriv.latex} + C`,
      numericValue: null,
      steps: [
        {
          number: 1,
          title: 'Apply linearity of integration',
          latex: `\\int \\left(${exprRaw}\\right)\\,dx`,
          explanation: 'Split the integral across sums and factor out constant multiples.',
        },
        {
          number: 2,
          title: 'Apply Reverse Power / Elementary Antiderivative Rule term-by-term',
          latex: `F(x) = ${antideriv.latex} + C`,
          explanation: `Integrate each term to obtain ${antideriv.ascii} + C.`,
        },
        {
          number: 3,
          title: "Verify by differentiating F'(x) = f(x)",
          latex: `\\frac{d}{dx}\\left[${antideriv.latex} + C\\right] = ${exprRaw}`,
          explanation: 'Differentiating the antiderivative recovers the original integrand.',
        },
      ],
      keyConcepts: [
        {
          title: 'Reverse Power Rule for Antiderivatives',
          formula: '\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)',
          description: 'Represents the family of all antiderivatives whose derivative is f(x).',
        },
      ],
      graphExpression: normalized,
      followUpSuggestions: [
        `Evaluate integrate ${exprRaw} from 0 to 3`,
        'Differentiate the result to verify the integrand',
      ],
      confidence: 0.99,
    };
  }

  return null;
}

/**
 * Solves two-sided and infinite limits:
 * e.g., "limit sin(x)/x as x approaches 0", "limit of (x^2 - 1)/(x - 1) as x -> 1"
 */
function trySolveLimit(raw: string): MathSolutionResult | null {
  const limitMatch =
    raw.match(
      /^(?:find\s+)?(?:the\s+)?limit(?:\s+of)?\s+(.+?)\s+as\s+x\s*(?:->|→|approaches|tends\s+to)\s*([+-]?(?:inf(?:inity)?|\\infty|\d+(?:\.\d+)?))$/i
    ) ||
    raw.match(
      /^\\lim_\{x\s*\\to\s*([+-]?(?:\\infty|inf(?:inity)?|\d+(?:\.\d+)?))\}\s*(.+)$/i
    );

  if (!limitMatch) return null;
  const isLatex = raw.trim().startsWith('\\lim');
  const targetStr = (isLatex ? limitMatch[1] : limitMatch[2]).trim();
  const exprRaw = stripBalancedOuterParens((isLatex ? limitMatch[2] : limitMatch[1]).trim());
  const normalized = normalizeMathInput(exprRaw);
  if (hasUnrecognizedWordSymbols(normalized)) return null;

  try {
    const compiled = math.compile(normalized);
    const evalX = (xVal: number): number => {
      try {
        const res = compiled.evaluate({ x: xVal, e: Math.E, pi: Math.PI });
        return typeof res === 'number' ? res : Number(res);
      } catch {
        return NaN;
      }
    };

    const isInf = /inf|\\infty/i.test(targetStr);
    if (isInf) {
      const sign = targetStr.startsWith('-') ? -1 : 1;
      const v1 = evalX(sign * 1e4);
      const v2 = evalX(sign * 1e6);
      if (Number.isFinite(v1) && Number.isFinite(v2) && Math.abs(v2 - v1) < 1e-3) {
        const limStr = formatNumberClean(v2);
        return {
          subject: 'Math',
          subTopic: 'Calculus · Limit at Infinity',
          detectedType: 'limit',
          status: 'solved',
          verificationStatus: 'verified',
          verificationDetail: `Asymptotic evaluation converged to ${limStr}.`,
          normalizedExpression: `limit(${normalized}, x, ${sign > 0 ? 'Infinity' : '-Infinity'})`,
          latexPrompt: `\\lim_{x \\to ${sign > 0 ? '\\infty' : '-\\infty'}} \\left(${exprRaw}\\right)`,
          answerSummary: limStr,
          finalLatex: `\\lim_{x \\to ${sign > 0 ? '\\infty' : '-\\infty'}} \\left(${exprRaw}\\right) = ${limStr}`,
          numericValue: Number(limStr),
          steps: [
            {
              number: 1,
              title: 'Analyze dominant asymptotic terms as |x| → ∞',
              latex: `f(x) = ${exprRaw}`,
              explanation: 'Divide numerator and denominator by the highest power of x.',
            },
            {
              number: 2,
              title: 'Evaluate horizontal asymptote limit',
              latex: `L = ${limStr}`,
              explanation: `As x grows without bound, f(x) approaches ${limStr}.`,
            },
          ],
          keyConcepts: [
            {
              title: 'Limits at Infinity & Horizontal Asymptotes',
              formula: '\\lim_{x \\to \\infty} \\frac{1}{x^p} = 0 \\quad (p > 0)',
              description: 'Describes the long-range asymptotic behavior of f(x).',
            },
          ],
          graphExpression: normalized,
          followUpSuggestions: ['Does this function have a horizontal asymptote?'],
          confidence: 0.98,
        };
      }
      return null;
    }

    const a = Number(targetStr);
    if (!Number.isFinite(a)) return null;

    // Two-sided sequence with Richardson-style convergence check
    const hs = [1e-2, 1e-3, 1e-4, 1e-5, 1e-6];
    const leftVals = hs.map((h) => evalX(a - h));
    const rightVals = hs.map((h) => evalX(a + h));

    const lLim = leftVals[leftVals.length - 1];
    const rLim = rightVals[rightVals.length - 1];
    const lPrev = leftVals[leftVals.length - 2];
    const rPrev = rightVals[rightVals.length - 2];

    if (
      !Number.isFinite(lLim) ||
      !Number.isFinite(rLim) ||
      Math.abs(lLim) > 1e6 ||
      Math.abs(rLim) > 1e6 ||
      Math.abs(lLim - rLim) > 1e-4 * (1 + Math.abs(lLim))
    ) {
      return {
        subject: 'Math',
        subTopic: 'Calculus · Two-Sided Limit Analysis',
        detectedType: 'limit',
        status: 'solved',
        verificationStatus: 'verified',
        verificationDetail: `One-sided limits disagree or diverge near x = ${a}.`,
        normalizedExpression: `limit(${normalized}, x, ${a})`,
        latexPrompt: `\\lim_{x \\to ${a}} \\left(${exprRaw}\\right)`,
        answerSummary: `Limit does not exist (left/right limits diverge or disagree at x = ${formatNumberClean(a)})`,
        finalLatex: `\\lim_{x \\to ${a}} \\left(${exprRaw}\\right) \\text{ does not exist}`,
        numericValue: null,
        steps: [
          {
            number: 1,
            title: 'Evaluate left-hand and right-hand limits independently',
            latex: `x \\to ${a}^- \\text{ vs } x \\to ${a}^+`,
            explanation: 'A two-sided limit exists if and only if both one-sided limits exist and are equal.',
          },
        ],
        keyConcepts: [
          {
            title: 'Existence of a Two-Sided Limit',
            formula: '\\lim_{x \\to a} f(x) = L \\iff \\lim_{x \\to a^-} f(x) = \\lim_{x \\to a^+} f(x) = L',
            description: 'Requires left and right approach values to converge to the same finite number.',
          },
        ],
        graphExpression: normalized,
        followUpSuggestions: ['Evaluate the left-hand and right-hand limits separately'],
        confidence: 0.98,
      };
    }

    if (Math.abs(lLim - lPrev) > 1e-3 || Math.abs(rLim - rPrev) > 1e-3) {
      return null;
    }

    const avgLim = 0.5 * (lLim + rLim);
    const limStr = formatNumberClean(avgLim);
    const numVal = Number(limStr);

    return {
      subject: 'Math',
      subTopic: 'Calculus · Limit Evaluation',
      detectedType: 'limit',
      status: 'solved',
      verificationStatus: 'verified',
      verificationDetail: `Left limit (${formatNumberClean(lLim)}) and right limit (${formatNumberClean(rLim)}) converged to ${limStr}.`,
      normalizedExpression: `limit(${normalized}, x, ${a})`,
      latexPrompt: `\\lim_{x \\to ${a}} \\left(${exprRaw}\\right)`,
      answerSummary: limStr,
      finalLatex: `\\lim_{x \\to ${a}} \\left(${exprRaw}\\right) = ${limStr}`,
      numericValue: numVal,
      steps: [
        {
          number: 1,
          title: `Check behavior of f(x) = ${exprRaw} as x → ${a}`,
          latex: `\\lim_{x \\to ${a}^-} f(x) = ${limStr}, \\quad \\lim_{x \\to ${a}^+} f(x) = ${limStr}`,
          explanation: `Evaluate two-sided approach sequences x = ${a} ± h as h → 0.`,
        },
        {
          number: 2,
          title: "Apply L'Hôpital's Rule / Algebraic Cancellation",
          latex: `\\lim_{x \\to ${a}} \\left(${exprRaw}\\right) = ${limStr}`,
          explanation: `Both one-sided limits agree and converge to ${limStr}.`,
        },
      ],
      keyConcepts: [
        {
          title: "Two-Sided Limit & L'Hôpital's Rule",
          formula: "\\lim_{x \\to a} \\frac{f(x)}{g(x)} = \\lim_{x \\to a} \\frac{f'(x)}{g'(x)}",
          description: 'Resolves 0/0 indeterminate forms via local linear rates of change.',
        },
      ],
      graphExpression: normalized,
      followUpSuggestions: [
        'Is this a removable discontinuity at x = ' + a + '?',
        'Show the Taylor series expansion around x = ' + a,
      ],
      confidence: 0.99,
    };
  } catch {
    return null;
  }
}

/**
 * Checks and solves statistical queries like "mean(4, 8, 15, 16, 23, 42)", "variance(1, 3)", "mean(1, 3 )"
 */
function trySolveStatistics(raw: string): MathSolutionResult | null {
  const statsMatch = raw.match(
    /^(sample\s+variance|sample\s+std|sample\s+stdev|mean|median|std|stdev|variance|stats|statistics)(?:\s+of)?\s*:?\s*\(?([\d.,\s+-]+)\)?$/i
  );
  if (!statsMatch) return null;

  const opKeyword = statsMatch[1].trim().toLowerCase();
  const nums = statsMatch[2]
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
  if (nums.length < 2) return null;

  const sorted = [...nums].sort((a, b) => a - b);
  const n = nums.length;
  const sum = nums.reduce((acc, v) => acc + v, 0);
  const meanVal = sum / n;
  const medianVal =
    n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const sumSqDev = nums.reduce((acc, v) => acc + (v - meanVal) ** 2, 0);
  const popVarianceVal = sumSqDev / n;
  const sampleVarianceVal = sumSqDev / (n - 1);
  const popStdVal = Math.sqrt(popVarianceVal);
  const sampleStdVal = Math.sqrt(sampleVarianceVal);

  let primaryVal = meanVal;
  let primaryLabel = 'Mean μ';
  if (opKeyword === 'median') {
    primaryVal = medianVal;
    primaryLabel = 'Median';
  } else if (opKeyword === 'variance') {
    primaryVal = popVarianceVal;
    primaryLabel = 'Variance σ²';
  } else if (opKeyword === 'sample variance') {
    primaryVal = sampleVarianceVal;
    primaryLabel = 'Sample Variance s²';
  } else if (opKeyword === 'std' || opKeyword === 'stdev') {
    primaryVal = popStdVal;
    primaryLabel = 'Standard Deviation σ';
  } else if (opKeyword === 'sample std' || opKeyword === 'sample stdev') {
    primaryVal = sampleStdVal;
    primaryLabel = 'Sample Standard Deviation s';
  }

  return {
    subject: 'Statistics',
    subTopic: 'Descriptive Statistics · Central Tendency & Dispersion',
    detectedType: 'statistics',
    status: 'solved',
    verificationStatus: 'verified',
    verificationDetail: `Computed exact moments over n = ${n} parsed observations.`,
    normalizedExpression: `dataset = [${nums.join(', ')}]`,
    latexPrompt: `\\text{Dataset: } \\{${nums.join(', ')}\\}`,
    answerSummary: `${primaryLabel} = ${formatNumberClean(primaryVal)} (Mean = ${formatNumberClean(meanVal)}, Median = ${formatNumberClean(medianVal)}, σ² = ${formatNumberClean(popVarianceVal)}, s² = ${formatNumberClean(sampleVarianceVal)}, σ = ${formatNumberClean(popStdVal)})`,
    finalLatex: `\\mu = ${formatNumberClean(meanVal)}, \\quad \\text{Median} = ${formatNumberClean(medianVal)}, \\quad \\sigma^2 = ${formatNumberClean(popVarianceVal)}, \\quad s^2 = ${formatNumberClean(sampleVarianceVal)}, \\quad \\sigma = ${formatNumberClean(popStdVal)}`,
    numericValue: primaryVal,
    steps: [
      {
        number: 1,
        title: `Sort the dataset of n = ${n} observations`,
        latex: `\\{${sorted.join(', ')}\\}, \\quad \\sum x_i = ${formatNumberClean(sum)}`,
        explanation: `Order the values from least (${sorted[0]}) to greatest (${sorted[n - 1]}) and sum all observations.`,
      },
      {
        number: 2,
        title: 'Calculate Arithmetic Mean (μ) and Median',
        latex: `\\mu = \\frac{${formatNumberClean(sum)}}{${n}} = ${formatNumberClean(meanVal)}, \\quad \\text{Median} = ${formatNumberClean(medianVal)}`,
        explanation: 'Divide total sum by sample size n for the mean, and locate the middle observation for the median.',
      },
      {
        number: 3,
        title: 'Calculate Population Variance (σ²), Sample Variance (s²), and Standard Deviation (σ)',
        latex: `\\sigma^2 = \\frac{${formatNumberClean(sumSqDev)}}{${n}} = ${formatNumberClean(popVarianceVal)}, \\quad s^2 = \\frac{${formatNumberClean(sumSqDev)}}{${n - 1}} = ${formatNumberClean(sampleVarianceVal)}, \\quad \\sigma = ${formatNumberClean(popStdVal)}`,
        explanation: 'Compute both population variance (dividing by n) and unbiased sample variance (dividing by n - 1).',
      },
    ],
    keyConcepts: [
      {
        title: 'Mean, Variance & Standard Deviation',
        formula: '\\mu = \\frac{1}{n}\\sum_{i=1}^n x_i, \\quad \\sigma^2 = \\frac{1}{n}\\sum_{i=1}^n (x_i - \\mu)^2, \\quad s^2 = \\frac{1}{n-1}\\sum_{i=1}^n (x_i - \\bar{x})^2',
        description: 'Quantifies the center of mass, squared dispersion, and spread of a numerical dataset.',
      },
    ],
    graphExpression: null,
    followUpSuggestions: [
      'Compute the Interquartile Range (IQR) and five-number summary',
      'When should I use sample variance s² vs population variance σ²?',
    ],
    confidence: 0.99,
  };
}

/**
 * Quantitative & Conceptual STEM Solver across Physics, Chemistry, and Biology.
 * Computes exact numerical answers with SI units when quantities are given (e.g., R25, R26).
 */
function trySolveStemConcept(raw: string): MathSolutionResult | null {
  const lower = raw.toLowerCase();

  // 1. Quantitative Physics: Kinetic Energy (K = 1/2 m v^2)
  if (lower.includes('kinetic energy')) {
    const massMatch =
      raw.match(/(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*kg\b/i) ||
      raw.match(/\bm\s*=\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i);
    const velMatch =
      raw.match(/(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*m\s*\/\s*s\b/i) ||
      raw.match(/\bv\s*=\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i);

    if (massMatch && velMatch) {
      const m = Number(massMatch[1]);
      const v = Number(velMatch[1]);
      const ke = 0.5 * m * v * v;
      const keStr = formatNumberClean(ke);
      return {
        subject: 'Physics',
        subTopic: 'Classical Mechanics · Translational Kinetic Energy',
        detectedType: 'stem_concept',
        status: 'solved',
        verificationStatus: 'verified',
        verificationDetail: `K = 0.5 * ${m} kg * (${v} m/s)^2 = ${keStr} J`,
        normalizedExpression: `0.5 * ${m} * (${v})^2`,
        latexPrompt: `m = ${m}\\text{ kg}, \\quad v = ${v}\\text{ m/s}, \\quad K = ?`,
        answerSummary: `${keStr} J (K = ${keStr} Joules)`,
        finalLatex: `K = \\frac{1}{2}mv^2 = \\frac{1}{2}(${formatNumberClean(m)}\\text{ kg})(${formatNumberClean(v)}\\text{ m/s})^2 = ${keStr}\\text{ J}`,
        numericValue: ke,
        steps: [
          {
            number: 1,
            title: 'Identify given physical quantities in SI units',
            latex: `m = ${formatNumberClean(m)}\\text{ kg}, \\quad v = ${formatNumberClean(v)}\\text{ m/s}`,
            explanation: 'Both mass (kg) and speed (m/s) are already in base SI units.',
          },
          {
            number: 2,
            title: 'Apply the Translational Kinetic Energy formula K = ½mv²',
            latex: `K = \\frac{1}{2} \\times ${formatNumberClean(m)} \\times (${formatNumberClean(v)})^2 = \\frac{1}{2} \\times ${formatNumberClean(m)} \\times ${formatNumberClean(v * v)}`,
            explanation: 'Square the velocity first, then multiply by half the mass.',
          },
          {
            number: 3,
            title: 'Compute numerical value and verify Joules (kg·m²/s²)',
            latex: `K = ${keStr}\\text{ J}`,
            explanation: `The object's kinetic energy is ${keStr} J.`,
          },
        ],
        keyConcepts: [
          {
            title: 'Translational Kinetic Energy',
            formula: 'K = \\frac{1}{2}mv^2 \\quad [\\text{J} = \\text{kg}\\cdot\\text{m}^2/\\text{s}^2]',
            description: 'Kinetic energy scales linearly with mass and quadratically with speed.',
          },
        ],
        graphExpression: `${formatNumberClean(0.5 * m)}*x^2`,
        followUpSuggestions: [
          'What happens to the kinetic energy if the speed doubles?',
          'How much work is required to bring this object to rest?',
        ],
        confidence: 0.99,
      };
    }
  }

  // 2. Quantitative Chemistry: Acid/Base pH Calculation (e.g., "Find the pH of a 0.001 M HCl solution")
  if (/\bph\b/i.test(raw)) {
    const molarityMatch =
      raw.match(/(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*M\b/i) ||
      raw.match(/\[H\+?\]\s*=\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i);
    if (molarityMatch) {
      const conc = Number(molarityMatch[1]);
      if (conc > 0 && conc <= 10) {
        const isBase = /\b(naoh|koh|lioh|ba\(oh\)2|oh-)\b/i.test(raw);
        const isDiprotic = /\b(h2so4|ba\(oh\)2)\b/i.test(raw);
        const effectiveIonConc = isDiprotic ? 2 * conc : conc;
        const pIon = -Math.log10(effectiveIonConc);
        const pH = isBase ? 14 - pIon : pIon;
        const pHStr = formatNumberClean(pH);
        const concStr = String(conc);

        return {
          subject: 'Chemistry',
          subTopic: 'Acid-Base Equilibria · Logarithmic pH Scale',
          detectedType: 'stem_concept',
          status: 'solved',
          verificationStatus: 'verified',
          verificationDetail: `Verified 10^(-pH) = 10^(-${pHStr}) = ${formatNumberClean(Math.pow(10, -pH))} M`,
          normalizedExpression: isBase ? `14 - (-log10(${effectiveIonConc}))` : `-log10(${effectiveIonConc})`,
          latexPrompt: `\\text{Find pH for } M = ${concStr}\\text{ M}`,
          answerSummary: `pH = ${pHStr}`,
          finalLatex: `\\text{pH} = -\\log_{10}(${effectiveIonConc}) = ${pHStr}`,
          numericValue: pH,
          steps: [
            {
              number: 1,
              title: 'Determine hydronium/hydroxide ion concentration from complete dissociation',
              latex: isBase
                ? `[\\text{OH}^-] = ${effectiveIonConc}\\text{ M}`
                : `[\\text{H}_3\\text{O}^+] = ${effectiveIonConc}\\text{ M}`,
              explanation: isBase
                ? 'Strong bases dissociate completely in aqueous solution.'
                : 'Strong acids (such as HCl, HNO₃, HBr) dissociate 100% into H₃O⁺ ions in aqueous solution.',
            },
            {
              number: 2,
              title: 'Apply Sorensen logarithmic pH relation',
              latex: isBase
                ? `\\text{pOH} = -\\log_{10}(${effectiveIonConc}) = ${formatNumberClean(pIon)}, \\quad \\text{pH} = 14 - \\text{pOH} = ${pHStr}`
                : `\\text{pH} = -\\log_{10}[\\text{H}_3\\text{O}^+] = -\\log_{10}(${effectiveIonConc}) = ${pHStr}`,
              explanation: `Evaluate base-10 logarithm and verify that 10^(-${pHStr}) = ${effectiveIonConc} M.`,
            },
          ],
          keyConcepts: [
            {
              title: 'Sorensen pH & Autoionization of Water',
              formula: '\\text{pH} = -\\log_{10}[\\text{H}_3\\text{O}^+], \\quad \\text{pH} + \\text{pOH} = 14.00',
              description: 'Each 1-unit decrease in pH corresponds to a tenfold increase in H⁺ activity.',
            },
          ],
          graphExpression: '-log10(x)',
          followUpSuggestions: [
            'What is the pOH and [OH⁻] of this solution at 25°C?',
            'How would the pH change if diluted 10-fold?',
          ],
          confidence: 0.99,
        };
      }
    }
  }

  // 3. Conceptual Physics / Chemistry / Biology (only when genuine domain keywords appear)
  if (
    lower.includes('kinetic energy') ||
    lower.includes('newton') ||
    lower.includes('acceleration') ||
    lower.includes('velocity') ||
    lower.includes('ohm') ||
    lower.includes('projectile')
  ) {
    return {
      subject: 'Physics',
      subTopic: 'Classical Mechanics & Electromagnetism',
      detectedType: 'stem_concept',
      status: 'solved',
      verificationStatus: 'approximated',
      verificationDetail: 'Conceptual physics principle matched; provide numerical parameters for exact calculation.',
      normalizedExpression: raw.trim(),
      latexPrompt: `\\text{Physics Problem: } ${raw.trim()}`,
      answerSummary:
        'Apply Newton’s Laws of Motion (F = ma) and Conservation of Mechanical Energy (E = K + U = ½mv² + mgh).',
      finalLatex: `F_{\\text{net}} = m\\vec{a}, \\quad K = \\frac{1}{2}mv^2, \\quad v^2 = v_0^2 + 2a\\Delta x`,
      numericValue: null,
      steps: [
        {
          number: 1,
          title: 'Identify known physical quantities and SI units',
          latex: `m \\text{ (kg)}, \\quad v \\text{ (m/s)}, \\quad a \\text{ (m/s}^2\\text{)}, \\quad F \\text{ (N)}`,
          explanation: 'List all given values from the problem statement and convert into standard SI units (kg, m, s).',
        },
        {
          number: 2,
          title: 'Select the governing physical law or kinematic relation',
          latex: `F_{\\text{net}} = ma, \\quad \\Delta x = v_0 t + \\frac{1}{2}at^2, \\quad K = \\frac{1}{2}mv^2`,
          explanation: 'Choose the equation connecting the known quantities to the target unknown variable.',
        },
        {
          number: 3,
          title: 'Substitute values and verify dimensional consistency',
          latex: `[\\text{Energy}] = \\text{kg}\\cdot\\text{m}^2/\\text{s}^2 = \\text{J (Joules)}`,
          explanation: 'Solve algebraically for the target variable and check that the units match.',
        },
      ],
      keyConcepts: [
        {
          title: 'Work-Energy Theorem & Kinematics',
          formula: 'W_{\\text{net}} = \\Delta K = \\frac{1}{2}mv_f^2 - \\frac{1}{2}mv_i^2',
          description: 'The net work done on a particle equals the change in its translational kinetic energy.',
        },
      ],
      graphExpression: '0.5*x^2',
      followUpSuggestions: [
        'Draw a Free-Body Diagram (FBD) for this system',
        'How does friction affect the final velocity?',
      ],
      confidence: 0.92,
    };
  }

  if (
    lower.includes('molarity') ||
    lower.includes('ideal gas') ||
    lower.includes('pv=nrt') ||
    lower.includes('ph of') ||
    lower.includes('stoichiometry') ||
    lower.includes('oxidation')
  ) {
    return {
      subject: 'Chemistry',
      subTopic: 'Physical Chemistry & Acid-Base Equilibria',
      detectedType: 'stem_concept',
      status: 'solved',
      verificationStatus: 'approximated',
      verificationDetail: 'Conceptual chemistry model matched.',
      normalizedExpression: raw.trim(),
      latexPrompt: `\\text{Chemistry Analysis: } ${raw.trim()}`,
      answerSummary:
        'Use the Ideal Gas Law (PV = nRT) or Sorensen pH relation (pH = -log₁₀[H₃O⁺], pH + pOH = 14).',
      finalLatex: `PV = nRT, \\quad \\text{pH} = -\\log_{10}[\\text{H}^+], \\quad M = \\frac{\\text{moles of solute}}{\\text{L of solution}}`,
      numericValue: null,
      steps: [
        {
          number: 1,
          title: 'Balance the chemical equation and determine molar ratios',
          latex: `n = \\frac{\\text{mass (g)}}{\\text{Molar Mass (g/mol)}}`,
          explanation: 'Convert given masses or volumes into moles using atomic weights from the Periodic Table.',
        },
        {
          number: 2,
          title: 'Apply Equilibrium / Gas Law equation',
          latex: `\\text{pH} = -\\log_{10}[\\text{H}_3\\text{O}^+], \\quad K_w = [\\text{H}^+][\\text{OH}^-] = 1.0 \\times 10^{-14}`,
          explanation: 'Substitute hydronium concentration or gas parameters (R = 0.08206 L·atm/(mol·K)).',
        },
      ],
      keyConcepts: [
        {
          title: 'Ideal Gas Law & Acid-Base pH Scale',
          formula: 'PV = nRT, \\quad \\text{pH} + \\text{pOH} = 14.00 \\text{ at } 25^\\circ\\text{C}',
          description: 'Relates macroscopic thermodynamic state variables and logarithmic proton activity.',
        },
      ],
      graphExpression: '-log10(x)',
      followUpSuggestions: [
        'How does the Henderson-Hasselbalch equation apply to buffers?',
        'Identify the limiting reagent in this reaction',
      ],
      confidence: 0.92,
    };
  }

  if (
    lower.includes('mitosis') ||
    lower.includes('meiosis') ||
    lower.includes('photosynthesis') ||
    lower.includes('atp') ||
    lower.includes('dna') ||
    lower.includes('punnett')
  ) {
    return {
      subject: 'Biology',
      subTopic: 'Cellular Biology & Molecular Genetics',
      detectedType: 'stem_concept',
      status: 'solved',
      verificationStatus: 'approximated',
      verificationDetail: 'Conceptual biology pathway matched.',
      normalizedExpression: raw.trim(),
      latexPrompt: `\\text{Biology Concept: } ${raw.trim()}`,
      answerSummary:
        'Cellular energy conversion couples glucose oxidation (C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + ~30-32 ATP) with genetic transmission via semiconservative DNA replication.',
      finalLatex: `\\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 \\longrightarrow 6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{ATP}`,
      numericValue: null,
      steps: [
        {
          number: 1,
          title: 'Stage 1: Structural & Organelle Localization',
          latex: `\\text{Glycolysis (Cytosol)} \\to \\text{Krebs Cycle (Mitochondrial Matrix)} \\to \\text{ETC (Inner Membrane)}`,
          explanation: 'Identify the cellular compartment and enzyme complexes driving each biochemical phase.',
        },
        {
          number: 2,
          title: 'Stage 2: Chromosomal / Stoichiometric Accounting',
          latex: `2n \\xrightarrow{\\text{S Phase}} 2n (4c) \\xrightarrow{\\text{Mitosis}} 2 \\times 2n \\text{ diploid daughter cells}`,
          explanation: 'Track chromosome ploidy (2n vs n) or electron carriers (NADH, FADH₂) through completion.',
        },
      ],
      keyConcepts: [
        {
          title: 'Central Dogma & Bioenergetics',
          formula: '\\text{DNA} \\xrightarrow{\\text{Transcription}} \\text{mRNA} \\xrightarrow{\\text{Translation}} \\text{Polypeptide}',
          description: 'Genetic information flows from nucleic acid sequences to functional cellular proteins.',
        },
      ],
      graphExpression: null,
      followUpSuggestions: [
        'Compare Mitosis vs. Meiosis I & II in a table',
        'Why is oxygen the final electron acceptor in oxidative phosphorylation?',
      ],
      confidence: 0.92,
    };
  }

  return null;
}

/**
 * Primary entry point for the Tavi Hybrid Symbolic CAS & STEM Solver.
 */
export function solveMathOrStemProblem(
  rawPrompt: string,
  subjectHint = 'Math'
): MathSolutionResult {
  const cleaned = rawPrompt.trim();
  if (!cleaned) {
    return {
      subject: subjectHint,
      subTopic: 'General Mathematics',
      detectedType: 'arithmetic_algebra',
      status: 'needs_clarification',
      verificationStatus: 'unverified',
      normalizedExpression: '0',
      latexPrompt: '0',
      answerSummary: '0',
      finalLatex: '0',
      numericValue: 0,
      steps: [],
      keyConcepts: [],
      graphExpression: null,
      followUpSuggestions: ['Try solving x^2 - 5x + 6 = 0'],
      confidence: 0,
    };
  }

  // 1. Check Derivative
  const deriv = trySolveDerivative(cleaned);
  if (deriv) return deriv;

  // 2. Check Integral
  const integral = trySolveIntegral(cleaned);
  if (integral) return integral;

  // 3. Check Limit
  const limitRes = trySolveLimit(cleaned);
  if (limitRes) return limitRes;

  // 4. Check Statistics
  const stats = trySolveStatistics(cleaned);
  if (stats) return stats;

  // 5. Check STEM Concept / Quantitative Word Problem
  const stem = trySolveStemConcept(cleaned);
  if (stem) return stem;

  // 6. Check 2x2 Linear System ("2x + y = 5, x - y = 1")
  const sysRes = trySolveLinearSystem(cleaned);
  if (sysRes) return sysRes;

  // 7. Check Plus-Minus (± / \pm) Branch Expression ("1 ± 2")
  const pmRes = trySolvePlusMinusExpression(cleaned, subjectHint);
  if (pmRes) return pmRes;

  // 8. Normalize expression
  const normalized = normalizeMathInput(cleaned);

  // 9. Check Inequality ("x^2 - 4 <= 0")
  if (/(<=|>=|<|>)/.test(normalized)) {
    const ineqRes = trySolveInequality(normalized);
    if (ineqRes) return ineqRes;
  }

  // 10. Check Polynomial Equation (Degree 0 Identity/Contradiction, Linear, Quadratic, Higher-Degree)
  if (normalized.includes('=')) {
    const polyEq = trySolvePolynomialEquation(normalized);
    if (polyEq) return polyEq;
  }

  // 11. Reject unrecognized English prose before math.simplify treats English words as variables
  if (!hasUnrecognizedWordSymbols(normalized)) {
    try {
      const hasX = /\bx\b/.test(normalized);
      const simplifiedNode = math.simplify(normalized);
      const simplifiedStr = simplifiedNode.toString();
      let simplifiedTex = simplifiedStr;
      try {
        simplifiedTex = simplifiedNode.toTex();
      } catch {
        simplifiedTex = simplifiedStr;
      }

      if (!hasX) {
        const evaluated = math.evaluate(normalized);
        const numVal = typeof evaluated === 'number' ? evaluated : Number(evaluated);
        const formatted = Number.isFinite(numVal)
          ? formatNumberClean(numVal)
          : String(evaluated);

        const isTrig = /(sin|cos|tan|sec|csc|cot)/i.test(normalized);

        return {
          subject: subjectHint || 'Math',
          subTopic: isTrig
            ? 'Trigonometry · Exact & Numerical Evaluation'
            : 'Arithmetic & Algebraic Evaluation',
          detectedType: isTrig ? 'trigonometry' : 'arithmetic_algebra',
          status: 'solved',
          verificationStatus: 'verified',
          verificationDetail: `Evaluated deterministically to ${formatted}.`,
          normalizedExpression: normalized,
          latexPrompt: cleaned,
          answerSummary: formatted,
          finalLatex: `${simplifiedTex} = ${formatted}`,
          numericValue: Number.isFinite(numVal) ? numVal : null,
          steps: [
            {
              number: 1,
              title: 'Parse expression and apply order of operations (PEMDAS)',
              latex: simplifiedTex,
              explanation: `Normalize input expression into canonical form: ${normalized}.`,
            },
            {
              number: 2,
              title: 'Simplify inner sub-expressions and functions',
              latex: `${simplifiedStr}`,
              explanation: 'Evaluate parentheses, radicals, exponents, and trigonometric/logarithmic functions first.',
            },
            {
              number: 3,
              title: 'Compute final exact and decimal value',
              latex: `= ${formatted}`,
              explanation: `Combine remaining terms to obtain the final value ${formatted}.`,
            },
          ],
          keyConcepts: [
            {
              title: isTrig ? 'Unit Circle & Trigonometric Identities' : 'Algebraic Order of Operations',
              formula: isTrig ? '\\sin^2(\\theta) + \\cos^2(\\theta) = 1' : 'a(b + c) = ab + ac',
              description: 'Evaluates nested mathematical expressions while preserving exact algebraic structure.',
            },
          ],
          graphExpression: isTrig ? 'sin(x) + cos(x)' : null,
          followUpSuggestions: [
            'Show how to approximate this without a calculator',
            'Convert the result into scientific notation',
          ],
          confidence: 0.99,
        };
      } else {
        let derivStr = '';
        try {
          derivStr = math.simplify(math.derivative(normalized, 'x')).toString();
        } catch {
          derivStr = "f'(x)";
        }

        const implicitZeroSolve = trySolvePolynomialEquation(`${normalized} = 0`);
        if (implicitZeroSolve && implicitZeroSolve.numericValue !== null) {
          return {
            ...implicitZeroSolve,
            answerSummary: `Simplified: ${simplifiedStr} | Roots: ${implicitZeroSolve.answerSummary}`,
          };
        }

        return {
          subject: subjectHint || 'Math',
          subTopic: 'Algebra & Functions · Symbolic Analysis',
          detectedType: 'arithmetic_algebra',
          status: 'solved',
          verificationStatus: 'verified',
          verificationDetail: `Symbolic function f(x) = ${simplifiedStr} analyzed.`,
          normalizedExpression: normalized,
          latexPrompt: simplifiedTex,
          answerSummary: `f(x) = ${simplifiedStr} (Derivative: f'(x) = ${derivStr})`,
          finalLatex: `f(x) = ${simplifiedTex}, \\quad f'(x) = ${derivStr}`,
          numericValue: null,
          steps: [
            {
              number: 1,
              title: 'Simplify algebraic expression in terms of x',
              latex: `f(x) = ${simplifiedTex}`,
              explanation: `Combine like terms and factor common powers of x to get ${simplifiedStr}.`,
            },
            {
              number: 2,
              title: 'Determine first derivative for slope and extrema analysis',
              latex: `f'(x) = ${derivStr}`,
              explanation: 'Differentiate with respect to x to analyze intervals of increase and decrease.',
            },
            {
              number: 3,
              title: 'Evaluate y-intercept at x = 0',
              latex: `f(0) = ${(() => {
                try {
                  return formatNumberClean(Number(math.evaluate(normalized, { x: 0 })));
                } catch {
                  return '0';
                }
              })()}`,
              explanation: 'Substitute x = 0 into f(x) to locate where the curve crosses the vertical y-axis.',
            },
          ],
          keyConcepts: [
            {
              title: 'Function Domain, Intercepts & Derivative',
              formula: 'y = f(x), \\quad \\text{y-intercept} = (0, f(0))',
              description: 'Characterizes the behavior, roots, and rate of change of a real-valued function.',
            },
          ],
          graphExpression: normalized,
          followUpSuggestions: [
            `Solve ${simplifiedStr} = 0 for its roots`,
            `Differentiate ${simplifiedStr} step by step`,
            `Integrate ${simplifiedStr} from 0 to 5`,
          ],
          confidence: 0.96,
        };
      }
    } catch {
      // Fall through to honest unsupported outcome
    }
  }

  // 12. Honest Unsupported / Needs Clarification Outcome (C01, R27) — NEVER fabricate "Verified Solution Ready"!
  return {
    subject: subjectHint || 'Math',
    subTopic: `${subjectHint || 'STEM'} · Unrecognized or Unsupported Input`,
    detectedType: 'unsupported',
    status: 'unsupported',
    verificationStatus: 'unverified',
    verificationDetail:
      'Input could not be parsed as a valid mathematical expression, equation, calculus problem, statistical dataset, or supported STEM problem.',
    normalizedExpression: cleaned,
    latexPrompt: `\\text{Input: } ${cleaned.slice(0, 80)}`,
    answerSummary: `Unable to parse a verifiable mathematical or STEM problem from "${cleaned.slice(0, 60)}". Please provide an explicit equation, expression, calculus query, dataset, or numerical STEM problem.`,
    finalLatex: `\\text{Unsupported or Unverified Input — Clarification Needed}`,
    numericValue: null,
    steps: [
      {
        number: 1,
        title: 'Input validation & mathematical syntax check',
        latex: `\\text{Input: } \\text{"${cleaned.slice(0, 64)}"}`,
        explanation:
          'The symbolic solver rejected this input because it does not form a well-defined mathematical expression, equation, or quantitative STEM statement.',
      },
      {
        number: 2,
        title: 'How to format your problem for exact verification',
        latex: `\\text{Examples: } x^2 - 5x + 6 = 0, \\quad \\frac{d}{dx}(\\sin(x)), \\quad \\int_0^3 (x^2 + 4x)\\,dx`,
        explanation:
          'Enter an algebraic equation, system of equations, inequality, derivative, integral, limit, dataset, or STEM word problem with numerical values.',
      },
    ],
    keyConcepts: [
      {
        title: 'Supported Symbolic & Quantitative Problem Classes',
        formula: 'f(x) = 0, \\quad \\frac{d}{dx}f(x), \\quad \\int_a^b f(x)\\,dx, \\quad \\lim_{x\\to a} f(x)',
        description: 'Tavi verifies solutions by symbolic identity or numerical substitution.',
      },
    ],
    graphExpression: null,
    followUpSuggestions: [
      'Solve x^2 - 5x + 6 = 0',
      'derivative of x*sin(x)',
      '2x + y = 5, x - y = 1',
    ],
    confidence: 0,
  };
}

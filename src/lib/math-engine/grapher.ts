import * as math from 'mathjs';
import { normalizeMathInput } from './solver';

export interface GraphPoint {
  x: number;
  y: number;
}

export interface KeyGraphFeature {
  type: 'root' | 'extrema_min' | 'extrema_max' | 'y_intercept';
  x: number;
  y: number;
  label: string;
}

export interface FunctionGraphData {
  expression: string;
  normalizedExpression: string;
  domain: [number, number];
  range: [number, number];
  segments: GraphPoint[][];
  features: KeyGraphFeature[];
  svgPaths: string[];
  width: number;
  height: number;
}

/**
 * Refines a bracketed sign change on [a, b] via 40 iterations of bisection.
 * Returns the root x ONLY if f(x) is continuous and |f(root)| <= 1e-5;
 * returns null if [a, b] brackets a vertical asymptote / pole or discontinuity.
 */
function refineVerifiedRootOnBracket(
  evalF: (x: number) => number,
  a: number,
  b: number
): number | null {
  let lo = a;
  let hi = b;
  let fLo = evalF(lo);
  let fHi = evalF(hi);
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi)) return null;
  if (Math.abs(fLo) < 1e-9) return lo;
  if (Math.abs(fHi) < 1e-9) return hi;
  if (fLo * fHi > 0) return null;

  const initialSpanY = Math.max(Math.abs(fLo), Math.abs(fHi));
  for (let iter = 0; iter < 42; iter++) {
    const mid = 0.5 * (lo + hi);
    const fMid = evalF(mid);
    if (!Number.isFinite(fMid)) {
      // Midpoint hit an exact pole
      return null;
    }
    if (fLo * fMid <= 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }

  const rootX = 0.5 * (lo + hi);
  const fRoot = evalF(rootX);
  // Continuity & residual verification:
  // At a true root, |f(root)| is near 0 and |f(hi) - f(lo)| shrinks toward 0.
  // At a pole (e.g. 0.001/(x - 0.03)), |f(lo)| and |f(hi)| blow up as [lo, hi] shrinks!
  if (
    !Number.isFinite(fRoot) ||
    Math.abs(fRoot) > 1e-4 ||
    Math.max(Math.abs(fLo), Math.abs(fHi)) > Math.max(1, initialSpanY * 10)
  ) {
    return null;
  }
  return Math.abs(rootX) < 1e-10 ? 0 : rootX;
}

/**
 * Refines a local minimum or maximum on [a, b] using Golden-Section Search.
 */
function refineExtremumOnBracket(
  evalF: (x: number) => number,
  a: number,
  b: number,
  findMax: boolean
): { x: number; y: number } | null {
  const phi = (Math.sqrt(5) - 1) / 2;
  let lo = a;
  let hi = b;
  let x1 = hi - phi * (hi - lo);
  let x2 = lo + phi * (hi - lo);
  let f1 = evalF(x1);
  let f2 = evalF(x2);
  if (!Number.isFinite(f1) || !Number.isFinite(f2)) return null;

  for (let iter = 0; iter < 36; iter++) {
    if (findMax ? f1 < f2 : f1 > f2) {
      lo = x1;
      x1 = x2;
      f1 = f2;
      x2 = lo + phi * (hi - lo);
      f2 = evalF(x2);
    } else {
      hi = x2;
      x2 = x1;
      f2 = f1;
      x1 = hi - phi * (hi - lo);
      f1 = evalF(x1);
    }
    if (!Number.isFinite(f1) || !Number.isFinite(f2)) return null;
  }

  const xExt = 0.5 * (lo + hi);
  const yExt = evalF(xExt);
  if (!Number.isFinite(yExt)) return null;
  return {
    x: Math.abs(xExt) < 1e-10 ? 0 : xExt,
    y: Math.abs(yExt) < 1e-10 ? 0 : yExt,
  };
}

/**
 * Samples a real-valued function f(x) over [xMin, xMax],
 * splits segments across vertical asymptotes/poles, locates verified roots
 * (including tangent roots, closely spaced roots, and endpoint roots) and local extrema,
 * and projects coordinates into an SVG viewport (`width` x `height`).
 */
export function generateFunctionGraph(
  rawExpression: string,
  options?: {
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
    samples?: number;
    width?: number;
    height?: number;
  }
): FunctionGraphData {
  const width = Math.max(64, options?.width ?? 640);
  const height = Math.max(64, options?.height ?? 360);

  // Validate and sanitize domain bounds so xMin < xMax is always guaranteed (fixes R24)
  let rawXMin = Number.isFinite(options?.xMin) ? (options!.xMin as number) : -10;
  let rawXMax = Number.isFinite(options?.xMax) ? (options!.xMax as number) : 10;
  if (rawXMin > rawXMax) {
    const tmp = rawXMin;
    rawXMin = rawXMax;
    rawXMax = tmp;
  } else if (Math.abs(rawXMax - rawXMin) < 1e-9) {
    rawXMin -= 5;
    rawXMax += 5;
  }
  const xMin = rawXMin;
  const xMax = rawXMax;
  const samples = Math.max(64, options?.samples ?? 640);

  let expr = rawExpression.trim().replace(/^(?:y|f\(x\)|g\(x\))\s*=\s*/i, '');
  if (expr.includes('=')) {
    const [lhs, rhs] = expr.split('=');
    expr = `(${lhs}) - (${rhs})`;
  }
  const normalized = normalizeMathInput(expr);

  let compiled: math.EvalFunction | null = null;
  try {
    compiled = math.compile(normalized);
  } catch {
    compiled = null;
  }

  const evalF = (x: number): number => {
    if (!compiled) return NaN;
    try {
      const val = compiled.evaluate({ x, e: Math.E, pi: Math.PI });
      const num = typeof val === 'number' ? val : Number(val);
      return Number.isFinite(num) ? num : NaN;
    } catch {
      return NaN;
    }
  };

  const dx = (xMax - xMin) / samples;
  const segments: GraphPoint[][] = [];
  let currentSegment: GraphPoint[] = [];
  const validYs: number[] = [];

  for (let i = 0; i <= samples; i++) {
    const x = i === samples ? xMax : xMin + i * dx;
    const y = evalF(x);

    if (!Number.isFinite(y) || Math.abs(y) > 1e4) {
      if (currentSegment.length > 1) {
        segments.push(currentSegment);
      }
      currentSegment = [];
      continue;
    }

    // Detect vertical asymptote / pole between prev point and current point
    // Works for any scale (including 0.001/(x - 0.03)) by checking if a sign change fails root continuity!
    if (currentSegment.length > 0) {
      const prev = currentSegment[currentSegment.length - 1];
      let isDiscontinuity = false;

      if (prev.y * y < 0) {
        const verifiedCross = refineVerifiedRootOnBracket(evalF, prev.x, x);
        if (verifiedCross === null) {
          isDiscontinuity = true;
        }
      } else if (Math.abs(y - prev.y) > 40) {
        const midY = evalF(0.5 * (prev.x + x));
        if (!Number.isFinite(midY)) {
          isDiscontinuity = true;
        }
      }

      if (isDiscontinuity) {
        if (currentSegment.length > 1) {
          segments.push(currentSegment);
        }
        currentSegment = [];
      }
    }

    currentSegment.push({ x, y });
    if (Math.abs(y) <= 50) {
      validYs.push(y);
    }
  }
  if (currentSegment.length > 1) {
    segments.push(currentSegment);
  }

  // Compute y-axis range
  let yMin = Number.isFinite(options?.yMin) ? (options!.yMin as number) : -10;
  let yMax = Number.isFinite(options?.yMax) ? (options!.yMax as number) : 10;
  if (options?.yMin === undefined && options?.yMax === undefined && validYs.length > 4) {
    const minObserved = Math.min(...validYs);
    const maxObserved = Math.max(...validYs);
    const span = Math.max(4, maxObserved - minObserved);
    yMin = Math.max(-25, Math.floor(minObserved - span * 0.2));
    yMax = Math.min(25, Math.ceil(maxObserved + span * 0.2));
    if (yMin >= 0) yMin = -2;
    if (yMax <= 0) yMax = 2;
  }
  if (yMin >= yMax) {
    yMin -= 5;
    yMax += 5;
  }

  const features: KeyGraphFeature[] = [];
  const rootDedupTol = Math.max(1e-4, (xMax - xMin) * 1e-4);

  const addRootFeature = (rX: number) => {
    const cleanX = Math.abs(rX) < 1e-9 ? 0 : Number(rX.toFixed(4));
    const fVal = evalF(cleanX);
    if (!Number.isFinite(fVal) || Math.abs(fVal) > 1e-3) return;
    if (
      features.filter((f) => f.type === 'root').length < 8 &&
      !features.some((f) => f.type === 'root' && Math.abs(f.x - cleanX) < rootDedupTol)
    ) {
      features.push({
        type: 'root',
        x: cleanX,
        y: 0,
        label: `Root (${Number(cleanX.toFixed(3))}, 0)`,
      });
    }
  };

  // 1. Y-intercept at x = 0
  if (xMin <= 0 && xMax >= 0) {
    const y0 = evalF(0);
    if (Number.isFinite(y0) && y0 >= yMin && y0 <= yMax) {
      features.push({
        type: 'y_intercept',
        x: 0,
        y: Number(y0.toFixed(3)),
        label: `(0, ${Number(y0.toFixed(2))})`,
      });
    }
  }

  // 2. Roots and extrema along segments
  for (const seg of segments) {
    for (let i = 0; i < seg.length - 1; i++) {
      const p1 = seg[i];
      const p2 = seg[i + 1];

      // Check exact endpoint roots (including left and right endpoints of domain, fixing R23)
      if (Math.abs(p1.y) < 1e-9) {
        addRootFeature(p1.x);
      }
      if (i === seg.length - 2 && Math.abs(p2.y) < 1e-9) {
        addRootFeature(p2.x);
      }

      // Sign-change root crossing
      if (p1.y * p2.y < 0) {
        const rX = refineVerifiedRootOnBracket(evalF, p1.x, p2.x);
        if (rX !== null) {
          addRootFeature(rX);
        }
      }

      // Local extrema & tangent/closely-spaced roots using i-1, i, i+1
      if (i > 0) {
        const p0 = seg[i - 1];
        const slopeLeft = p1.y - p0.y;
        const slopeRight = p2.y - p1.y;

        if (slopeLeft > 0 && slopeRight < 0) {
          const ext = refineExtremumOnBracket(evalF, p0.x, p2.x, true);
          if (ext) {
            if (Math.abs(ext.y) < 1e-6) {
              addRootFeature(ext.x);
            } else if (p0.y < 0 && ext.y > 0 && p2.y < 0) {
              const rLeft = refineVerifiedRootOnBracket(evalF, p0.x, ext.x);
              const rRight = refineVerifiedRootOnBracket(evalF, ext.x, p2.x);
              if (rLeft !== null) addRootFeature(rLeft);
              if (rRight !== null) addRootFeature(rRight);
            }
            if (
              ext.y >= yMin &&
              ext.y <= yMax &&
              features.filter((f) => f.type.startsWith('extrema')).length < 4 &&
              !features.some(
                (f) => f.type === 'extrema_max' && Math.abs(f.x - ext.x) < rootDedupTol * 5
              )
            ) {
              features.push({
                type: 'extrema_max',
                x: Number(ext.x.toFixed(3)),
                y: Number(ext.y.toFixed(3)),
                label: `Max (${Number(ext.x.toFixed(2))}, ${Number(ext.y.toFixed(2))})`,
              });
            }
          }
        } else if (slopeLeft < 0 && slopeRight > 0) {
          const ext = refineExtremumOnBracket(evalF, p0.x, p2.x, false);
          if (ext) {
            // Tangent even-multiplicity root (e.g. (x - 0.03)^2 = 0, fixing R21)
            if (Math.abs(ext.y) < 1e-6) {
              addRootFeature(ext.x);
            } else if (p0.y > 0 && ext.y < 0 && p2.y > 0) {
              // Sub-grid closely spaced roots (e.g. (x - 0.03)*(x - 0.10), fixing R22)
              const rLeft = refineVerifiedRootOnBracket(evalF, p0.x, ext.x);
              const rRight = refineVerifiedRootOnBracket(evalF, ext.x, p2.x);
              if (rLeft !== null) addRootFeature(rLeft);
              if (rRight !== null) addRootFeature(rRight);
            }
            if (
              ext.y >= yMin &&
              ext.y <= yMax &&
              features.filter((f) => f.type.startsWith('extrema')).length < 4 &&
              !features.some(
                (f) => f.type === 'extrema_min' && Math.abs(f.x - ext.x) < rootDedupTol * 5
              )
            ) {
              features.push({
                type: 'extrema_min',
                x: Number(ext.x.toFixed(3)),
                y: Number(ext.y.toFixed(3)),
                label: `Min (${Number(ext.x.toFixed(2))}, ${Number(ext.y.toFixed(2))})`,
              });
            }
          }
        }
      }
    }
  }

  // Sort roots in ascending x order
  features.sort((a, b) => a.x - b.x);

  // Project points to SVG paths with guaranteed finite coordinates
  const spanX = Math.max(1e-9, xMax - xMin);
  const spanY = Math.max(1e-9, yMax - yMin);
  const projectX = (x: number) => ((x - xMin) / spanX) * width;
  const projectY = (y: number) => height - ((y - yMin) / spanY) * height;

  const svgPaths: string[] = [];
  for (const seg of segments) {
    const commands: string[] = [];
    for (let i = 0; i < seg.length; i++) {
      const px = projectX(seg[i].x);
      const py = projectY(seg[i].y);
      if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
      if (py < -height || py > height * 2) continue;
      commands.push(`${commands.length === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
    }
    if (commands.length > 1) {
      svgPaths.push(commands.join(' '));
    }
  }

  return {
    expression: rawExpression,
    normalizedExpression: normalized,
    domain: [xMin, xMax],
    range: [yMin, yMax],
    segments,
    features,
    svgPaths,
    width,
    height,
  };
}

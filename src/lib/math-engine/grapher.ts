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
 * Samples a real-valued function $f(x)$ over $[x_{\min}, x_{\max}]$,
 * splits segments across vertical asymptotes, locates roots and local extrema,
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
  const width = options?.width ?? 640;
  const height = options?.height ?? 360;
  const xMin = options?.xMin ?? -10;
  const xMax = options?.xMax ?? 10;
  const samples = options?.samples ?? 320;

  // Strip "y =" or "f(x) =" if present, or if equation "LHS = RHS", graph LHS - RHS
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
    const x = xMin + i * dx;
    const y = evalF(x);

    if (!Number.isFinite(y) || Math.abs(y) > 1e4) {
      if (currentSegment.length > 1) {
        segments.push(currentSegment);
      }
      currentSegment = [];
      continue;
    }

    // Detect vertical asymptote jump (large opposite-sign jump across step)
    if (currentSegment.length > 0) {
      const prev = currentSegment[currentSegment.length - 1];
      if (Math.abs(y - prev.y) > 40 && Math.sign(y) !== Math.sign(prev.y)) {
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
  let yMin = options?.yMin ?? -10;
  let yMax = options?.yMax ?? 10;
  if (options?.yMin === undefined && options?.yMax === undefined && validYs.length > 4) {
    const minObserved = Math.min(...validYs);
    const maxObserved = Math.max(...validYs);
    const span = Math.max(4, maxObserved - minObserved);
    yMin = Math.max(-25, Math.floor(minObserved - span * 0.2));
    yMax = Math.min(25, Math.ceil(maxObserved + span * 0.2));
    if (yMin >= 0) yMin = -2;
    if (yMax <= 0) yMax = 2;
  }

  // Extract roots, local extrema, and y-intercept
  const features: KeyGraphFeature[] = [];

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

      // Root crossing (Bisection refinement)
      if (
        (p1.y === 0 || p1.y * p2.y < 0) &&
        Math.abs(p2.y - p1.y) < 20 &&
        features.filter((f) => f.type === 'root').length < 6
      ) {
        let lo = p1.x;
        let hi = p2.x;
        let fLo = p1.y;
        for (let iter = 0; iter < 16; iter++) {
          const mid = 0.5 * (lo + hi);
          const fMid = evalF(mid);
          if (!Number.isFinite(fMid)) break;
          if (fLo * fMid <= 0) {
            hi = mid;
          } else {
            lo = mid;
            fLo = fMid;
          }
        }
        const rootX = Number((0.5 * (lo + hi)).toFixed(3));
        if (!features.some((f) => f.type === 'root' && Math.abs(f.x - rootX) < 0.15)) {
          features.push({
            type: 'root',
            x: rootX,
            y: 0,
            label: `Root (${Number(rootX.toFixed(2))}, 0)`,
          });
        }
      }

      // Local extrema check using i-1, i, i+1
      if (i > 0) {
        const p0 = seg[i - 1];
        const slopeLeft = p1.y - p0.y;
        const slopeRight = p2.y - p1.y;
        if (
          slopeLeft > 1e-5 &&
          slopeRight < -1e-5 &&
          p1.y >= yMin &&
          p1.y <= yMax &&
          features.filter((f) => f.type.startsWith('extrema')).length < 4
        ) {
          features.push({
            type: 'extrema_max',
            x: Number(p1.x.toFixed(2)),
            y: Number(p1.y.toFixed(2)),
            label: `Max (${Number(p1.x.toFixed(2))}, ${Number(p1.y.toFixed(2))})`,
          });
        } else if (
          slopeLeft < -1e-5 &&
          slopeRight > 1e-5 &&
          p1.y >= yMin &&
          p1.y <= yMax &&
          features.filter((f) => f.type.startsWith('extrema')).length < 4
        ) {
          features.push({
            type: 'extrema_min',
            x: Number(p1.x.toFixed(2)),
            y: Number(p1.y.toFixed(2)),
            label: `Min (${Number(p1.x.toFixed(2))}, ${Number(p1.y.toFixed(2))})`,
          });
        }
      }
    }
  }

  // Project points to SVG paths
  const projectX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
  const projectY = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;

  const svgPaths: string[] = [];
  for (const seg of segments) {
    const commands: string[] = [];
    for (let i = 0; i < seg.length; i++) {
      const px = projectX(seg[i].x);
      const py = projectY(seg[i].y);
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

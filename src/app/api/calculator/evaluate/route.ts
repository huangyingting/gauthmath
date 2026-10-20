import { NextRequest, NextResponse } from 'next/server';
import { solveMathOrStemProblem } from '@/lib/math-engine/solver';
import { generateFunctionGraph } from '@/lib/math-engine/grapher';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const expression = String(body.expression || '').trim();
    const xMin = typeof body.xMin === 'number' ? body.xMin : -10;
    const xMax = typeof body.xMax === 'number' ? body.xMax : 10;

    if (!expression) {
      return NextResponse.json(
        { ok: false, error: 'Expression is required.' },
        { status: 400 }
      );
    }

    const solution = solveMathOrStemProblem(expression, 'Math');
    const boundsAdjusted =
      typeof body.xMin === 'number' &&
      typeof body.xMax === 'number' &&
      body.xMin >= body.xMax;
    const graphTarget =
      solution.status === 'unsupported'
        ? ''
        : solution.graphExpression || expression;
    const graph = graphTarget
      ? generateFunctionGraph(graphTarget, { xMin, xMax })
      : {
          expression,
          domain: [-10, 10] as [number, number],
          range: [-10, 10] as [number, number],
          points: [],
          svgPaths: [],
          features: [],
        };

    return NextResponse.json({
      ok: solution.status !== 'unsupported',
      status: solution.status,
      boundsAdjusted,
      boundsWarning: boundsAdjusted
        ? 'Requested xMin >= xMax was automatically expanded to a valid plotting interval.'
        : undefined,
      solution,
      graph,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : 'Calculator evaluation failed.',
      },
      { status: 500 }
    );
  }
}

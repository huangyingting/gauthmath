import CalculatorPage from './CalculatorPageClient';
import { solveMathOrStemProblem } from '@/lib/math-engine/solver';
import { generateFunctionGraph } from '@/lib/math-engine/grapher';

export default function Page() {
  const solution = solveMathOrStemProblem('x^2 - 5x + 6 = 0', 'Math');
  const graph = solution.graphExpression ? generateFunctionGraph(solution.graphExpression, { xMin: -6, xMax: 8 }) : null;
  return <CalculatorPage initialSolution={solution} initialGraph={graph} />;
}

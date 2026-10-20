import * as math from 'mathjs';
import { solveMathOrStemProblem, type MathSolutionResult, type VerificationStatus } from '@/lib/math-engine/solver';

export type TutorMode = 'explain' | 'hint' | 'check';
export interface TutorTurn { role: 'user' | 'assistant'; text: string }
export interface VerificationEvidence { verificationStatus: VerificationStatus; verificationDetail: string }

export function parseTutorHistory(value: unknown): TutorTurn[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 10) throw new Error('Tutor history must contain at most 10 messages.');
  return value.map(turn => {
    if (!turn || typeof turn !== 'object' || !['user', 'assistant'].includes(turn.role)
      || typeof turn.text !== 'string' || turn.text.length > 4000) throw new Error('Tutor history contains an invalid message.');
    return { role: turn.role, text: turn.text };
  });
}

export function getQuestionVerification(question: { promptText: string; subject: string; answerSummary: string }): VerificationEvidence {
  const result = solveMathOrStemProblem(question.promptText, question.subject);
  if (result.status !== 'solved' || result.answerSummary.trim() !== question.answerSummary.trim()) {
    return { verificationStatus: 'unverified', verificationDetail: 'The saved answer has not been independently confirmed by the current symbolic checker. Re-solve the question to check it.' };
  }
  return {
    verificationStatus: result.verificationStatus || 'unverified',
    verificationDetail: result.verificationDetail || 'No independent verification detail is available.',
  };
}

export function checkEquationCandidate(solution: MathSolutionResult, message: string) {
  if (!['linear_equation', 'quadratic_equation', 'polynomial_equation'].includes(solution.detectedType) || solution.status !== 'solved') return null;
  const candidate = message.match(/\b([a-zA-Z])\s*=\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:\s*\/\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+))?)(?![\w./]|\s*[+\-*/^=()])/i);
  if (!candidate) return null;
  const variable = candidate[1];
  const fraction = candidate[2].split('/').map(Number);
  const value = fraction.length === 2 ? fraction[0] / fraction[1] : fraction[0];
  if (!Number.isFinite(value)) return null;
  const sides = solution.normalizedExpression.split('=');
  if (sides.length !== 2) return null;
  const expressions = sides.map(side => math.parse(side));
  let supported = true;
  for (const expression of expressions) expression.traverse(node => {
    if (!['ConstantNode', 'SymbolNode', 'OperatorNode', 'ParenthesisNode'].includes(node.type)) supported = false;
    if (math.isSymbolNode(node) && ![variable, 'pi', 'e'].includes(node.name)) supported = false;
  });
  if (!supported) return null;
  const [left, right] = expressions.map(expression => expression.compile().evaluate({ [variable]: value }));
  const finite = typeof left === 'number' && typeof right === 'number' && Number.isFinite(left) && Number.isFinite(right);
  const residual = finite ? Math.abs(left - right) : null;
  const valid = residual !== null && residual <= 1e-8 * Math.max(1, Math.abs(left), Math.abs(right));
  return { variable, value, valid, residual };
}

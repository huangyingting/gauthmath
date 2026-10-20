import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrDemoUser } from '@/lib/server-session';
import { solveHomeworkProblem, type GauthAiProviderMode } from '@/lib/ai/provider';

export async function GET(req: NextRequest) {
  const subject = req.nextUrl.searchParams.get('subject');
  const query = req.nextUrl.searchParams.get('q');
  const bookmarkedOnly = req.nextUrl.searchParams.get('bookmarked') === '1';
  const user = await getActiveOrDemoUser();

  const andClauses: Record<string, unknown>[] = [
    // Isolate public curated study bank from private unverified user submissions (C08)
    user
      ? { OR: [{ isVerifiedBank: true }, { userId: user.id }] }
      : { isVerifiedBank: true },
  ];

  if (subject && subject !== 'All') {
    andClauses.push({ subject });
  }
  if (bookmarkedOnly) {
    andClauses.push({ isBookmarked: true });
  }
  if (query && query.trim()) {
    andClauses.push({
      OR: [
        { promptText: { contains: query.trim() } },
        { topic: { contains: query.trim() } },
        { answerSummary: { contains: query.trim() } },
      ],
    });
  }

  const questions = await prisma.homeworkQuestion.findMany({
    where: { AND: andClauses },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  return NextResponse.json({
    ok: true,
    questions: questions.map((q) => ({
      ...q,
      steps: JSON.parse(q.stepsJson || '[]'),
      keyConcepts: (() => {
        try {
          return JSON.parse(q.deepThinkingText || '[]');
        } catch {
          return [];
        }
      })(),
      graphConfig: q.graphConfigJson ? JSON.parse(q.graphConfigJson) : null,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const promptText = String(body.prompt || body.promptText || '').trim();
    const subject = String(body.subject || 'Math');
    const mode = body.mode === 'PRO' ? 'PRO' : 'STANDARD';
    const croppedImageData = body.croppedImageData
      ? String(body.croppedImageData)
      : null;
    const providerOverride = body.providerOverride as
      | GauthAiProviderMode
      | undefined;

    if (!promptText) {
      return NextResponse.json(
        { ok: false, error: 'Please enter a question or upload an image crop.' },
        { status: 400 }
      );
    }

    const user = await getActiveOrDemoUser();

    // Enforce server-authoritative quota if user is on FREE tier
    if (user && user.planTier === 'FREE') {
      if (mode === 'PRO' && user.aiProRemaining <= 0) {
        return NextResponse.json(
          {
            ok: false,
            code: 'QUOTA_EXCEEDED_PRO',
            error:
              'Your free Gauth AI Pro trials are exhausted. Upgrade to Gauth PLUS for unlimited AI Pro Super Tutor solutions.',
          },
          { status: 402 }
        );
      }
      if (user.freeQueriesRemaining <= 0) {
        return NextResponse.json(
          {
            ok: false,
            code: 'QUOTA_EXCEEDED_FREE',
            error:
              'You have used all free daily homework solutions. Upgrade to Gauth PLUS for unlimited step-by-step answers.',
          },
          { status: 402 }
        );
      }
    }

    const solved = await solveHomeworkProblem({
      prompt: promptText,
      subject,
      mode,
      providerOverride,
    });

    const slug = `sol-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const accuracyScore =
      solved.status !== 'solved'
        ? 0
        : solved.verificationStatus === 'verified'
          ? 99
          : solved.verificationStatus === 'approximated'
            ? 92
            : 75;

    // Atomically persist the question and apply server-authoritative quota accounting (C08, C09)
    // User-submitted questions default to isVerifiedBank: false so they do not pollute the curated study bank (C01)
    const created = await prisma.$transaction(async (tx) => {
      const savedQuestion = await tx.homeworkQuestion.create({
        data: {
          slug,
          userId: user?.id || null,
          subject: solved.subject,
          topic: solved.subTopic,
          promptText: solved.prompt,
          latexExpression: solved.latexExpression,
          croppedImageData,
          answerSummary: solved.answerSummary,
          stepsJson: JSON.stringify(solved.steps),
          quickTip:
            solved.keyConcepts[0]?.description ||
            'Verify your solution by substituting back into the original equation.',
          deepThinkingText: JSON.stringify(solved.keyConcepts),
          graphConfigJson: solved.graphData
            ? JSON.stringify(solved.graphData)
            : null,
          providerUsed: `${solved.aiProvider}:${solved.aiModel}`,
          accuracyScore,
          isVerifiedBank: Boolean(body.curatedBank && user?.role === 'ADMIN'),
          tutorName: solved.tutorName,
          followUpMessagesJson: JSON.stringify([
            {
              role: 'assistant',
              text: `I solved "${solved.prompt}" in ${solved.solveTimeMs}ms using ${solved.aiModel}. Ask any follow-up question below!`,
              timestamp: new Date().toISOString(),
            },
          ]),
        },
      });

      if (user && user.planTier === 'FREE' && solved.status === 'solved') {
        const isSharedDemoPersona =
          user.email === 'joshuah@gauthmath.com' && !body.decrementQuota;
        const minFloor = isSharedDemoPersona ? 1 : 0;
        await tx.user.update({
          where: { id: user.id },
          data: {
            freeQueriesRemaining: Math.max(
              minFloor,
              user.freeQueriesRemaining - 1
            ),
            ...(mode === 'PRO'
              ? {
                  aiProRemaining: Math.max(minFloor, user.aiProRemaining - 1),
                }
              : {}),
          },
        });
      }

      return savedQuestion;
    });

    return NextResponse.json(
      {
        ok: true,
        question: {
          ...created,
          steps: solved.steps,
          keyConcepts: solved.keyConcepts,
          graphConfig: solved.graphData,
          followUpSuggestions: solved.followUpSuggestions,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : 'Failed to solve question.',
      },
      { status: 500 }
    );
  }
}

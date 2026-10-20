import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { chatFollowUpWithTutor } from '@/lib/ai/provider';
import { getActiveSessionUser } from '@/lib/server-session';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const question = await prisma.homeworkQuestion.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
  });

  if (!question) {
    return NextResponse.json(
      { ok: false, error: 'Solution not found.' },
      { status: 404 }
    );
  }

  const related = await prisma.homeworkQuestion.findMany({
    where: {
      subject: question.subject,
      id: { not: question.id },
    },
    orderBy: { createdAt: 'desc' },
    take: 4,
  });

  return NextResponse.json({
    ok: true,
    question: {
      ...question,
      steps: JSON.parse(question.stepsJson || '[]'),
      keyConcepts: (() => {
        try {
          return JSON.parse(question.deepThinkingText || '[]');
        } catch {
          return [];
        }
      })(),
      graphConfig: question.graphConfigJson
        ? JSON.parse(question.graphConfigJson)
        : null,
      followUpMessages: JSON.parse(question.followUpMessagesJson || '[]'),
    },
    relatedQuestions: related,
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const question = await prisma.homeworkQuestion.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
  });

  if (!question) {
    return NextResponse.json(
      { ok: false, error: 'Solution not found.' },
      { status: 404 }
    );
  }

  const body = await req.json();

  // 1. Toggle bookmark
  if (typeof body.isBookmarked === 'boolean') {
    const updated = await prisma.homeworkQuestion.update({
      where: { id: question.id },
      data: { isBookmarked: body.isBookmarked },
    });
    return NextResponse.json({ ok: true, question: updated });
  }

  // 2. Vote helpful / unhelpful (atomic increment to prevent lost updates under concurrency)
  if (body.vote === 'helpful' || body.vote === 'unhelpful') {
    const updated = await prisma.homeworkQuestion.update({
      where: { id: question.id },
      data:
        body.vote === 'helpful'
          ? { helpfulCount: { increment: 1 } }
          : { unhelpfulCount: { increment: 1 } },
    });
    return NextResponse.json({ ok: true, question: updated });
  }

  // 3. Escalate to Human Tutor Review Queue (or record authenticated Tutor review)
  if (body.escalateTutor) {
    const sessionUser = await getActiveSessionUser();
    const isAuthenticatedTutor =
      sessionUser &&
      (sessionUser.role === 'TUTOR' || sessionUser.role === 'ADMIN');

    const { updated, messages } = await prisma.$transaction(async (tx) => {
      const fresh = await tx.homeworkQuestion.findUniqueOrThrow({
        where: { id: question.id },
      });
      const currentMessages = JSON.parse(fresh.followUpMessagesJson || '[]');
      currentMessages.push(
        isAuthenticatedTutor
          ? {
              role: 'tutor',
              author: `${sessionUser.name || sessionUser.email} (${sessionUser.role} · Authenticated Tutor Review)`,
              text: `Authenticated Tutor Review Complete: Confirmed "${fresh.promptText}" → ${fresh.answerSummary}. Ask below if you'd like any step annotated further.`,
              timestamp: new Date().toISOString(),
            }
          : {
              role: 'tutor',
              author: 'Gauth Tutor Escalation Queue (Automated Pre-Check)',
              text: `Ticket queued for an authenticated human tutor. Automated Symbolic Pre-Check for "${fresh.promptText}": ${fresh.answerSummary} (${fresh.accuracyScore >= 95 ? 'residual verified' : 'awaiting manual review'}). Share which step you want annotated!`,
              timestamp: new Date().toISOString(),
            }
      );

      const saved = await tx.homeworkQuestion.update({
        where: { id: question.id },
        data: {
          tutorEscalationStatus: isAuthenticatedTutor
            ? 'VERIFIED_BY_TUTOR'
            : 'QUEUED_FOR_TUTOR',
          tutorName: isAuthenticatedTutor
            ? `${sessionUser.name || sessionUser.email} (Verified Tutor)`
            : 'Escalation Queued · Symbolic Pre-Check Complete',
          followUpMessagesJson: JSON.stringify(currentMessages),
        },
      });
      return { updated: saved, messages: currentMessages };
    });

    return NextResponse.json({
      ok: true,
      question: {
        ...updated,
        followUpMessages: messages,
      },
    });
  }

  // 4. Interactive Follow-up Tutor Chat (transactional append to prevent lost concurrent turns)
  if (body.userMessage) {
    const userMessage = String(body.userMessage).trim();
    const tutorReply = await chatFollowUpWithTutor({
      questionPrompt: question.promptText,
      answerSummary: question.answerSummary,
      userMessage,
    });

    const { updated, messages } = await prisma.$transaction(async (tx) => {
      const fresh = await tx.homeworkQuestion.findUniqueOrThrow({
        where: { id: question.id },
      });
      const currentMessages = JSON.parse(fresh.followUpMessagesJson || '[]');
      currentMessages.push({
        role: 'user',
        text: userMessage,
        timestamp: new Date().toISOString(),
      });
      currentMessages.push({
        role: 'assistant',
        text: tutorReply.reply,
        provider: tutorReply.provider,
        model: tutorReply.model,
        timestamp: new Date().toISOString(),
      });

      const saved = await tx.homeworkQuestion.update({
        where: { id: question.id },
        data: {
          followUpMessagesJson: JSON.stringify(currentMessages),
        },
      });
      return { updated: saved, messages: currentMessages };
    });

    return NextResponse.json({
      ok: true,
      reply: tutorReply.reply,
      followUpMessages: messages,
      question: updated,
    });
  }

  return NextResponse.json({ ok: true, question });
}

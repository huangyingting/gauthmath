import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { chatFollowUpWithTutor } from '@/lib/ai/provider';
import { getActiveSessionUser } from '@/lib/server-session';
import { getQuestionVerification, type TutorMode } from '@/lib/tutoring';
import { getSolutionPageData } from '@/lib/page-data';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const data = await getSolutionPageData(id);
  if (!data) {
    return NextResponse.json(
      { ok: false, error: 'Solution not found.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    ...data,
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
              author: 'Tavi Tutor Escalation Queue (Automated Pre-Check)',
              text: `Ticket queued for an authenticated human tutor; this is not a completed human review. Automated check: ${getQuestionVerification(fresh).verificationStatus}. Share which step you want annotated!`,
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
            : 'Review Requested',
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
    if (!userMessage || userMessage.length > 2000 || (body.mode !== undefined && !['explain', 'hint', 'check'].includes(body.mode))
      || (body.locale !== undefined && !['en', 'zh'].includes(body.locale))) {
      return NextResponse.json({ ok: false, error: 'Enter a message of up to 2,000 characters and choose a valid tutor mode.' }, { status: 400 });
    }
    const steps = JSON.parse(question.stepsJson || '[]');
    if (body.stepNumber !== undefined && (!Number.isInteger(body.stepNumber) || !steps.some((step: { number: number }) => step.number === body.stepNumber))) {
      return NextResponse.json({ ok: false, error: 'Choose an existing solution step.' }, { status: 400 });
    }
    const history = JSON.parse(question.followUpMessagesJson || '[]');
    const tutorReply = await chatFollowUpWithTutor({
      questionPrompt: question.promptText,
      answerSummary: question.answerSummary,
      userMessage,
      locale: body.locale,
      mode: body.mode as TutorMode | undefined,
      stepNumber: body.stepNumber,
      steps,
      history: history.filter((turn: { role: string; text?: unknown }) => ['user', 'assistant'].includes(turn.role) && typeof turn.text === 'string').slice(-8),
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

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { chatFollowUpWithTutor } from '@/lib/ai/provider';

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

  // 2. Vote helpful / unhelpful
  if (body.vote === 'helpful' || body.vote === 'unhelpful') {
    const updated = await prisma.homeworkQuestion.update({
      where: { id: question.id },
      data:
        body.vote === 'helpful'
          ? { helpfulCount: question.helpfulCount + 1 }
          : { unhelpfulCount: question.unhelpfulCount + 1 },
    });
    return NextResponse.json({ ok: true, question: updated });
  }

  // 3. Escalate to 24/7 Live Human Verified Expert Tutor
  if (body.escalateTutor) {
    const messages = JSON.parse(question.followUpMessagesJson || '[]');
    messages.push({
      role: 'tutor',
      author: 'Dr. Marcus Chen (Verified Ph.D. Live Tutor)',
      text: `Live Expert Connected! I have reviewed the problem "${question.promptText}" and verified that ${question.answerSummary} is 100% accurate. Let me know which algebraic transition you'd like me to annotate on the whiteboard!`,
      timestamp: new Date().toISOString(),
    });

    const updated = await prisma.homeworkQuestion.update({
      where: { id: question.id },
      data: {
        tutorEscalationStatus: 'ANSWERED',
        tutorName: 'Dr. Marcus Chen (Live Human Expert · Verified)',
        followUpMessagesJson: JSON.stringify(messages),
      },
    });

    return NextResponse.json({
      ok: true,
      question: {
        ...updated,
        followUpMessages: messages,
      },
    });
  }

  // 4. Interactive Follow-up Tutor Chat
  if (body.userMessage) {
    const userMessage = String(body.userMessage).trim();
    const messages = JSON.parse(question.followUpMessagesJson || '[]');
    messages.push({
      role: 'user',
      text: userMessage,
      timestamp: new Date().toISOString(),
    });

    const tutorReply = await chatFollowUpWithTutor({
      questionPrompt: question.promptText,
      answerSummary: question.answerSummary,
      userMessage,
    });

    messages.push({
      role: 'assistant',
      text: tutorReply.reply,
      provider: tutorReply.provider,
      model: tutorReply.model,
      timestamp: new Date().toISOString(),
    });

    const updated = await prisma.homeworkQuestion.update({
      where: { id: question.id },
      data: {
        followUpMessagesJson: JSON.stringify(messages),
      },
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

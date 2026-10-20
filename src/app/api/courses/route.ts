import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { chatFollowUpWithTutor } from '@/lib/ai/provider';

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category');
  const where = category && category !== 'All' ? { category } : {};

  const courses = await prisma.academyCourse.findMany({
    where,
    orderBy: { viewsCount: 'desc' },
  });

  return NextResponse.json({
    ok: true,
    courses: courses.map((c) => ({
      ...c,
      slides: JSON.parse(c.chaptersJson || '[]'),
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const slug = String(body.slug || '');
  const question = String(body.question || '').trim();

  if (!slug || !question) {
    return NextResponse.json(
      { ok: false, error: 'Course slug and question are required.' },
      { status: 400 }
    );
  }

  const course = await prisma.academyCourse.findUnique({ where: { slug } });
  if (!course) {
    return NextResponse.json(
      { ok: false, error: 'Course not found.' },
      { status: 404 }
    );
  }

  const reply = await chatFollowUpWithTutor({
    questionPrompt: course.title,
    answerSummary: course.summary,
    userMessage: question,
  });

  return NextResponse.json({
    ok: true,
    reply: reply.reply,
    provider: reply.provider,
    model: reply.model,
  });
}

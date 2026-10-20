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

  const slides = JSON.parse(course.chaptersJson || '[]') as Array<{
    title?: string;
    formula?: string;
    content?: string;
    explanation?: string;
  }>;
  const slideIdx =
    typeof body.slideIndex === 'number' &&
    body.slideIndex >= 0 &&
    body.slideIndex < slides.length
      ? body.slideIndex
      : 0;
  const activeSlide = slides[slideIdx];
  const slideContext = activeSlide
    ? `Slide ${slideIdx + 1}: "${activeSlide.title || body.slideTitle || ''}" | Formula: ${activeSlide.formula || body.slideFormula || 'N/A'} | Key Idea: ${activeSlide.content || activeSlide.explanation || course.summary}`
    : undefined;

  const reply = await chatFollowUpWithTutor({
    questionPrompt: course.title,
    answerSummary: activeSlide?.formula
      ? `${course.summary} (Active Formula: ${activeSlide.formula})`
      : course.summary,
    userMessage: question,
    slideContext,
  });

  return NextResponse.json({
    ok: true,
    reply: reply.reply,
    provider: reply.provider,
    model: reply.model,
    slideContext,
  });
}

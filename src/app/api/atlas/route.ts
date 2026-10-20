import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { chatFollowUpWithTutor } from '@/lib/ai/provider';

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category');
  const where = category && category !== 'All' ? { category } : {};

  const stories = await prisma.atlasStory.findMany({
    where,
    orderBy: { viewsCount: 'desc' },
  });

  return NextResponse.json({
    ok: true,
    stories: stories.map((s) => ({
      ...s,
      chapters: JSON.parse(s.hotspotsJson || '[]'),
      quiz: JSON.parse(s.sourcesJson || '{}'),
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // 1. Source-grounded AI Q&A on an Atlas Visual Story (C12)
  if (body.action === 'ask_concept' && body.slug && body.question) {
    const story = await prisma.atlasStory.findUnique({
      where: { slug: String(body.slug) },
    });
    if (!story) {
      return NextResponse.json(
        { ok: false, error: 'Atlas story not found.' },
        { status: 404 }
      );
    }
    const chapters = JSON.parse(story.hotspotsJson || '[]') as Array<{
      heading?: string;
      body?: string;
      statCallout?: string;
    }>;
    const chapterSummary = chapters
      .map((c) => `${c.heading}: ${c.statCallout} (${c.body})`)
      .join(' | ');

    const tutor = await chatFollowUpWithTutor({
      questionPrompt: story.title,
      answerSummary: story.summary,
      userMessage: String(body.question).trim(),
      slideContext: chapterSummary,
    });

    return NextResponse.json({
      ok: true,
      reply: tutor.reply,
      provider: tutor.provider,
      model: tutor.model,
      citation: `${story.title} (${story.category})`,
    });
  }

  // 2. Increment view count for a story
  if (body.slug) {
    const updated = await prisma.atlasStory.update({
      where: { slug: String(body.slug) },
      data: { viewsCount: { increment: 1 } },
    });
    return NextResponse.json({ ok: true, story: updated });
  }
  return NextResponse.json({ ok: false, error: 'Missing slug' }, { status: 400 });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category');
  const where =
    category && category !== 'All' ? { category } : {};

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
  if (body.slug) {
    const updated = await prisma.atlasStory.update({
      where: { slug: String(body.slug) },
      data: { viewsCount: { increment: 1 } },
    });
    return NextResponse.json({ ok: true, story: updated });
  }
  return NextResponse.json({ ok: false, error: 'Missing slug' }, { status: 400 });
}

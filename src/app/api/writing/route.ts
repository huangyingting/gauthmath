import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeWritingDocument } from '@/lib/ai/provider';
import { getActiveOrDemoUser } from '@/lib/server-session';

export async function GET(req: NextRequest) {
  const genre = req.nextUrl.searchParams.get('genre');
  const user = await getActiveOrDemoUser();
  const andClauses: Record<string, unknown>[] = [
    user
      ? { OR: [{ isCuratedExample: true }, { userId: user.id }] }
      : { isCuratedExample: true },
  ];
  if (genre && genre !== 'All') {
    andClauses.push({ genre });
  }

  const documents = await prisma.writingDocument.findMany({
    where: { AND: andClauses },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    ok: true,
    documents: documents.map((d) => ({
      ...d,
      annotations: JSON.parse(d.annotationsJson || '[]'),
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body.title || 'Untitled Academic Essay').trim();
    const genre = String(body.genre || 'Argumentative Essay');
    const content = String(body.content || '').trim();
    const action = (body.action || 'grade') as 'grade' | 'polish' | 'outline';

    if (!content) {
      return NextResponse.json(
        { ok: false, error: 'Essay content is required.' },
        { status: 400 }
      );
    }

    const analysis = await analyzeWritingDocument({
      title,
      category: genre,
      content,
      action,
    });

    const user = await getActiveOrDemoUser();
    const slug = `essay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const doc = await prisma.writingDocument.create({
      data: {
        slug,
        userId: user?.id || null,
        title,
        genre,
        gradeLevel: 'University / AP',
        wordCount: analysis.wordCount,
        promptText: `Analyze ${genre}: ${title}`,
        contentText: analysis.polishedContent,
        aiScore: analysis.overallScore,
        annotationsJson: JSON.stringify(analysis.annotations),
        isCuratedExample: false,
      },
    });

    return NextResponse.json({
      ok: true,
      analysis,
      document: {
        ...doc,
        annotations: analysis.annotations,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : 'Writing analysis failed.',
      },
      { status: 500 }
    );
  }
}

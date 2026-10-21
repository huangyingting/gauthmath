import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/server-session';
import { getQuestionVerification } from '@/lib/tutoring';
import type { AcademyCourseItem } from '@/app/course/CoursePageClient';
import type { AtlasStoryItem } from '@/app/atlas/AtlasPageClient';
import type { WritingDoc } from '@/app/writing-examples/WritingPageClient';
import type { QuestionDetail } from '@/app/solution/[id]/SolutionPageClient';

export function studyQuestionWhere(userId: string | undefined, filters: { subject?: string | null; query?: string | null; bookmarkedOnly?: boolean } = {}): Prisma.HomeworkQuestionWhereInput {
  const conditions: Prisma.HomeworkQuestionWhereInput[] = [
    userId ? { OR: [{ isVerifiedBank: true }, { userId }] } : { isVerifiedBank: true },
  ];
  if (filters.subject && filters.subject !== 'All') conditions.push({ subject: filters.subject });
  if (filters.bookmarkedOnly) conditions.push({ isBookmarked: true });
  const query = filters.query?.trim();
  if (query) conditions.push({ OR: [{ promptText: { contains: query } }, { topic: { contains: query } }, { answerSummary: { contains: query } }] });
  return { AND: conditions };
}

export async function getQuestionSummaries(subject?: string) {
  const user = await getActiveSessionUser();
  return prisma.homeworkQuestion.findMany({
    where: studyQuestionWhere(user?.id, { subject }),
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { id: true, slug: true, subject: true, topic: true, promptText: true, answerSummary: true, isBookmarked: true },
  });
}

export type QuestionSummary = Awaited<ReturnType<typeof getQuestionSummaries>>[number];

export async function getCourses(category?: string | null): Promise<AcademyCourseItem[]> {
  const courses = await prisma.academyCourse.findMany({
    where: category && category !== 'All' ? { category } : {},
    orderBy: { viewsCount: 'desc' },
  });
  return courses.map(course => ({ ...course, slides: JSON.parse(course.chaptersJson || '[]') }));
}

export async function getAtlasStories(category?: string | null): Promise<AtlasStoryItem[]> {
  const stories = await prisma.atlasStory.findMany({
    where: category && category !== 'All' ? { category } : {},
    orderBy: { viewsCount: 'desc' },
  });
  return stories.map(story => ({ ...story, chapters: JSON.parse(story.hotspotsJson || '[]'), quiz: JSON.parse(story.sourcesJson || '{}') }));
}

export async function getWritingDocuments(genre?: string | null): Promise<WritingDoc[]> {
  const user = await getActiveSessionUser();
  const conditions: Prisma.WritingDocumentWhereInput[] = [
    user ? { OR: [{ isCuratedExample: true }, { userId: user.id }] } : { isCuratedExample: true },
  ];
  if (genre && genre !== 'All') conditions.push({ genre });
  const documents = await prisma.writingDocument.findMany({ where: { AND: conditions }, orderBy: { createdAt: 'desc' } });
  return documents.map(document => ({ ...document, annotations: JSON.parse(document.annotationsJson || '[]') }));
}

export async function getSolutionPageData(id: string) {
  const stored = await prisma.homeworkQuestion.findFirst({ where: { OR: [{ id }, { slug: id }] } });
  if (!stored) return null;
  const relatedQuestions = await prisma.homeworkQuestion.findMany({
    where: { subject: stored.subject, id: { not: stored.id } },
    orderBy: { createdAt: 'desc' },
    take: 4,
  });
  let concepts: QuestionDetail['keyConcepts'];
  try { concepts = JSON.parse(stored.deepThinkingText || '[]'); }
  catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    console.warn('[questions] Saved key concepts could not be parsed.');
    concepts = [];
  }
  const question = {
    ...stored,
    ...getQuestionVerification(stored),
    steps: JSON.parse(stored.stepsJson || '[]'),
    keyConcepts: concepts,
    graphConfig: stored.graphConfigJson ? JSON.parse(stored.graphConfigJson) : null,
    followUpMessages: JSON.parse(stored.followUpMessagesJson || '[]'),
  } satisfies QuestionDetail;
  return { question, relatedQuestions };
}

export async function getSubscriptionData() {
  const user = await getActiveSessionUser();
  return {
    user: user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null,
    subscription: user ? {
      planTier: user.planTier, billingCycle: user.billingCycle, freeQueriesRemaining: user.freeQueriesRemaining,
      aiProRemaining: user.aiProRemaining, courseCreditsRemaining: user.courseCreditsRemaining,
    } : { planTier: 'FREE', billingCycle: 'yearly', freeQueriesRemaining: 3, aiProRemaining: 1, courseCreditsRemaining: 3 },
  };
}

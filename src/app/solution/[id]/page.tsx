import SolutionDetailPage from './SolutionPageClient';
import { getSolutionPageData } from '@/lib/page-data';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getSolutionPageData(id);
  return <SolutionDetailPage key={id} initialQuestion={data?.question || null} related={data?.relatedQuestions || []} />;
}

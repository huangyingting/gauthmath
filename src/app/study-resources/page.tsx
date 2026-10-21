import StudyResourcesPage from './ResourcesPageClient';
import { getQuestionSummaries } from '@/lib/page-data';

export default async function Page() {
  return <StudyResourcesPage initialQuestions={await getQuestionSummaries('Math')} />;
}

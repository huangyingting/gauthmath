import SearchQuestionPage from './SearchPageClient';
import { getQuestionSummaries } from '@/lib/page-data';

export default async function Page() {
  return <SearchQuestionPage initialQuestions={await getQuestionSummaries()} />;
}

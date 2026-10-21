import WritingExamplesPage from './WritingPageClient';
import { getWritingDocuments } from '@/lib/page-data';

export default async function Page() {
  return <WritingExamplesPage documents={await getWritingDocuments()} />;
}

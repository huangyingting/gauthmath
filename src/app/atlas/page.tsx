import AtlasPage from './AtlasPageClient';
import { getAtlasStories } from '@/lib/page-data';

export default async function Page() {
  return <AtlasPage stories={await getAtlasStories()} />;
}

import TaviPlusPage from './PlusPageClient';
import { getSubscriptionData } from '@/lib/page-data';

export default async function Page() {
  return <TaviPlusPage initialSubscription={(await getSubscriptionData()).subscription} />;
}

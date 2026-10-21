import AcademyCoursePage from './CoursePageClient';
import { getCourses } from '@/lib/page-data';

export default async function Page() {
  return <AcademyCoursePage courses={await getCourses()} />;
}

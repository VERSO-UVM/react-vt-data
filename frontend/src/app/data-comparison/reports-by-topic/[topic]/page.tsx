import { notFound } from 'next/navigation';

import ReportsByTopic from '../ReportsByTopic';
import { TOPIC_SLUGS, sectionFromSlug } from '../topics';

export function generateStaticParams() {
  return Object.values(TOPIC_SLUGS).map((topic) => ({ topic }));
}

export default async function ReportsByTopicTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const section = sectionFromSlug(topic);
  if (!section) {
    notFound();
  }
  return <ReportsByTopic section={section} />;
}

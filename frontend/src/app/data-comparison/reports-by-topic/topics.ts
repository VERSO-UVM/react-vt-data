/**
 * @description
 *   The Reports by Topic sections and their URL slugs. Each topic has its own
 *   statically exported page at /data-comparison/reports-by-topic/<slug>/, so
 *   a reload or a shared link opens the same report. Kept free of 'use client'
 *   so the [topic] route's generateStaticParams can import it.
 */

export type DashboardSection =
  | 'Demographics'
  | 'Housing'
  //| 'Education'
  | 'Labor & Economy'
  | 'Land Use'
  | 'Community Health';

export const TOPIC_SLUGS: Record<DashboardSection, string> = {
  Demographics: 'demographics',
  Housing: 'housing',
  'Labor & Economy': 'labor-economy',
  'Land Use': 'land-use',
  'Community Health': 'community-health',
};

export const DEFAULT_SECTION: DashboardSection = 'Demographics';

export function sectionFromSlug(slug: string): DashboardSection | undefined {
  return (Object.keys(TOPIC_SLUGS) as DashboardSection[]).find(
    (s) => TOPIC_SLUGS[s] === slug,
  );
}

export function topicPath(section: DashboardSection): string {
  return `/data-comparison/reports-by-topic/${TOPIC_SLUGS[section]}/`;
}

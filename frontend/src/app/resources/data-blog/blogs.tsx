import { TEAM, type TeamMember } from '@/app/about/team/team';

export type Blog = {
  title: string;
  summary: string;
  author: TeamMember;
  date: string;
  source: string;
  slug: string;
  tags: string[];
  published: boolean;
};

// Placeholders until the first posts go out — flip `published` and add a
// content/<slug>/content.docx to make one live. For interactive charts, add
// content/<slug>/charts.json and put a [chart:<id>] paragraph in the docx.
export const BLOGS: Blog[] = [
  {
    title: "Vermont's Community Health Indicators",
    summary:
      'Exploring the state of community health indicators in Vermont and their impact on public health policy.',
    author: TEAM[5],
    date: 'November 15th, 2026',
    source: 'CDC PLACES',
    slug: 'vermont-community-health-indicators',
    tags: ['Community Health', 'Poverty', 'Health Insurance'],
    published: false,
  },
];

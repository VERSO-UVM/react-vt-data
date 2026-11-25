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
    title: 'A Data Snapshot of the Northeast Kingdom',
    summary:
      "A county-by-county look at population change, housing costs, disability, poverty, and education in Vermont's Essex, Caledonia, and Orleans counties.",
    author: TEAM[5],
    date: 'November 25th, 2026',
    source: 'Census ACS 5-Year Estimates',
    slug: 'northeast-kingdom-snapshot',
    tags: [
      'Community Health',
      'Demographics',
      'Housing',
      'Disability',
      'Education',
      'Poverty',
    ],
    published: true,
  },
];

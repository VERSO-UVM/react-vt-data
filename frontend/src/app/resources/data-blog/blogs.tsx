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
  {
    title: 'Who Can Afford to Rent in Vermont?',
    summary:
      'A town-by-town look at rent burden and how it has shifted over the last decade of ACS estimates.',
    author: TEAM[2],
    date: 'December 2026',
    source: 'Census ACS-5',
    slug: 'vermont-rent-burden',
    tags: ['Housing'],
    published: false,
  },
  {
    title: 'Building in the Floodplain',
    summary:
      'Mapping where housing and flood hazard overlap, and what the 2023 floods revealed about exposure.',
    author: TEAM[1],
    date: 'January 2027',
    source: 'FEMA NFHL',
    slug: 'building-in-the-floodplain',
    tags: ['Flood Hazard', 'Housing'],
    published: false,
  },
];

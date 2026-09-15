import { TEAM, type TeamMember } from '@/app/about/team/team';

export type WhitePaper = {
  title: string;
  summary: string;
  author: TeamMember;
  date: string;
  slug: string;
  published: boolean;
};

export const WHITE_PAPERS: WhitePaper[] = [
  {
    title: 'The Challenge of Rural Data',
    summary:
      'Why rural communities are chronically underrepresented in public data, and what that means for planning and policy.',
    author: TEAM[5],
    date: 'September 15th, 2026',
    slug: 'the-challenge-of-rural-data',
    published: true,
  },

  {
    title: 'Rural Data Infrastructure',
    summary:
      'How the Vermont Data Collaborative collects, standardizes, and connects public datasets across the state.',
    author: TEAM[5],
    slug: 'rural-data-infrastructure',
    date: 'September 20th, 2026',
    published: true,
  },
];

// theme.ts
import { createTheme, type MantineColorsTuple } from '@mantine/core';

export const COLORS = {
  spruce: '#1B3A2F',
  spruceDeep: '#122820',
  slate: '#40525A',
  birch: '#F6F5EF',
  birchDim: '#EEEBE0',
  ink: '#1B211D',
  amber: '#dd9a2f',
  amberSoft: '#E7B563',
  red: '#b13434',
  line: 'rgba(27, 58, 47, 0.14)',
} as const;

export const FONTS = {
  display: "'Satoshi', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'IBM Plex Mono', monospace",
} as const;

// Brand palette for Mantine (light → dark). Shade 8 is COLORS.spruce, so
// anything using the primary color (filled buttons, checkboxes, loaders, …)
// renders spruce; shade 9 (spruceDeep) is its hover.
const spruce: MantineColorsTuple = [
  '#eef4f1',
  '#dce8e2',
  '#b8d0c4',
  '#92b7a5',
  '#6f9f88',
  '#52876f',
  '#3d6f59',
  '#2b5544',
  COLORS.spruce,
  COLORS.spruceDeep,
];

export const theme = createTheme({
  colors: { spruce },
  primaryColor: 'spruce',
  primaryShade: 8,
  fontFamily: 'var(--font-zilla-slab), Georgia, serif',
  headings: {
    fontFamily: 'var(--font-zilla-slab), Georgia, serif',
  },
  components: {
    Button: {
      defaultProps: { radius: 'md', size: 'md' },
    },
  },
});

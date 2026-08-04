// theme.ts
import { createTheme } from '@mantine/core';

export const COLORS = {
  spruce: '#1B3A2F',
  spruceDeep: '#122820',
  slate: '#40525A',
  birch: '#F6F5EF',
  birchDim: '#EEEBE0',
  ink: '#1B211D',
  amber: '#dd9a2f',
  amberSoft: '#E7B563',
  amberYellow: '#FFD100',
  line: 'rgba(27, 58, 47, 0.14)',
} as const;

export const FONTS = {
  display: "'Satoshi', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'IBM Plex Mono', monospace",
} as const;

export const theme = createTheme({
  primaryColor: 'green',
  primaryShade: 9,
  fontFamily: 'var(--font-zilla-slab), Georgia, serif',
  headings: {
    fontFamily: 'var(--font-zilla-slab), Georgia, serif',
  },
  components: {
    Button: {
      defaultProps: { color: 'green', radius: 'md', size: 'md' },
    },
  },
});

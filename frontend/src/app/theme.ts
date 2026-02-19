// theme.ts
import { createTheme } from '@mantine/core';

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

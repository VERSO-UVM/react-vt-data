// theme.ts
import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'blue',
  components: {
    Button: {
      defaultProps: { color: 'green', radius: 'md', size: 'md' },
    },
  },
});

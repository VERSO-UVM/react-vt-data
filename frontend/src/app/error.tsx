'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { Container, Title, Text, Button, Group, Box } from '@mantine/core';
import { COLORS, FONTS } from '@/app/theme';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error
    console.error('Captured App Error:', error);
  }, [error]);

  return (
    <Container size="xl" p="xl" mt={100}>
      <Box style={{ textAlign: 'center' }} py={40}>
        <Title fw={2200} c={COLORS.spruce} mb="md" ff={FONTS.mono}>
          Uh Oh! Something went wrong!
        </Title>

        <Text size="lg" c="dimmed" maw={500} mx="auto" mb="xl" ff={FONTS.mono}>
          {error.message ||
            'An unexpected runtime error occurred while processing your request.'}
        </Text>

        {error.digest && (
          <Text
            size="xs"
            c="dimmed"
            ff="monospace"
            bg="var(--mantine-color-gray-1)"
            p="xs"
            style={{ borderRadius: '4px' }}
            mb="xl"
          >
            Error ID: {error.digest}
          </Text>
        )}

        <Group justify="center">
          <Button
            size="md"
            style={{ color: COLORS.birchDim, fontFamily: FONTS.mono }}
            onClick={() => reset()}
          >
            Try again
          </Button>
        </Group>
      </Box>
    </Container>
  );
}

'use client';

import Link from 'next/link';
import { COLORS, FONTS } from '@/app/theme';
import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Box,
  Stack,
} from '@mantine/core';

export default function NotFound() {
  return (
    <Container size="md" py={80}>
      <Stack
        gap="xl"
        align="center"
        style={{ minHeight: '60vh', justifyContent: 'center' }}
      >
        <Box
          c="gray.3"
          style={{
            fontSize: 'calc(4rem + 4vw)',
            fontWeight: 900,
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          404
        </Box>
        <Stack
          gap="md"
          align="center"
          style={{ textAlign: 'center', maxWidth: 540 }}
        >
          <Title
            order={1}
            style={{
              fontFamily: FONTS.display,
              fontSize: 'calc(1.5rem + 1vw)',
              fontWeight: 800,
            }}
          >
            Endpoint Not Found
          </Title>

          <Text c="dimmed" size="lg">
            The dataset, tool, or page you are looking for does not exist or has
            been relocated within our website.
          </Text>
        </Stack>
        <Group justify="center" gap="md">
          <Button
            component={Link}
            href="/"
            size="md"
            variant="filled"
            color={COLORS.spruce}
          >
            Return to Dashboard
          </Button>

          <Button
            component={Link}
            href="/data-viewer"
            size="md"
            variant="light"
            color={COLORS.amberSoft}
          >
            Browse Data
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}

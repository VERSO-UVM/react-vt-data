'use client';

import {
  Badge,
  Card,
  Center,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import Link from 'next/link';

const TOOLS = [
  {
    href: '/tools/benefits-estimator',
    label: 'Vermont Benefits Estimator',
    description:
      'Estimate eligibility for Three Squares VT (SNAP), Medicaid, ' +
      'Dr. Dynasaur, and Child Care Financial Assistance based on household ' +
      'income and composition.',
    badge: 'Beta',
  },
];

export default function ToolsPage() {
  return (
    <Stack gap="xl">
      <Center pt="xl" mb="xs">
        <Title order={2}>Tools</Title>
      </Center>
      <Center mb="xl">
        <Text c="dimmed" size="sm" maw={560} ta="center">
          Interactive calculators and utilities for Vermont livability planning.
        </Text>
      </Center>

      <SimpleGrid cols={{ base: 1, sm: 2 }} maw={900} mx="auto" px="md">
        {TOOLS.map((tool) => (
          <Card
            key={tool.href}
            component={Link}
            href={tool.href}
            withBorder
            radius="md"
            p="lg"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Group gap="xs" mb="xs">
              <Text fw={600}>{tool.label}</Text>
              {tool.badge && (
                <Badge color="orange" variant="filled" size="sm">
                  {tool.badge}
                </Badge>
              )}
            </Group>
            <Text size="sm" c="dimmed">
              {tool.description}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

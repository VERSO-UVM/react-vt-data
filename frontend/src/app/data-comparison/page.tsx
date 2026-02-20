'use client';

import {
  Center,
  Container,
  SimpleGrid,
  Text,
  Title,
  Card,
  Group,
} from '@mantine/core';
import Link from 'next/link';

const pages = [
  {
    href: '/data-comparison/b-tables',
    label: 'B-Table Comparison',
    description:
      'Compare two locations across ACS B-series summary tables: demographics, education, housing, labor force, and income. Defaults to your profile locations.',
  },
  {
    href: '/data-comparison/dp-explorer',
    label: 'DP Tables Explorer',
    description:
      'Drill into any variable across all DP-series tables (DP02–DP05) via a cascading filter: table → category → subcategory → variable → measure. Each side has its own location and year.',
  },
];

export default function DataComparisonHub() {
  return (
    <>
      <Center pt="xl" mb="md">
        <Title order={2}>Data Comparison &amp; Exploration</Title>
      </Center>
      <Container size="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {pages.map((p) => (
            <Card
              key={p.href}
              component={Link}
              href={p.href}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              style={{ textDecoration: 'none', cursor: 'pointer' }}
            >
              <Group mb="xs">
                <Text fw={600} size="lg">
                  {p.label}
                </Text>
              </Group>
              <Text size="sm" c="dimmed">
                {p.description}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      </Container>
    </>
  );
}

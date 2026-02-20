'use client';

import {
  Card,
  Center,
  Container,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import Link from 'next/link';

const pages = [
  {
    href: '/data-comparison/dp-explorer',
    label: 'Data Profile Comparison',
    tag: 'DP02 · DP03 · DP04 · DP05',
    description:
      'Comprehensive, high-level summary across all four Census Data Profile tables. Every published demographic, economic, housing, and social characteristic is browsable through a cascading filter (table → category → subcategory → variable → measure). Good for broad exploration and cross-topic comparisons. Each side has an independent location and year selector.',
  },
  {
    href: '/data-comparison/b-tables',
    label: 'Detailed Table Comparison',
    tag: 'B01001 · B15003 · B25 · B23 · B19',
    description:
      'A curated selection of detailed ACS B-series tables that offer more granular and age/sex-disaggregated breakdowns than the Data Profiles. Covers demographics, educational attainment, housing stock and value, labor force participation, and income. Defaults to your profile locations; shows a trend chart for the selected section over time.',
  },
];

export default function DataComparisonHub() {
  return (
    <>
      <Center pt="xl" mb="xs">
        <Title order={2}>Data Comparison &amp; Exploration</Title>
      </Center>
      <Center mb="xl">
        <Text c="dimmed" size="sm" maw={560} ta="center">
          Two complementary tools for comparing locations across American
          Community Survey data. Charts from either tool can be saved to the
          Working Report.
        </Text>
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
              <Stack gap="xs">
                <Text fw={600} size="lg">
                  {p.label}
                </Text>
                <Text size="xs" c="green.7" fw={500}>
                  {p.tag}
                </Text>
                <Text size="sm" c="dimmed">
                  {p.description}
                </Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Container>
    </>
  );
}

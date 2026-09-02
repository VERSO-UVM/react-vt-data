import { Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconUsers } from '@tabler/icons-react';
import { DataRow } from '@/types/cachedCharts';

interface PopulationCardProps {
  primary: DataRow[];
  comparison: DataRow[];
  primaryName?: string;
  comparisonName?: string;
}

function findValue(data: DataRow[], variable: string): number | null {
  const row = data.find((d) => d.Variable === variable);
  if (!row) return null;
  const value = Number(row.Value);
  return Number.isFinite(value) ? value : null;
}

export default function PopulationCard({
  primary,
  comparison,
  primaryName,
  comparisonName,
}: PopulationCardProps) {
  const primaryPopulation = findValue(primary, 'Population (ACS)');
  const comparisonPopulation = findValue(comparison, 'Population (ACS)');

  const difference =
    primaryPopulation !== null && comparisonPopulation !== null
      ? primaryPopulation - comparisonPopulation
      : null;

  const percentDifference =
    difference !== null && comparisonPopulation
      ? (difference / comparisonPopulation) * 100
      : null;

  return (
    <Card
      radius="xl"
      padding="lg"
      withBorder
      style={{
        height: '100%',
        transition: 'all 180ms ease',
        cursor: 'default',
      }}
    >
      <Group justify="space-between" mb="md">
        <Stack gap={2}>
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">
            Population
          </Text>

          <Title order={3}>{primaryPopulation?.toLocaleString() ?? '—'}</Title>
        </Stack>

        <ThemeIcon size={48} radius="xl" variant="light" color="blue">
          <IconUsers size={24} />
        </ThemeIcon>
      </Group>

      <Stack gap={4}>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {comparisonName ? `${comparisonName}` : 'Comparison'}
          </Text>

          <Text fw={600}>{comparisonPopulation?.toLocaleString() ?? '—'}</Text>
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Difference
          </Text>

          <Text
            fw={700}
            c={
              difference == null
                ? undefined
                : difference > 0
                  ? 'green'
                  : difference < 0
                    ? 'red'
                    : undefined
            }
          >
            {difference == null
              ? '—'
              : `${difference > 0 ? '+' : ''}${difference.toLocaleString()}`}
          </Text>
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Percent Difference
          </Text>

          <Text
            fw={700}
            c={
              percentDifference == null
                ? undefined
                : percentDifference > 0
                  ? 'green'
                  : percentDifference < 0
                    ? 'red'
                    : undefined
            }
          >
            {percentDifference == null
              ? '—'
              : `${percentDifference > 0 ? '+' : ''}${percentDifference.toFixed(1)}%`}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}

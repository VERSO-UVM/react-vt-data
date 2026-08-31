import { Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCalendarStats } from '@tabler/icons-react';
import { DataRow } from '@/types/cachedCharts';

interface MedianAgeCardProps {
  primary: DataRow[];
  comparison: DataRow[];
}

function getVariableValue(data: DataRow[], variable: string): number | null {
  const row = data.find((d) => d.Variable === variable);

  if (!row) return null;

  const value = Number(row.Value);

  return Number.isFinite(value) ? value : null;
}

export default function MedianAgeCard({
  primary,
  comparison,
}: MedianAgeCardProps) {
  const primaryAge = getVariableValue(primary, 'Median Age');
  const comparisonAge = getVariableValue(comparison, 'Median Age');

  const difference =
    primaryAge !== null && comparisonAge !== null
      ? primaryAge - comparisonAge
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
            Median Age
          </Text>

          <Title order={3}>
            {primaryAge !== null ? `${primaryAge.toFixed(1)} years` : '—'}
          </Title>
        </Stack>

        <ThemeIcon size={48} radius="xl" variant="light" color="violet">
          <IconCalendarStats size={24} />
        </ThemeIcon>
      </Group>

      <Stack gap={5}>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Comparison
          </Text>

          <Text fw={600}>
            {comparisonAge !== null ? `${comparisonAge.toFixed(1)} years` : '—'}
          </Text>
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Difference
          </Text>

          <Text
            fw={700}
            c={
              difference === null
                ? undefined
                : difference > 0
                  ? 'violet'
                  : 'blue'
            }
          >
            {difference === null
              ? '—'
              : `${difference > 0 ? '+' : ''}${difference.toFixed(1)} yrs`}
          </Text>
        </Group>

        <Text size="xs" c="dimmed" mt="xs">
          {difference === null
            ? ''
            : difference > 0
              ? 'Older median population'
              : difference < 0
                ? 'Younger median population'
                : 'Same median age'}
        </Text>
      </Stack>
    </Card>
  );
}

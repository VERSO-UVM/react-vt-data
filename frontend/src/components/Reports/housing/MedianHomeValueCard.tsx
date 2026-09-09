import { Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconHomeDollar } from '@tabler/icons-react';
import { DataRow } from '@/types/cachedCharts';

interface MedianHomeValueCardProps {
  primary: DataRow[];
  comparison: DataRow[];
  primaryName?: string;
  comparisonName?: string;
}

function getVariableValue(data: DataRow[], variable: string): number | null {
  const row = data.find((d) => d.Variable === variable);
  if (!row) return null;
  const value = Number(row.Value);
  return Number.isFinite(value) ? value : null;
}

export default function MedianHomeValueCard({
  primary,
  comparison,
  primaryName,
  comparisonName,
}: MedianHomeValueCardProps) {
  const primaryValue = getVariableValue(primary, 'Median Home Value');
  const comparisonValue = getVariableValue(comparison, 'Median Home Value');

  const difference =
    primaryValue !== null && comparisonValue !== null
      ? primaryValue - comparisonValue
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
            Median Home Value
          </Text>

          <Title order={3}>
            {primaryValue !== null ? `$${primaryValue.toLocaleString()}` : '—'}
          </Title>
        </Stack>

        <ThemeIcon size={48} radius="xl" variant="light" color="red">
          <IconHomeDollar size={24} />
        </ThemeIcon>
      </Group>

      <Stack gap={5}>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {comparisonName}
          </Text>
          <Text fw={600}>
            {comparisonValue !== null
              ? `$${comparisonValue.toLocaleString()}`
              : '—'}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Difference
          </Text>
          <Text
            fw={700}
            c={
              difference === null ? undefined : difference > 0 ? 'green' : 'red'
            }
          >
            {difference === null
              ? '—'
              : `${difference > 0 ? '+' : ''}$${difference.toLocaleString()}`}
          </Text>
        </Group>

        <Text size="xs" c="dimmed" mt="xs">
          {difference === null ? (
            ''
          ) : difference > 0 ? (
            <>
              <span style={{ color: '#a73c00' }}>{primaryName}</span> has a
              higher median home value than <span>{comparisonName}</span>
            </>
          ) : difference < 0 ? (
            <>
              <span style={{ color: '#a73c00' }}>{primaryName}</span> has a
              lower median home value than <span>{comparisonName}</span>
            </>
          ) : (
            <>
              <span style={{ color: '#a73c00' }}>{primaryName}</span> and{' '}
              <span>{comparisonName}</span> have the same median home value
            </>
          )}
        </Text>
      </Stack>
    </Card>
  );
}

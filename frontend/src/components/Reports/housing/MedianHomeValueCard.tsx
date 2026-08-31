import { Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconHomeDollar } from '@tabler/icons-react';
import { DataRow } from '@/types/cachedCharts';

interface MedianHomeValueCardProps {
  primary: DataRow[];
  comparison: DataRow[];
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

        <ThemeIcon size={48} radius="xl" variant="light" color="violet">
          <IconHomeDollar size={24} />
        </ThemeIcon>
      </Group>

      <Stack gap={5}>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Comparison
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
              difference === null
                ? undefined
                : difference > 0
                  ? 'violet'
                  : 'blue'
            }
          >
            {difference === null
              ? '—'
              : `${difference > 0 ? '+' : ''}$${difference.toLocaleString()}`}
          </Text>
        </Group>

        <Text size="xs" c="dimmed" mt="xs">
          {difference === null
            ? ''
            : difference > 0
              ? 'Higher median home value'
              : difference < 0
                ? 'Lower median home value'
                : 'Same median home value'}
        </Text>
      </Stack>
    </Card>
  );
}

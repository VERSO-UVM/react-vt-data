import { Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconBriefcase } from '@tabler/icons-react';
import { DataRow } from '@/types/cachedCharts';

interface UnemploymentRateCardProps {
  primary: DataRow[];
  comparison: DataRow[];
}

function getVariableValue(data: DataRow[], variable: string): number | null {
  const row = data.find((d) => d.Variable === variable);

  if (!row) return null;

  const value = Number(row.Value);

  return Number.isFinite(value) ? value : null;
}

export default function UnemploymentRateCard({
  primary,
  comparison,
}: UnemploymentRateCardProps) {
  const primaryRate = getVariableValue(primary, 'Unemployment Rate');
  const comparisonRate = getVariableValue(comparison, 'Unemployment Rate');

  const difference =
    primaryRate !== null && comparisonRate !== null
      ? primaryRate - comparisonRate
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
            Unemployment Rate
          </Text>

          <Title order={3}>
            {primaryRate !== null ? `${primaryRate.toFixed(1)}%` : '—'}
          </Title>
        </Stack>

        <ThemeIcon size={48} radius="xl" variant="light" color="violet">
          <IconBriefcase size={24} />
        </ThemeIcon>
      </Group>

      <Stack gap={5}>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Comparison
          </Text>

          <Text fw={600}>
            {comparisonRate !== null ? `${comparisonRate.toFixed(1)}%` : '—'}
          </Text>
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Difference
          </Text>

          <Text
            fw={700}
            c={
              difference === null ? undefined : difference > 0 ? 'red' : 'green'
            }
          >
            {difference === null
              ? '—'
              : `${difference > 0 ? '+' : ''}${difference.toFixed(1)} %`}
          </Text>
        </Group>

        <Text size="xs" c="dimmed" mt="xs">
          {difference === null
            ? ''
            : difference > 0
              ? 'Higher unemployment rate'
              : difference < 0
                ? 'Lower unemployment rate'
                : 'Same unemployment rate'}
        </Text>
      </Stack>
    </Card>
  );
}

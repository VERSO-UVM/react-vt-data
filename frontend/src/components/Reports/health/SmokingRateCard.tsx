import { Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconSmoking } from '@tabler/icons-react';
import { DataRow } from '@/types/cachedCharts';

interface SmokingRateCardProps {
  primary: DataRow[];
  comparison: DataRow[];
}

function getVariableValue(data: DataRow[], variable: string): number | null {
  const row = data.find((d) => d.Variable === variable);
  if (!row) return null;
  const value = Number(row.Value);
  return Number.isFinite(value) ? value : null;
}

export default function SmokingRateCard({
  primary,
  comparison,
}: SmokingRateCardProps) {
  const primaryValue = getVariableValue(primary, 'Smoking Prevalance');
  const comparisonValue = getVariableValue(comparison, 'Smoking Prevalance');

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
            Smoking Prevalance
          </Text>

          <Title order={3}>
            {primaryValue !== null ? `${primaryValue.toLocaleString()}` : '—'}
          </Title>
        </Stack>

        <ThemeIcon size={48} radius="xl" variant="light" color="red">
          <IconSmoking size={24} />
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
              difference === null ? undefined : difference > 0 ? 'green' : 'red'
            }
          >
            {difference === null
              ? '—'
              : `${difference > 0 ? '+' : ''}${difference.toLocaleString()}`}
          </Text>
        </Group>

        <Text size="xs" c="dimmed" mt="xs">
          {difference === null
            ? ''
            : difference > 0
              ? 'Higher smoking prevalance'
              : difference < 0
                ? 'Lower smoking prevalance'
                : 'Same smoking prevalance'}
        </Text>
      </Stack>
    </Card>
  );
}

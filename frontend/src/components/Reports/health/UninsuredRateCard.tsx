import { Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconShieldOff } from '@tabler/icons-react';
import { DataRow } from '@/types/cachedCharts';

interface UninsuredRateCardProps {
  primary: DataRow[];
  comparison: DataRow[];
  primaryName?: string;
  comparisonName?: string;
}

const MEASURE =
  'Current lack of health insurance among adults aged 18-64 years';

function getMeasureValue(data: DataRow[], measure: string): number | null {
  const row = data.find((d) => d.Measure === measure);
  if (!row) return null;
  const value = Number(row.Value);
  return Number.isFinite(value) ? value : null;
}

export default function UninsuredRateCard({
  primary,
  comparison,
  primaryName,
  comparisonName,
}: UninsuredRateCardProps) {
  const primaryValue = getMeasureValue(primary, MEASURE);
  const comparisonValue = getMeasureValue(comparison, MEASURE);

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
            Uninsured Rate (18–64)
          </Text>

          <Title order={3}>
            {primaryValue !== null ? `${primaryValue.toFixed(1)}%` : '—'}
          </Title>
        </Stack>

        <ThemeIcon size={48} radius="xl" variant="light" color="orange">
          <IconShieldOff size={24} />
        </ThemeIcon>
      </Group>

      <Stack gap={5}>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {comparisonName ?? 'Comparison'}
          </Text>

          <Text fw={600}>
            {comparisonValue !== null ? `${comparisonValue.toFixed(1)}%` : '—'}
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
              : `${difference > 0 ? '+' : ''}${difference.toFixed(1)}pp`}
          </Text>
        </Group>

        <Text size="xs" c="dimmed" mt="xs">
          {difference === null ? (
            ''
          ) : difference > 0 ? (
            <>
              <span style={{ color: '#c0392b' }}>{primaryName}</span> has a
              higher uninsured rate than <span>{comparisonName}</span>
            </>
          ) : difference < 0 ? (
            <>
              <span style={{ color: '#c0392b' }}>{primaryName}</span> has a
              lower uninsured rate than <span>{comparisonName}</span>
            </>
          ) : (
            <>
              <span style={{ color: '#c0392b' }}>{primaryName}</span> and{' '}
              <span>{comparisonName}</span> have the same uninsured rate
            </>
          )}
        </Text>
      </Stack>
    </Card>
  );
}

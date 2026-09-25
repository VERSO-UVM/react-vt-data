import {
  Box,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { DataRow } from '@/types/cachedCharts';
import CountyRankStrip, { CountyValue } from './CountyRankStrip';
import { IndicatorRow, compareEstimates, formatValue } from './IndicatorTable';

// Presentational: a few chosen measures at a glance, each with the
// comparison and whether the gap is significant (the same
// test as IndicatorTable). Neutral colors, like the table: for some measures
// (routine checkups) higher is better, for others (smoking) it's worse.

interface KeyIndicatorTilesProps {
  rows: IndicatorRow[];
  /** Measures to show, in order; missing ones are skipped. */
  measures: string[];
  primaryName: string;
  comparisonName: string;
  /** Every county's value per measure (County, Measure, Value), for ranking. */
  countyValues?: DataRow[];
  /** The county to rank, or none (e.g. for Vermont as a whole). */
  rankCounty?: string | null;
  /** The comparison's county, marked alongside it if it's a different one. */
  comparisonCounty?: string | null;
}

function valuesFor(rows: DataRow[], measure: string): CountyValue[] {
  return rows
    .filter((r) => r.Measure === measure && r.Value != null)
    .map((r) => ({ county: String(r.County), value: Number(r.Value) }));
}

export default function KeyIndicatorTiles({
  rows,
  measures,
  primaryName,
  comparisonName,
  countyValues = [],
  rankCounty,
  comparisonCounty,
}: KeyIndicatorTilesProps) {
  const tiles = measures
    .map((m) => rows.find((r) => r.measure === m))
    .filter((r): r is IndicatorRow => r != null);
  if (tiles.length === 0) return null;

  return (
    <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="lg">
      {tiles.map((row) => (
        <Tile
          key={row.measure}
          row={row}
          primaryName={primaryName}
          comparisonName={comparisonName}
          countyValues={rankCounty ? valuesFor(countyValues, row.measure) : []}
          rankCounty={rankCounty}
          comparisonCounty={comparisonCounty}
        />
      ))}
    </SimpleGrid>
  );
}

function Tile({
  row,
  primaryName,
  comparisonName,
  countyValues,
  rankCounty,
  comparisonCounty,
}: {
  row: IndicatorRow;
  primaryName: string;
  comparisonName: string;
  countyValues: CountyValue[];
  rankCounty?: string | null;
  comparisonCounty?: string | null;
}) {
  const { primary: p, comparison: c } = row;
  const verdict = compareEstimates(p, c);
  const diff = p.value != null && c.value != null ? p.value - c.value : null;

  return (
    <Card radius="xl" padding="lg" withBorder style={{ height: '100%' }}>
      <Stack gap={2} mb="sm">
        <Text size="xs" fw={700} tt="uppercase" c="dimmed" lineClamp={2}>
          {row.label}
        </Text>
        {/* Names the place, which for a town is its county's estimate. */}
        <Text size="xs" c="dimmed" lineClamp={1} mt={4}>
          {primaryName}
        </Text>
        <Title order={3}>{formatValue(p.value, row.unit)}</Title>
        {p.low != null && p.high != null && (
          <Text size="xs" c="dimmed">
            95% CI {formatValue(p.low, row.unit)}–
            {formatValue(p.high, row.unit)}
          </Text>
        )}
      </Stack>

      <Stack gap={4}>
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm" c="dimmed" lineClamp={1}>
            {comparisonName}
          </Text>
          <Text size="sm" fw={600}>
            {formatValue(c.value, row.unit)}
          </Text>
        </Group>
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm" c="dimmed">
            Difference
          </Text>
          <Text size="sm" fw={verdict === 'different' ? 700 : 500}>
            {diff == null
              ? '—'
              : `${diff > 0 ? '+' : ''}${diff.toFixed(1)} pts`}
          </Text>
        </Group>
        {verdict !== 'unknown' && (
          <Text size="xs" c="dimmed">
            {verdict === 'different'
              ? 'Significant difference'
              : 'Not a significant difference'}
          </Text>
        )}
      </Stack>

      {rankCounty && countyValues.length > 1 && (
        <Box mt="md">
          <CountyRankStrip
            values={countyValues}
            county={rankCounty}
            comparisonCounty={comparisonCounty}
            unit={row.unit}
          />
        </Box>
      )}
    </Card>
  );
}

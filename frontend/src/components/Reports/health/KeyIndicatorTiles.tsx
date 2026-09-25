import { Box, Card, Group, SimpleGrid, Text, Title } from '@mantine/core';
import { COLORS } from '@/app/theme';
import { DataRow } from '@/types/cachedCharts';
import CountyRankStrip, { CountyValue } from './CountyRankStrip';
import {
  COMPARISON_COLOR,
  IndicatorEstimate,
  IndicatorRow,
  PRIMARY_COLOR,
  compareEstimates,
  formatValue,
} from './IndicatorTable';

// Presentational: a few chosen measures at a glance, both places side by
// side, and whether the gap is significant (the same test as
// IndicatorTable). Neutral colors, like the table: for some measures
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
  const places = [
    { name: primaryName, estimate: p, color: PRIMARY_COLOR },
    { name: comparisonName, estimate: c, color: COMPARISON_COLOR },
  ];

  return (
    <Card
      radius="xl"
      padding="lg"
      withBorder
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Text
        size="xs"
        fw={700}
        tt="uppercase"
        c={COLORS.slate}
        lineClamp={2}
        mb="sm"
      >
        {row.label}
      </Text>

      {/* Both places the same way, filled row by row so the names, values
          and margins line up even when one name wraps. For a town, the name
          is its county, whose estimate this is. */}
      <SimpleGrid cols={2} spacing="sm" verticalSpacing={2}>
        {places.map((place) => (
          <PlaceName key={place.color} color={place.color}>
            {place.name}
          </PlaceName>
        ))}
        {places.map((place) => (
          <Title key={place.color} order={3}>
            {formatValue(place.estimate.value, row.unit)}
          </Title>
        ))}
        {places.map((place) => (
          <Text key={place.color} size="xs" c="dimmed">
            {margin(place.estimate)}
          </Text>
        ))}
      </SimpleGrid>

      <DifferenceLine row={row} />

      {rankCounty && countyValues.length > 1 && (
        <Box mt="auto" pt="md">
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

/** "±3.5": half the 95% interval's width, blank without one. */
function margin(e: IndicatorEstimate) {
  return e.low != null && e.high != null
    ? `±${((e.high - e.low) / 2).toFixed(1)}`
    : '\u00a0';
}

/** "1.0 pts lower · not significant", the first place against the second. */
function DifferenceLine({ row }: { row: IndicatorRow }) {
  const { primary: p, comparison: c } = row;
  if (p.value == null || c.value == null) return null;
  const diff = p.value - c.value;
  const verdict = compareEstimates(p, c);
  const size = Math.abs(diff).toFixed(1);
  return (
    <Text size="sm" mt="sm" c={COLORS.slate}>
      <Text span inherit fw={verdict === 'different' ? 700 : 500}>
        {size === '0.0'
          ? 'Same value'
          : `${size} pts ${diff > 0 ? 'higher' : 'lower'}`}
      </Text>
      {verdict !== 'unknown' && (
        <Text span inherit c="dimmed">
          {verdict === 'different' ? ' · significant' : ' · not significant'}
        </Text>
      )}
    </Text>
  );
}

/** A place name led by its color's dot, matching the rank strip and charts.
 *  Drops the ", Vermont" every name ends with, so it fits a narrow tile. */
function PlaceName({ color, children }: { color: string; children: string }) {
  return (
    <Group gap={6} wrap="nowrap" align="flex-start" style={{ minWidth: 0 }}>
      <Box
        w={8}
        h={8}
        mt={5}
        bg={color}
        style={{ borderRadius: '50%', flexShrink: 0 }}
      />
      <Text size="xs" c={COLORS.slate} lineClamp={2}>
        {children.replace(/, Vermont$/, '')}
      </Text>
    </Group>
  );
}

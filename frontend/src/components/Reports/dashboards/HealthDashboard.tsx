import { Grid, Text } from '@mantine/core';
import { DataRow } from '@/types/cachedCharts';
import type { Location } from '@/components/profile/profileStore';
import {
  IndicatorTable,
  KeyIndicatorTiles,
  PovertyUninsuredTrends,
} from '@/components/Reports/health';
import {
  AT_A_GLANCE_MEASURES,
  HEALTH_CATEGORY_ORDER,
  buildIndicatorRows,
  indicatorPlace,
} from '@/components/Reports/health/indicatorRows';

export interface DashboardData {
  year: number;
  primary: {
    name: string;
    location?: Location;
    current: DataRow[];
    history: DataRow[];
  };
  comparison: {
    name: string;
    location?: Location;
    current: DataRow[];
    history: DataRow[];
  };
  // Extra endpoints declared in reports-by-topic's SECTIONS (e.g.
  // "povertyUninsured").
  timeseries?: Record<string, { primary: DataRow[]; comparison: DataRow[] }>;
  // Section-wide endpoints (e.g. "countyValues"), not per location.
  allAreas?: Record<string, DataRow[]>;
}

export interface DashboardProps {
  data: DashboardData;
}

export default function HealthDashboard({ data }: DashboardProps) {
  const { primary, comparison, timeseries, allAreas } = data;
  const rows = buildIndicatorRows(primary.current, comparison.current);
  const dataYear = Math.max(
    0,
    ...[...primary.current, ...comparison.current].map(
      (r) => Number(r.Year) || 0,
    ),
  );

  // A county, or a town shown as its county; Vermont itself has no rank.
  const rankCounty =
    primary.location?.type === 'county' || primary.location?.type === 'town'
      ? primary.location.county
      : null;

  return (
    <Grid gap="lg">
      <Grid.Col span={12}>
        <KeyIndicatorTiles
          rows={rows}
          measures={AT_A_GLANCE_MEASURES}
          primaryName={primary.name}
          comparisonName={comparison.name}
          countyValues={allAreas?.countyValues}
          rankCounty={rankCounty}
        />
      </Grid.Col>
      <Grid.Col span={12}>
        <PovertyUninsuredTrends
          primary={timeseries?.povertyUninsured?.primary ?? []}
          comparison={timeseries?.povertyUninsured?.comparison ?? []}
          primaryName={primary.name}
          comparisonName={comparison.name}
        />
      </Grid.Col>
      <Grid.Col span={12}>
        <IndicatorTable
          primary={
            primary.location
              ? indicatorPlace(primary.location, primary.name)
              : { name: primary.name }
          }
          comparison={
            comparison.location
              ? indicatorPlace(comparison.location, comparison.name)
              : { name: comparison.name }
          }
          rows={rows}
          categoryOrder={HEALTH_CATEGORY_ORDER}
        />
      </Grid.Col>
      <Grid.Col span={12}>
        <Text size="xs" c="dimmed">
          Source: CDC PLACES
          {dataYear ? ` estimates for ${dataYear}` : ''}, age-adjusted. These
          are model-based estimates from CDC&apos;s Behavioral Risk Factor
          Surveillance System survey, not direct counts. CDC does not publish a
          statewide figure, so Vermont values are the county estimates averaged
          by each county&apos;s adult population.
        </Text>
      </Grid.Col>
    </Grid>
  );
}

import { Table, ScrollArea, Paper, Text, Stack, Grid } from '@mantine/core';
import { DataRow } from '@/types/cachedCharts';
import {
  MedianHomeValueCard,
  TotalHousingUnitsCard,
  OccupancyDistributionChart,
  VacancyDistributionChart,
  MedianHomeValueHistoryChart,
  TotalHousingUnitsHistoryChart,
} from '@/components/Reports/housing';

export interface DashboardData {
  year: number;
  primary: {
    name: string;
    current: DataRow[];
    history: DataRow[];
  };
  comparison: {
    name: string;
    current: DataRow[];
    history: DataRow[];
  };
  // Additional time-series tables, keyed by the SECTIONS.timeseries config
  // key in reports-by-topic/page.tsx (e.g. "medianHomeValue").
  timeseries?: Record<string, { primary: DataRow[]; comparison: DataRow[] }>;
}

export interface DashboardProps {
  data: DashboardData;
}

export default function HousingDashboard({ data }: DashboardProps) {
  const { primary, comparison, timeseries } = data;

  return (
    <Grid gap="lg">
      <Grid.Col span={{ base: 12, md: 6 }}>
        <MedianHomeValueCard
          primary={primary.current}
          comparison={comparison.current}
          primaryName={primary.name}
          comparisonName={comparison.name}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6 }}>
        <TotalHousingUnitsCard
          primary={primary.current}
          comparison={comparison.current}
          primaryName={primary.name}
          comparisonName={comparison.name}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 7 }}>
        <OccupancyDistributionChart
          primary={primary.current}
          comparison={comparison.current}
          primaryName={primary.name}
          comparisonName={comparison.name}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 5 }}>
        <VacancyDistributionChart
          primary={primary.current}
          comparison={comparison.current}
          primaryName={primary.name}
          comparisonName={comparison.name}
        />
      </Grid.Col>
      {timeseries?.medianHomeValue && (
        <Grid.Col span={{ base: 12, md: 6 }}>
          <MedianHomeValueHistoryChart
            primary={timeseries.medianHomeValue.primary}
            comparison={timeseries.medianHomeValue.comparison}
            primaryName={primary.name}
            comparisonName={comparison.name}
          />
        </Grid.Col>
      )}
      {timeseries?.totalUnits && (
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TotalHousingUnitsHistoryChart
            primary={timeseries.totalUnits.primary}
            comparison={timeseries.totalUnits.comparison}
            primaryName={primary.name}
            comparisonName={comparison.name}
          />
        </Grid.Col>
      )}
    </Grid>
  );
}

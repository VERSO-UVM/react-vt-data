import { Table, ScrollArea, Paper, Text, Stack, Grid } from '@mantine/core';
import { DataRow } from '@/types/cachedCharts';
import {
  UnemploymentRateCard,
  MedianHouseholdIncomeCard,
  PerCapitaIncomeCard,
  MedianHouseholdIncomeHistoryChart,
  PerCapitaIncomeHistoryChart,
} from '@/components/Reports/economic';

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
  // key in reports-by-topic/page.tsx (e.g. "householdIncome").
  timeseries?: Record<string, { primary: DataRow[]; comparison: DataRow[] }>;
}

export interface DashboardProps {
  data: DashboardData;
}

export default function EconomicDashboard({ data }: DashboardProps) {
  const { primary, comparison, timeseries } = data;

  return (
    <Grid gap="lg">
      <Grid.Col span={{ base: 12, md: 4 }}>
        <MedianHouseholdIncomeCard
          primary={primary.current}
          comparison={comparison.current}
          primaryName={primary.name}
          comparisonName={comparison.name}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 4 }}>
        <PerCapitaIncomeCard
          primary={primary.current}
          comparison={comparison.current}
          primaryName={primary.name}
          comparisonName={comparison.name}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 4 }}>
        <UnemploymentRateCard
          primary={primary.current}
          comparison={comparison.current}
          primaryName={primary.name}
          comparisonName={comparison.name}
        />
      </Grid.Col>
      {timeseries?.householdIncome && (
        <Grid.Col span={{ base: 12, md: 6 }}>
          <MedianHouseholdIncomeHistoryChart
            primary={timeseries.householdIncome.primary}
            comparison={timeseries.householdIncome.comparison}
            primaryName={primary.name}
            comparisonName={comparison.name}
          />
        </Grid.Col>
      )}
      {timeseries?.perCapitaIncome && (
        <Grid.Col span={{ base: 12, md: 6 }}>
          <PerCapitaIncomeHistoryChart
            primary={timeseries.perCapitaIncome.primary}
            comparison={timeseries.perCapitaIncome.comparison}
            primaryName={primary.name}
            comparisonName={comparison.name}
          />
        </Grid.Col>
      )}
    </Grid>
  );
}

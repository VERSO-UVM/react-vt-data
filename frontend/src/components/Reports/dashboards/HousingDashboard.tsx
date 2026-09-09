import { Table, ScrollArea, Paper, Text, Stack, Grid } from '@mantine/core';
import { DataRow } from '@/types/cachedCharts';
import {
  MedianHomeValueCard,
  TotalHousingUnitsCard,
  OccupancyDistributionChart,
  VacancyDistributionChart,
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
}

export interface DashboardProps {
  data: DashboardData;
}

export default function HousingDashboard({ data }: DashboardProps) {
  const { primary, comparison } = data;

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
    </Grid>
  );
}

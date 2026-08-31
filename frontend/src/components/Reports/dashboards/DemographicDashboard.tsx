import { Table, ScrollArea, Paper, Text, Stack, Grid } from '@mantine/core';
import { DataRow } from '@/types/cachedCharts';
import {
  PopulationCard,
  MedianAgeCard,
  SexDistributionChart,
  AgeDistributionChart,
  RaceDistributionChart,
} from '@/components/Reports/demographics';

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

export default function DemographicsDashboard({ data }: DashboardProps) {
  const { primary, comparison } = data;

  return (
    <Grid gap="lg">
      <Grid.Col span={{ base: 12, md: 6 }}>
        <PopulationCard
          primary={primary.current}
          comparison={comparison.current}
        />
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 6 }}>
        <MedianAgeCard
          primary={primary.current}
          comparison={comparison.current}
        />
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 5 }}>
        <SexDistributionChart
          primary={primary.current}
          comparison={comparison.current}
          primaryName={primary.name}
          comparisonName={comparison.name}
        />
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 7 }}>
        <AgeDistributionChart
          primary={primary.current}
          comparison={comparison.current}
          primaryName={primary.name}
          comparisonName={comparison.name}
        />
      </Grid.Col>

      <Grid.Col span={12}>
        <RaceDistributionChart
          primary={primary.current}
          comparison={comparison.current}
          primaryName={primary.name}
          comparisonName={comparison.name}
        />
      </Grid.Col>
    </Grid>
  );
}

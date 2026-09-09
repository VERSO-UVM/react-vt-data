import { Table, ScrollArea, Paper, Text, Stack, Grid } from '@mantine/core';
import { DataRow } from '@/types/cachedCharts';
import { SmokingRateCard } from '@/components/Reports/health';

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

export default function HealthDashboard({ data }: DashboardProps) {
  const { primary, comparison } = data;

  return (
    <Grid gap="lg">
      <Grid.Col span={{ base: 12, md: 6 }}>
        <SmokingRateCard
          primary={primary.current}
          comparison={comparison.current}
        />
      </Grid.Col>
    </Grid>
  );
}

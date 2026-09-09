import { Table, ScrollArea, Paper, Text, Stack, Grid } from '@mantine/core';
import { DataRow } from '@/types/cachedCharts';
import { AcreageByDistrictType } from '@/components/Reports/land_use';

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

export default function LandUseDashboard({ data }: DashboardProps) {
  const { primary, comparison } = data;

  return (
    <Grid gap="lg">
      <Grid.Col span={{ base: 12, md: 6 }}>
        <AcreageByDistrictType
          primaryName={primary.name}
          comparisonName={comparison.name}
          primary={primary.current}
          comparison={comparison.current}
        />
      </Grid.Col>
    </Grid>
  );
}

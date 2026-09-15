import { Table, ScrollArea, Paper, Text, Stack, Grid } from '@mantine/core';
import { DataRow } from '@/types/cachedCharts';
import {
  AcreageByDistrictType,
  ZoningAllowanceChart,
  WastewaterPermitsTable,
  ZoningCoverageStatCard,
} from '@/components/Reports/land_use';

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

  // Additional endpoints, keyed by the SECTIONS.timeseries config key in
  // reports-by-topic/page.tsx (e.g. "allowances", "wastewaterPermits").
  timeseries?: Record<string, { primary: DataRow[]; comparison: DataRow[] }>;
}

export interface DashboardProps {
  data: DashboardData;
}

export default function LandUseDashboard({ data }: DashboardProps) {
  const { primary, comparison, timeseries } = data;

  return (
    <Grid gap="lg">
      <Grid.Col span={{ base: 12, md: 6 }}>
        <ZoningCoverageStatCard />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6 }}>
        <AcreageByDistrictType
          primaryName={primary.name}
          comparisonName={comparison.name}
          primary={primary.current}
          comparison={comparison.current}
        />
      </Grid.Col>
      {timeseries?.allowances && (
        <Grid.Col span={{ base: 12, md: 6 }}>
          <ZoningAllowanceChart
            primary={timeseries.allowances.primary}
            comparison={timeseries.allowances.comparison}
            primaryName={primary.name}
            comparisonName={comparison.name}
          />
        </Grid.Col>
      )}
      {timeseries?.wastewaterPermits && (
        <Grid.Col span={12}>
          <WastewaterPermitsTable
            primary={timeseries.wastewaterPermits.primary}
            comparison={timeseries.wastewaterPermits.comparison}
            primaryName={primary.name}
            comparisonName={comparison.name}
          />
        </Grid.Col>
      )}
    </Grid>
  );
}

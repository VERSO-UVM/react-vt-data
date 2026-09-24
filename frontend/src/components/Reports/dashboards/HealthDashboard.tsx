import { Grid, Text } from '@mantine/core';
import { DataRow } from '@/types/cachedCharts';
import {
  SmokingRateCard,
  UninsuredRateCard,
  ChronicDiseaseChart,
  DisabilityChart,
  HealthStatusChart,
} from '@/components/Reports/health';

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
          primaryName={primary.name}
          comparisonName={comparison.name}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6 }}>
        <UninsuredRateCard
          primary={primary.current}
          comparison={comparison.current}
          primaryName={primary.name}
          comparisonName={comparison.name}
        />
      </Grid.Col>
      <Grid.Col span={12}>
        <ChronicDiseaseChart
          primary={primary.current}
          comparison={comparison.current}
          primaryName={primary.name}
          comparisonName={comparison.name}
        />
      </Grid.Col>
      <Grid.Col span={12}>
        <DisabilityChart
          primary={primary.current}
          comparison={comparison.current}
          primaryName={primary.name}
          comparisonName={comparison.name}
        />
      </Grid.Col>
      <Grid.Col span={12}>
        <HealthStatusChart
          primary={primary.current}
          comparison={comparison.current}
          primaryName={primary.name}
          comparisonName={comparison.name}
        />
      </Grid.Col>
      <Grid.Col span={12}>
        <Text size="xs" c="dimmed">
          Source: CDC PLACES, age-adjusted estimates. CDC does not publish a
          statewide figure, so Vermont values are the county estimates averaged
          by each county&apos;s adult population.
        </Text>
      </Grid.Col>
    </Grid>
  );
}

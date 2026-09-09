import { useState } from 'react';
import {
  Paper,
  Title,
  Text,
  Group,
  Stack,
  Badge,
  Grid,
  Button,
  ActionIcon,
  Tooltip,
  Divider,
} from '@mantine/core';
import { IconDownload, IconMapPin, IconRefresh } from '@tabler/icons-react';
import { DataRow } from '@/types/cachedCharts';
import {
  PopulationCard,
  MedianAgeCard,
  SexDistributionChart,
  AgeDistributionChart,
  RaceDistributionChart,
} from '@/components/Reports/demographics';
import { exportReport } from '@/utils/exportReport';

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
  onRefresh?: () => void;
  onExport?: () => void;
}

export default function DemographicsDashboard({
  data,
  onRefresh,
  onExport,
}: DashboardProps) {
  const { year, primary, comparison } = data;
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    // If a custom parent handler is passed, call it
    if (onExport) {
      onExport();
      return;
    }

    // Default client-side PDF export fallback
    setIsExporting(true);
    try {
      await exportReport('demographics-dashboard-report', {
        title: 'Demographics',
        primaryName: primary.name,
        comparisonName: comparison.name,
        year: year,
      });
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Stack gap="lg">
      {/* Integrated Action & Metric Context Header */}
      <Paper
        radius="lg"
        p="md"
        withBorder
        style={{ backgroundColor: 'var(--mantine-color-body)' }}
      >
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Group gap="xs">
              <Title order={3} style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                Demographic Profile
              </Title>
              <Badge variant="light" color="blue" radius="sm">
                ACS {year}
              </Badge>
            </Group>

            <Group gap="sm">
              <Group gap={4}>
                <IconMapPin size={14} style={{ color: '#5474B4' }} />
                <Text size="xs" c="dimmed">
                  Primary:
                </Text>
                <Text size="xs" fw={600}>
                  {primary.name}
                </Text>
              </Group>

              <Divider orientation="vertical" />

              <Group gap={4}>
                <IconMapPin size={14} style={{ color: '#8B95A5' }} />
                <Text size="xs" c="dimmed">
                  Benchmark:
                </Text>
                <Text size="xs" fw={600}>
                  {comparison.name}
                </Text>
              </Group>
            </Group>
          </Stack>

          <Group gap="xs">
            {onRefresh && (
              <Tooltip label="Refresh metrics">
                <ActionIcon
                  variant="default"
                  size="lg"
                  radius="md"
                  onClick={onRefresh}
                >
                  <IconRefresh size={18} />
                </ActionIcon>
              </Tooltip>
            )}

            <Button
              variant="filled"
              color="blue"
              leftSection={<IconDownload size={16} />}
              radius="md"
              size="sm"
              loading={isExporting}
              onClick={handleExport}
            >
              Export PDF
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* PDF Exportable Container */}
      <div id="demographics-dashboard-report">
        <Stack gap="lg">
          {/* Row 1: KPI Summary Cards */}
          <div className="pdf-export-block">
            <Grid gap="lg">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <PopulationCard
                  primary={primary.current}
                  comparison={comparison.current}
                  primaryName={primary.name}
                  comparisonName={comparison.name}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <MedianAgeCard
                  primary={primary.current}
                  comparison={comparison.current}
                  primaryName={primary.name}
                  comparisonName={comparison.name}
                />
              </Grid.Col>
            </Grid>
          </div>

          {/* Row 2: Sex & Age Charts */}
          <div className="pdf-export-block">
            <Grid gap="lg">
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
            </Grid>
          </div>

          {/* Row 3: Diversity Breakdown Chart */}
          <div className="pdf-export-block">
            <RaceDistributionChart
              primary={primary.current}
              comparison={comparison.current}
              primaryName={primary.name}
              comparisonName={comparison.name}
            />
          </div>
        </Stack>
      </div>
    </Stack>
  );
}

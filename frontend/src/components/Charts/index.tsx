export { default as DualLine } from './DualLine';
export {
  SamePerXBarChart,
  DiffPerXBarChart,
  CompareDiffPerXBarChart,
  CompareHBarChart,
} from './Bar';

export {
  renderTable,
  renderTableEstimates,
  renderTableMixed,
} from './DemographicsTable';
export {
  DemographicsTrendChart,
  EducationTrendChart,
  HousingTrendChart,
  UnemploymentTrendChart,
  DPTrendChart,
} from './TrendCharts';
export { EmploymentAreaChart } from './EmploymentAreaChart';

import { ChartItem } from '@/types/cachedCharts';
import { Badge, Card, Box, Title, Stack, Text, Group } from '@mantine/core';
import { AddChart, RemoveChart } from './saving';
import { useState } from 'react';
import { TableView, ViewSwitch } from './TableView';
import { usePdfMode } from '@/contexts/PdfModeContext';

// ChartCard
interface ChartCardProps<TData extends Record<string, any>> {
  chart: ChartItem<TData>;
  ChartComponent: React.FC<{ chart: ChartItem<TData> }>;
  TrendComponent?: React.FC<{ chart: ChartItem<TData> }>;
  matchedCategories?: string[];
  action?: 'add' | 'remove';
}
export const ChartCard = <TData extends Record<string, any>>({
  chart,
  ChartComponent,
  TrendComponent,
  matchedCategories = [],
  action = 'add',
}: ChartCardProps<TData>) => {
  const isPdfMode = usePdfMode();

  // Table-primary items (renderTable*) default to table view; charts default to chart view.
  const isTablePrimary = chart.subtype.startsWith('renderTable');
  const [view, setView] = useState<'chart' | 'table'>(
    isTablePrimary ? 'table' : 'chart',
  );

  // Components that manage their own view switching internally opt out here.
  const selfManagesViews = !!chart.chartParams?.noViewSwitch;

  // Only show the toggle when there is something meaningful on both sides.
  // Table-primary items only get a toggle if a trend chart is wired up.
  const showViewSwitch =
    !selfManagesViews && (isTablePrimary ? !!TrendComponent : true);

  const content = selfManagesViews ? (
    <ChartComponent chart={chart} />
  ) : isTablePrimary ? (
    // table view  → the formatted table renderer (renderTable*)
    // chart view  → the trend chart (if provided)
    view === 'chart' && TrendComponent ? (
      <TrendComponent chart={chart} />
    ) : (
      <ChartComponent chart={chart} />
    )
  ) : // chart view → the visualisation; table view → generic data table
  view === 'chart' ? (
    <ChartComponent chart={chart} />
  ) : (
    <TableView chart={chart} />
  );

  const isHighlighted = matchedCategories.length > 0;
  const allCategories = chart.categories ?? [];

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      data-chart-id={chart.id}
      data-chart-subtype={chart.subtype}
      style={{
        ...(isHighlighted ? { borderColor: '#154734', borderWidth: 2 } : {}),
        // Prevent page-break mid-card when printing / captured by html2pdf
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
      }}
    >
      <Box mb="sm">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Title order={3}>
            {chart.description ? ` ${chart.description} for ` : ''}
            {chart.title}
          </Title>
          {allCategories.length > 0 && (
            <Group gap={4} style={{ flexShrink: 0 }}>
              {allCategories.map((cat) => (
                <Badge
                  key={cat}
                  color="green"
                  variant={matchedCategories.includes(cat) ? 'filled' : 'light'}
                  size="sm"
                >
                  {cat}
                </Badge>
              ))}
            </Group>
          )}
        </Group>
        {!isPdfMode && showViewSwitch && (
          <ViewSwitch view={view} setView={setView} />
        )}
      </Box>

      {/* In PDF mode: tables need auto height to unclip; charts keep 400px so
          ResponsiveContainer (height="100%") has a fixed parent to measure. */}
      <Box
        data-chart-box
        style={
          isPdfMode
            ? isTablePrimary
              ? { height: 'auto', overflow: 'visible' }
              : { height: 400, overflow: 'visible' }
            : { height: 400, overflow: 'auto' }
        }
      >
        {content}
      </Box>

      <Text size="sm" c="gray.6" mt="md" ta="right">
        {chart.metadata?.source}
      </Text>

      {!isPdfMode && (
        <Group mt="md">
          {action === 'add' ? (
            <AddChart chart={chart} />
          ) : (
            <RemoveChart chart={chart} />
          )}
        </Group>
      )}
    </Card>
  );
};

interface ChartStackProps<TData extends Record<string, any>> {
  charts: ChartItem<TData>[];
  action?: 'add' | 'remove';
  userInterests?: string[];
}

import * as allCharts from './index'; // self-import to dynamically access all exports

export const ChartStack = <TData extends Record<string, any>>({
  charts,
  action = 'add',
  userInterests = [],
}: ChartStackProps<TData>) => (
  <Stack>
    {charts.map((chart) => {
      const ChartComponent = allCharts[
        chart.subtype as keyof typeof allCharts
      ] as React.FC<{ chart: ChartItem<TData> }>;

      const TrendComponent = chart.trendChart
        ? (allCharts[chart.trendChart as keyof typeof allCharts] as React.FC<{
            chart: ChartItem<TData>;
          }>)
        : undefined;

      const matchedCategories =
        userInterests.length > 0 && chart.categories
          ? chart.categories.filter((cat) => userInterests.includes(cat))
          : [];

      // Compact note card — no chart, no 400px box
      if (chart.subtype === 'noteCard')
        return (
          <Card key={chart.id} shadow="sm" padding="sm" radius="md" withBorder>
            <Text size="sm" c="dimmed">
              {chart.notes}
            </Text>
          </Card>
        );

      if (!ChartComponent) return null;
      if (!chart.data || chart.data.length === 0)
        return (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text>
              No data available from {`${chart.title}`}
              {chart.description ? ` for ${chart.description}` : ''}.
            </Text>
          </Card>
        );
      return (
        <ChartCard
          key={chart.id}
          chart={chart}
          action={action}
          ChartComponent={ChartComponent}
          TrendComponent={TrendComponent}
          matchedCategories={matchedCategories}
        />
      );
    })}
  </Stack>
);

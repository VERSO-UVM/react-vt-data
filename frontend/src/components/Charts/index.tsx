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
  MedianAgeTrendChart,
  EducationTrendChart,
  HousingTrendChart,
  UnemploymentTrendChart,
  EarningsTrendChart,
  DPTrendChart,
} from './TrendCharts';
export { EmploymentAreaChart } from './EmploymentAreaChart';

import { ChartItem } from '@/types/cachedCharts';
import { Badge, Card, Box, Title, Stack, Text, Group, SimpleGrid } from '@mantine/core';
import { AddChart, RemoveChart, ToggleChart } from './saving';
import { useState } from 'react';
import { TableView, ViewSwitch } from './TableView';
import { usePdfMode } from '@/contexts/PdfModeContext';

// ChartCard
interface ChartCardProps<TData extends Record<string, any>> {
  chart: ChartItem<TData>;
  ChartComponent: React.FC<{ chart: ChartItem<TData> }>;
  TrendComponent?: React.FC<{ chart: ChartItem<TData> }>;
  matchedCategories?: string[];
  action?: 'add' | 'remove' | 'toggle';
  defId?: string;
  isIncluded?: boolean;
  onToggle?: () => void;
}
export const ChartCard = <TData extends Record<string, any>>({
  chart,
  ChartComponent,
  TrendComponent,
  matchedCategories = [],
  action = 'add',
  defId,
  isIncluded,
  onToggle,
}: ChartCardProps<TData>) => {
  const isPdfMode = usePdfMode();

  // Table-primary items (renderTable*) default to table view; charts default to chart view.
  const isTablePrimary = chart.subtype.startsWith('renderTable');
  const [view, setView] = useState<'chart' | 'table'>('chart');

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
      ...(isHighlighted ? { borderColor: "#154734", borderWidth: 2 } : {}),
      // Prevent page-break mid-card when printing / captured by html2pdf
      breakInside: "avoid",
      pageBreakInside: "avoid",
    }}
  >
    <Box mb="xs">
      <Group gap={8} wrap="nowrap" mb={8} w='100%'>
        <Title order={2} fw={500}>{chart.description}</Title>
        <Title order={2} fw={200} c="dimmed"> | </Title>
        <Title order={2} fw={200}>{chart.title}</Title>
        <Box flex={1}/>
      
      <Group align="right" gap={4}> {allCategories.map((cat) => (
        <Badge key={cat} color="green" variant={matchedCategories.includes(cat) ? "filled" : "light"} size="sm">{cat}</Badge>))}
      </Group>
        {!isPdfMode && showViewSwitch && (
          <ViewSwitch view={view} setView={setView} />
        )}
      </Group>
    </Box>

    {/* In PDF mode: tables need auto height to unclip; charts keep 400px so
        ResponsiveContainer (height="100%") has a fixed parent to measure. */}
    <Box
      data-chart-box
      style={
        isPdfMode
          ? isTablePrimary
            ? { height: "auto", overflow: "visible" }
            : { height: 400, overflow: "visible" }
          : { height: 400, overflow: "auto" }
      }
    >
      {content}
    </Box>

    <Text size="sm" c="gray.6" mt="md" ta="right">
      {chart.metadata?.source}
    </Text>

    {!isPdfMode && (
      <Group mt="md">
        {action === "toggle" && defId && onToggle ? (
          <ToggleChart
            defId={defId}
            isIncluded={isIncluded ?? true}
            onToggle={onToggle}
          />
        ) : action === "add" ? (
          <AddChart chart={chart} defId={defId} />
        ) : action === "remove" ? (
          <RemoveChart chart={chart} />
        ) : null}
      </Group>
    )}
  </Card>
);
};

interface ChartStackProps<TData extends Record<string, any>> {
  charts: ChartItem<TData>[];
  action?: 'add' | 'remove' | 'toggle';
  userInterests?: string[];
  // parallel arrays for toggle mode — same length as charts
  defIds?: string[];
  onToggle?: (defId: string) => void;
  isIncludedFn?: (defId: string) => boolean;
}

import * as allCharts from './index'; // self-import to dynamically access all exports

export const ChartStack = <TData extends Record<string, any>>({
  charts,
  action = 'add',
  userInterests = [],
  defIds,
  onToggle,
  isIncludedFn,
}: ChartStackProps<TData>) => (
  <Stack>
    {charts.map((chart, i) => {
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

      const defId = defIds?.[i];
      const included = defId && isIncludedFn ? isIncludedFn(defId) : true;
      const handleToggle = defId && onToggle ? () => onToggle(defId) : undefined;

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
          <Card key={chart.id} shadow="sm" padding="lg" radius="md" withBorder>
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
          defId={defId}
          isIncluded={included}
          onToggle={handleToggle}
        />
      );
    })}
  </Stack>
);

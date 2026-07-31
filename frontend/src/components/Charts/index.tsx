export { default as DualLine } from './DualLine';
export {
  SamePerXBarChart,
  DiffPerXBarChart,
  CompareDiffPerXBarChart,
  CompareHBarChart,
  ZoningAllowanceStackedBarChart,
} from './Bar';

export {
  renderTable,
  renderTableEstimates,
  renderTableMixed,
} from './DemographicsTable';
export {
  DemographicsTrendChart,
  PopulationTrendChart,
  MedianAgeTrendChart,
  EducationTrendChart,
  HomeValueTrendChart,
  HousingUnitsTrendChart,
  HousingTenureAreaChart,
  UnemploymentTrendChart,
  LaborForceTrendChart,
  LaborForceTrendChartPrimeAge,
  EarningsTrendChart,
  HouseholdIncomeTrendChart,
  PerCapitaIncomeTrendChart,
  DPTrendChart,
} from './TrendCharts';
export { EmploymentAreaChart } from './EmploymentAreaChart';

import { ChartItem } from '@/types/cachedCharts';
import {
  Badge,
  Card,
  Box,
  Title,
  Stack,
  Text,
  Group,
  SimpleGrid,
  ActionIcon,
  Modal,
  Container,
} from '@mantine/core';
import { CornersOutIcon, CornersInIcon } from '@phosphor-icons/react';
import * as motion from 'motion/react-client';
import { AddChart, RemoveChart, ToggleChart } from './saving';
import { useState } from 'react';
import { TableView, ViewSwitch } from './TableView';
import { usePdfMode } from '@/contexts/PdfModeContext';

// ChartCard
interface ChartCardProps<TData extends DataRow> {
  chart: ChartItem<TData>;
  ChartComponent: React.FC<{
    chart: ChartItem<TData>;
    view?: 'gallery' | 'report';
  }>;
  TrendComponent?: React.FC<{
    chart: ChartItem<TData>;
    view?: 'gallery' | 'report';
  }>;
  matchedCategories?: string[];
  action?: 'add' | 'remove' | 'toggle';
  defId?: string;
  isIncluded?: boolean;
  onToggle?: () => void;
  view?: 'gallery' | 'report';
  border?: boolean;
}
export const ChartCard = <TData extends DataRow>({
  chart,
  ChartComponent,
  TrendComponent,
  matchedCategories = [],
  action = 'add',
  defId,
  isIncluded,
  onToggle,
  view = 'report',
  border = true,
}: ChartCardProps<TData>) => {
  const isPdfMode = usePdfMode();
  const isGallery = view === 'gallery';
  const showBorder = border === true;
  const [isHovered, setIsHovered] = useState(false);

  const isTablePrimary = chart.subtype.startsWith('renderTable');
  const [localView, setLocalView] = useState<'chart' | 'table'>('chart');

  const selfManagesViews = !!chart.chartParams?.noViewSwitch;

  const showViewSwitch =
    !selfManagesViews &&
    !isGallery &&
    (isTablePrimary ? !!TrendComponent : true);

  const content = selfManagesViews ? (
    <ChartComponent chart={chart} view={view} />
  ) : isTablePrimary ? (
    localView === 'chart' && TrendComponent ? (
      <TrendComponent chart={chart} view={view} />
    ) : (
      <ChartComponent chart={chart} view={view} />
    )
  ) : localView === 'chart' ? (
    <ChartComponent chart={chart} view={view} />
  ) : (
    <TableView chart={chart} />
  );

  const isHighlighted = matchedCategories.length > 0;
  const allCategories = chart.categories ?? [];

  const chartBoxHeight = isPdfMode
    ? isTablePrimary
      ? 'auto'
      : 400
    : isGallery
      ? 275
      : 400;

  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Card
        shadow={showBorder ? 'sm' : undefined}
        padding={isGallery ? 'sm' : 'lg'}
        radius="md"
        withBorder={showBorder}
        display="flex"
        data-chart-id={chart.id}
        data-chart-subtype={chart.subtype}
        onMouseEnter={isGallery ? () => setIsHovered(true) : undefined}
        onMouseLeave={isGallery ? () => setIsHovered(false) : undefined}
        onClick={
          isGallery
            ? (e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }
            : undefined
        }
        style={{
          flexDirection: 'column',
          minHeight: 0,
          ...(isHighlighted ? { borderColor: '#154734', borderWidth: 2 } : {}),
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
          ...(isGallery
            ? {
                cursor: 'pointer',
                transition: 'transform 150ms ease, box-shadow 150ms ease',
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: isHovered
                  ? '0 8px 20px rgba(0,0,0,0.12)'
                  : undefined,
              }
            : {}),
        }}
      >
        <Box mb={isGallery ? 4 : 'xs'}>
          <Group gap={8} wrap="nowrap" mb={isGallery ? 4 : 8} w="100%">
            <Title order={isGallery ? 5 : 2} fw={500} lineClamp={1}>
              {chart.description}
            </Title>
            {!isGallery && (
              <>
                <Title order={2} fw={200} c="dimmed">
                  {' '}
                  |{' '}
                </Title>
                <Title order={2} fw={200}>
                  {chart.title}
                </Title>
              </>
            )}
            <Box flex={1} />

            {!isGallery && (
              <Group align="right" gap={4}>
                {allCategories.map((cat) => (
                  <Badge
                    key={cat}
                    color="green"
                    variant={
                      matchedCategories.includes(cat) ? 'filled' : 'light'
                    }
                    size="sm"
                  >
                    {cat}
                  </Badge>
                ))}
              </Group>
            )}
            {isGallery && (
              <Group justify="flex-end">
                <ActionIcon
                  component={motion.button}
                  variant="transparent"
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((v) => !v);
                  }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {expanded ? (
                    <CornersInIcon size={50} weight="thin" color="grey" />
                  ) : (
                    <CornersOutIcon size={30} weight="thin" color="grey" />
                  )}
                </ActionIcon>
              </Group>
            )}

            {!isPdfMode && showViewSwitch && (
              <ViewSwitch view={localView} setView={setLocalView} />
            )}
          </Group>
        </Box>

        <Box
          data-chart-box
          style={{
            height: chartBoxHeight,
            overflow: isGallery ? 'hidden' : 'visible',
            flex: '1 1 auto',
            minHeight: isGallery ? 220 : 400,
            ...(isGallery ? {} : { minHeight: 400 }),
          }}
        >
          {content}
        </Box>

        {!isGallery && (
          <Text size="sm" c="gray.6" mt="md" ta="right">
            {chart.metadata?.source}
          </Text>
        )}

        {!isPdfMode && (
          <Group mt={isGallery ? 'xs' : 'md'}>
            {action === 'toggle' && defId && onToggle ? (
              <ToggleChart
                defId={defId}
                isIncluded={isIncluded ?? true}
                onToggle={onToggle}
              />
            ) : action === 'add' ? (
              <AddChart chart={chart} defId={defId} />
            ) : action === 'remove' ? (
              <RemoveChart chart={chart} />
            ) : null}
          </Group>
        )}
      </Card>
      <Modal
        opened={expanded}
        onClose={() => setExpanded(false)}
        size="100%"
        centered
        withCloseButton={false}
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 4,
        }}
      >
        <ActionIcon
          component={motion.button}
          pos="absolute"
          top={12}
          right={12}
          variant="transparent"
          color="grey"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setExpanded(false)}
          style={{ zIndex: 1000 }}
        >
          <CornersInIcon size={50} weight="thin" color="grey" />
        </ActionIcon>

        <ChartCard
          chart={chart}
          ChartComponent={ChartComponent}
          TrendComponent={TrendComponent}
          matchedCategories={matchedCategories}
          action={action}
          defId={defId}
          isIncluded={isIncluded}
          onToggle={onToggle}
          view="report"
          border={false}
        />
      </Modal>
    </>
  );
};

interface ChartStackProps<TData extends DataRow> {
  charts: ChartItem<TData>[];
  action?: 'add' | 'remove' | 'toggle';
  userInterests?: string[];
  defIds?: string[];
  view?: 'gallery' | 'report';
  onToggle?: (defId: string) => void;
  isIncludedFn?: (defId: string) => boolean;
}

import * as allCharts from './index';

export const ChartStack = <TData extends DataRow>({
  charts,
  action = 'add',
  userInterests = [],
  defIds,
  view,
  onToggle,
  isIncludedFn,
}: ChartStackProps<TData>) => {
  const isGallery = view === 'gallery';
  const Wrapper = isGallery ? SimpleGrid : Stack;
  const wrapperProps = isGallery
    ? { cols: { base: 1, sm: 2, lg: 2 }, spacing: 'md', verticalSpacing: 'md' }
    : {};

  return (
    <Box px="md" w="100%">
      <Wrapper {...wrapperProps} mt={5}>
        {charts.map((chart, i) => {
          const ChartComponent = allCharts[
            chart.subtype as keyof typeof allCharts
          ] as React.FC<{ chart: ChartItem<TData> }>;

          const TrendComponent = chart.trendChart
            ? (allCharts[
                chart.trendChart as keyof typeof allCharts
              ] as React.FC<{
                chart: ChartItem<TData>;
              }>)
            : undefined;

          const matchedCategories =
            userInterests.length > 0 && chart.categories
              ? chart.categories.filter((cat) => userInterests.includes(cat))
              : [];

          const defId = defIds?.[i];
          const included = defId && isIncludedFn ? isIncludedFn(defId) : true;
          const handleToggle =
            defId && onToggle ? () => onToggle(defId) : undefined;

          if (chart.subtype === 'noteCard')
            return (
              <Card
                key={chart.id}
                shadow="sm"
                padding="sm"
                radius="md"
                withBorder
              >
                <Text size="sm" c="dimmed">
                  {chart.notes}
                </Text>
              </Card>
            );

          if (!ChartComponent) return null;
          if (!chart.data || chart.data.length === 0)
            return (
              <Card
                key={chart.id}
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
              >
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
              view={view}
              ChartComponent={ChartComponent}
              TrendComponent={TrendComponent}
              matchedCategories={matchedCategories}
              defId={defId}
              isIncluded={included}
              onToggle={handleToggle}
            />
          );
        })}
      </Wrapper>
    </Box>
  );
};

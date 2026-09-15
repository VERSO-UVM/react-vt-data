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
  HistoricPopulationChangeTrendChart,
  PopulationChangeTrendChart,
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
  HousingIncomeBurdenChart,
  DPTrendChart,
} from './TrendCharts';
export { EmploymentAreaChart } from './EmploymentAreaChart';

import { ChartItem, DataRow } from '@/types/cachedCharts';
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
  ScrollArea,
  TextInput,
  Textarea,
} from '@mantine/core';
import {
  CornersOutIcon,
  CornersInIcon,
  PencilSimpleIcon,
  DotsSixVerticalIcon,
} from '@phosphor-icons/react';
import * as motion from 'motion/react-client';
import { AddChart, RemoveChart, ToggleChart } from './saving';
import { useState } from 'react';
import { TableView, ViewSwitch } from './TableView';
import { usePdfMode } from '@/contexts/PdfModeContext';
import { useItems } from '@/components/ItemsProvider';
import classes from './ChartCard.module.css';
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@dnd-kit/core';

// ChartCard
interface ChartCardProps<TData extends DataRow> {
  chart: ChartItem<TData>;
  ChartComponent: React.FC<{
    chart: ChartItem<TData>;
    view?: 'gallery' | 'report';
    onPlotData?: (rows: DataRow[]) => void;
  }>;
  TrendComponent?: React.FC<{
    chart: ChartItem<TData>;
    view?: 'gallery' | 'report';
    onPlotData?: (rows: DataRow[]) => void;
  }>;
  matchedCategories?: string[];
  action?: 'add' | 'remove' | 'toggle';
  defId?: string;
  isIncluded?: boolean;
  onToggle?: () => void;
  view?: 'gallery' | 'report';
  border?: boolean;
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
  };
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
  dragHandleProps,
}: ChartCardProps<TData>) => {
  const isPdfMode = usePdfMode();
  const isGallery = view === 'gallery';
  const showBorder = border === true;
  const [isHovered, setIsHovered] = useState(false);

  // Stable across renders even though chart.id is a fresh UUID every render
  // (auto-populated items are rebuilt from live data on each mount) — this is
  // the only safe key for persisted per-chart customization.
  const customizationId = defId ?? chart.id;
  const { chartCustomizations, setChartView, setChartTitle, setChartNotes } =
    useItems();
  const customization = chartCustomizations[customizationId];

  const isTablePrimary = chart.subtype.startsWith('renderTable');
  const [localView, setLocalViewState] = useState<'chart' | 'table'>(
    () => customization?.view ?? 'chart',
  );
  const setLocalView = (v: 'chart' | 'table') => {
    setLocalViewState(v);
    if (defId) setChartView(defId, v);
  };

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const displayTitle = customization?.title ?? chart.description;
  const displayNotes = customization?.notes ?? chart.notes;
  const canEdit = !isGallery && !isPdfMode && !!defId;

  const selfManagesViews = !!chart.chartParams?.noViewSwitch;

  const showViewSwitch =
    !selfManagesViews &&
    !isGallery &&
    (isTablePrimary ? !!TrendComponent : true);

  const [trendPlotData, setTrendPlotData] = useState<DataRow[] | undefined>();

  const content = selfManagesViews ? (
    <ChartComponent chart={chart} view={view} />
  ) : isTablePrimary ? (
    localView === 'chart' && TrendComponent ? (
      <TrendComponent chart={chart} view={view} onPlotData={setTrendPlotData} />
    ) : TrendComponent ? (
      <TableView chart={chart} rows={trendPlotData} />
    ) : (
      <ChartComponent chart={chart} view={view} />
    )
  ) : (
    <>
      <Box display={localView === 'chart' ? 'block' : 'none'} h="100%">
        <ChartComponent
          chart={chart}
          view={view}
          onPlotData={setTrendPlotData} // TypeScript will now accept this cleanly!
        />
      </Box>

      {localView === 'table' && (
        <Box h={400}>
          <TableView chart={chart} rows={trendPlotData} />
        </Box>
      )}
    </>
  );

  const isHighlighted = matchedCategories.length > 0;
  const allCategories = chart.categories ?? [];

  // Table-primary items showing their trend chart still need a definite
  // height in PDF mode — the chart's ResponsiveContainer is height="100%",
  // which collapses to 0 against an 'auto'-height ancestor. 'auto' is only
  // safe when a native table (which sizes to its own content) is showing.
  const showsTrendChart =
    isTablePrimary && localView === 'chart' && !!TrendComponent;

  const chartBoxHeight = isPdfMode
    ? isTablePrimary && !showsTrendChart
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
        data-chart-id={customizationId}
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
            {dragHandleProps && !isPdfMode && (
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                style={{ cursor: 'grab', touchAction: 'none' }}
                {...dragHandleProps.attributes}
                {...dragHandleProps.listeners}
              >
                <DotsSixVerticalIcon size={16} />
              </ActionIcon>
            )}
            {isEditingTitle ? (
              <TextInput
                autoFocus
                size="sm"
                defaultValue={displayTitle}
                onBlur={(e) => {
                  setChartTitle(defId!, e.currentTarget.value);
                  setIsEditingTitle(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                style={{ flex: '0 1 auto' }}
              />
            ) : (
              <Title order={isGallery ? 5 : 2} fw={500} lineClamp={1}>
                {displayTitle}
              </Title>
            )}
            {canEdit && !isEditingTitle && (
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => setIsEditingTitle(true)}
                aria-label="Edit chart title"
              >
                <PencilSimpleIcon size={14} />
              </ActionIcon>
            )}
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

          {canEdit ? (
            isEditingNotes ? (
              <Textarea
                autoFocus
                size="xs"
                mb={8}
                placeholder="Add a note for this chart…"
                defaultValue={displayNotes ?? ''}
                onBlur={(e) => {
                  setChartNotes(defId!, e.currentTarget.value);
                  setIsEditingNotes(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsEditingNotes(false);
                }}
              />
            ) : (
              <Text
                size="xs"
                c="dimmed"
                fs={displayNotes ? undefined : 'italic'}
                mb={8}
                onClick={() => setIsEditingNotes(true)}
                style={{ cursor: 'text' }}
              >
                {displayNotes || '+ Add note'}
              </Text>
            )
          ) : (
            displayNotes && (
              <Text size="xs" c="dimmed" mb={8}>
                {displayNotes}
              </Text>
            )
          )}
        </Box>

        <Box w="100%">
          <Box
            data-chart-box
            className={classes.chartBox}
            style={{
              height: chartBoxHeight,
              overflow: isGallery ? 'hidden' : 'visible',
              minHeight: isGallery ? 220 : 400,
              ...(isGallery ? {} : { minHeight: 400 }),
            }}
          >
            {content}
          </Box>
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

import * as allCharts from './index';

interface ChartStackItemProps<TData extends DataRow> {
  chart: ChartItem<TData>;
  action?: 'add' | 'remove' | 'toggle';
  view?: 'gallery' | 'report';
  userInterests?: string[];
  defId?: string;
  isIncludedFn?: (defId: string) => boolean;
  onToggle?: (defId: string) => void;
  dragHandleProps?: ChartCardProps<TData>['dragHandleProps'];
}

/**
 * Resolves a single ChartItem to its rendered form (ChartCard, note card, or
 * "no data" placeholder). Extracted from ChartStack's map so the
 * working-report page can render sortable chart cards one at a time (via
 * @dnd-kit) while sharing the exact same resolution logic.
 */
export const ChartStackItem = <TData extends DataRow>({
  chart,
  action = 'add',
  view,
  userInterests = [],
  defId,
  isIncludedFn,
  onToggle,
  dragHandleProps,
}: ChartStackItemProps<TData>) => {
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

  const included = defId && isIncludedFn ? isIncludedFn(defId) : true;
  const handleToggle = defId && onToggle ? () => onToggle(defId) : undefined;

  if (chart.subtype === 'noteCard')
    return (
      <Card shadow="sm" padding="sm" radius="md" withBorder>
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
      chart={chart}
      action={action}
      view={view}
      ChartComponent={ChartComponent}
      TrendComponent={TrendComponent}
      matchedCategories={matchedCategories}
      defId={defId}
      isIncluded={included}
      onToggle={handleToggle}
      dragHandleProps={dragHandleProps}
    />
  );
};

interface ChartStackProps<TData extends DataRow> {
  charts: ChartItem<TData>[];
  action?: 'add' | 'remove' | 'toggle';
  userInterests?: string[];
  defIds?: (string | undefined)[];
  view?: 'gallery' | 'report';
  onToggle?: (defId: string) => void;
  isIncludedFn?: (defId: string) => boolean;
}

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
          const defId = defIds?.[i];
          return (
            <ChartStackItem
              key={defId ?? chart.id}
              chart={chart}
              action={action}
              view={view}
              userInterests={userInterests}
              defId={defId}
              isIncludedFn={isIncludedFn}
              onToggle={onToggle}
            />
          );
        })}
      </Wrapper>
    </Box>
  );
};

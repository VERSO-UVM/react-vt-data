'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Container,
  Divider,
  Grid,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { ChartStack, ChartStackItem } from '@/components/Charts';
import { useProfile } from '@/components/profile/profileStore';
import {
  useApplyFilters,
  buildFilters,
} from '@/components/FilterUI/useApplyFilters';
import { motion } from 'motion/react';
import {
  PencilSimpleIcon,
  DownloadSimpleIcon,
  DotsSixVerticalIcon,
  CaretDownIcon,
  CaretRightIcon,
  XIcon,
} from '@phosphor-icons/react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChartDef, chartDefs } from '@/components/Charts/configs/ChartDefs';
import { ChartItem, ChartMetadata, DataRow } from '@/types/cachedCharts';
import type { PdfSection } from '@/lib/pdfReport/types';
import { COLORS, FONTS } from '@/app/theme';

// one chart's backend payload, keyed by chart def id in state below
export type ChartPayload = {
  data: DataRow[];
  metadata?: ChartMetadata;
  tableData?: DataRow[];
};

import { createChartItem, createTableItem } from '@/utils/itemFactory';
import { useItems } from '@/components/ItemsProvider';
import { PdfModeContext } from '@/contexts/PdfModeContext';

function HeroSection({
  myLocation,
  comparison,
  interests,
  yearMin,
  yearMax,
  openProfileModal,
  isGenerating,
  handleDownloadPdf,
  handleClearReport,
}: {
  myLocation: any;
  comparison: any;
  interests: string[];
  yearMin: number;
  yearMax: number;
  openProfileModal: () => void;
  isGenerating: boolean;
  handleDownloadPdf: () => void;
  handleClearReport: () => void;
}) {
  return (
    <Box
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100vw',
        left: '50%',
        marginLeft: '-50vw',
        background: `linear-gradient(160deg, ${COLORS.spruceDeep} 0%, ${COLORS.spruce} 100%)`,
        paddingTop: 70,
        paddingBottom: 40,
      }}
    >
      <Container size="xl">
        <Grid gap="md" align="center">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <Group>
                <Text
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 12,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: COLORS.amberSoft,
                  }}
                >
                  Working Report
                </Text>
                <Badge
                  style={{
                    color: COLORS.birchDim,
                    background: COLORS.amber,
                    fontFamily: FONTS.mono,
                  }}
                >
                  Beta
                </Badge>
              </Group>
            </motion.div>
            <Title
              order={1}
              style={{
                fontFamily: FONTS.display,
                fontWeight: 600,
                fontSize: 'clamp(2.3rem, 5.4vw, 3.7rem)',
                lineHeight: 1.04,
                color: COLORS.birch,
                marginTop: 14,
                maxWidth: 640,
              }}
            >
              {myLocation?.name || 'No Location Selected'}
              {comparison?.name && (
                <Text
                  span
                  style={{
                    fontFamily: FONTS.display,
                    fontWeight: 400,
                    fontSize: '0.4em',
                    color: 'rgba(246, 245, 239, 0.58)',
                    display: 'block',
                    marginTop: 8,
                  }}
                >
                  compared to {comparison.name}
                </Text>
              )}
            </Title>
            <ReportActions
              isGenerating={isGenerating}
              onDownload={handleDownloadPdf}
              onClear={handleClearReport}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Box
                style={{
                  background: 'rgba(246,245,239,0.07)',
                  border: '1px solid rgba(246,245,239,0.18)',
                  borderRadius: 14,
                  padding: '16px 18px',
                  backdropFilter: 'blur(6px)',
                }}
              >
                <Group justify="space-between" align="center" mb={10}>
                  <Text
                    style={{
                      fontFamily: FONTS.mono,
                      color: COLORS.amberSoft,
                      fontSize: 12,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Report Summary
                  </Text>
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    rightSection={<PencilSimpleIcon size={16} weight="bold" />}
                    onClick={openProfileModal}
                    styles={{ root: { color: COLORS.amberSoft } }}
                  >
                    Edit
                  </Button>
                </Group>
                <Stack gap={10}>
                  <ProfileField
                    label="Location"
                    value={myLocation?.name}
                    small
                  />
                  <ProfileField
                    label="Comparing to"
                    value={comparison?.name}
                    small
                  />
                  <ProfileField
                    label="Years"
                    value={`${yearMin}–${yearMax}`}
                    small
                  />
                  <Box>
                    <FieldLabel small>Interests</FieldLabel>
                    {interests.length > 0 ? (
                      <Text
                        size="sm"
                        style={{ color: COLORS.birch, fontWeight: 500 }}
                      >
                        {interests.join(' · ')}
                      </Text>
                    ) : (
                      <Text
                        size="sm"
                        style={{ color: 'rgba(246,245,239,0.55)' }}
                      >
                        None selected
                      </Text>
                    )}
                  </Box>
                </Stack>
              </Box>
            </motion.div>
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );
}

function FieldLabel({
  children,
  small,
}: {
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <Text
      style={{
        fontFamily: FONTS.mono,
        fontSize: small ? 10 : 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'rgba(246,245,239,0.5)',
        marginBottom: 4,
      }}
    >
      {children}
    </Text>
  );
}

function ProfileField({
  label,
  value,
  small,
}: {
  label: string;
  value?: string;
  small?: boolean;
}) {
  return (
    <Box>
      <FieldLabel small={small}>{label}</FieldLabel>
      <Text
        size={small ? 'sm' : 'md'}
        style={{ color: COLORS.birch, fontWeight: 500 }}
      >
        {value || '—'}
      </Text>
    </Box>
  );
}

type ReportActionsProps = {
  isGenerating: boolean;
  onDownload: () => void;
  onClear: () => void;
};

function ReportActions({
  isGenerating,
  onDownload,
  onClear,
}: ReportActionsProps) {
  return (
    <Group mt={20}>
      <Button
        size="sm"
        loading={isGenerating}
        onClick={onDownload}
        leftSection={<DownloadSimpleIcon size={16} weight="bold" />}
        style={{
          backgroundColor: COLORS.birchDim,
          color: COLORS.spruceDeep,
          border: 'none',
          fontFamily: FONTS.body,
        }}
      >
        Download PDF
      </Button>

      <Button
        size="sm"
        variant="light"
        color="red"
        onClick={onClear}
        leftSection={<XIcon size={16} weight="bold" />}
        style={{
          border: 'none',
          fontFamily: FONTS.body,
        }}
      >
        Clear report
      </Button>
    </Group>
  );
}

function SortableSection({
  id,
  children,
}: {
  id: string;
  children: (handleProps: {
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
  }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners })}
    </div>
  );
}

function SortableChartItem({
  id,
  chart,
  defId,
  userInterests,
  isIncludedFn,
  onToggle,
}: {
  id: string;
  chart: ChartItem<DataRow>;
  defId: string;
  userInterests: string[];
  isIncludedFn: (defId: string) => boolean;
  onToggle: (defId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : undefined,
    position: 'relative',
  };
  return (
    <div ref={setNodeRef} style={style}>
      <ChartStackItem
        chart={chart}
        action="toggle"
        view="report"
        userInterests={userInterests}
        defId={defId}
        isIncludedFn={isIncludedFn}
        onToggle={onToggle}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
}

export default function WorkingReport() {
  const chartsRef = useRef<HTMLDivElement>(null);
  const [isPdfMode, setIsPdfMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );
  const toggleSectionCollapsed = (category: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const {
    myLocation,
    comparison,
    interests,
    yearMin,
    yearMax,
    profileSet,
    profileModalOpen,
    openProfileModal,
  } = useProfile();
  const {
    excludedIds,
    toggleExcluded,
    excludeById,
    includeById,
    items: savedItems,
    clearItems,
    sessionInitialized,
    setSessionInitialized,
    pendingReset,
    setPendingReset,
    chartCustomizations,
    sectionOrder,
    sectionChartOrder,
    layoutStyle,
    reorderSections,
    reorderChartsInSection,
    setLayoutStyle,
    resetLayout,
  } = useItems();

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // Set inclusion for every chart based on the user's interests: a chart is
  // included only if it shares a category with an interest. With no
  // interests selected, nothing matches, so the report starts empty.
  const applyInterestExclusions = (currentInterests: string[]) => {
    chartDefs.forEach((def) => {
      const matches =
        currentInterests.length > 0 &&
        !!def.categories?.some((cat) => currentInterests.includes(cat));
      if (matches) includeById(def.id);
      else excludeById(def.id);
    });
    savedItems.forEach((item) => {
      const matches =
        currentInterests.length > 0 &&
        !!('categories' in item ? item.categories : undefined)?.some(
          (cat: string) => currentInterests.includes(cat),
        );
      if (matches) includeById(item.id);
      else excludeById(item.id);
    });
  };

  // Reset inclusions based on profile interests, both on first load of a new
  // browser session (sessionStorage clears on tab close) and after a manual
  // clear. A brand-new user hasn't saved a profile yet (profileSet is false)
  // — wait for that first save rather than defaulting on the empty interests
  // they start with. After that, a "Clear report" reopens the modal for
  // picking new interests — wait for it to close before recomputing, so this
  // doesn't fire on stale interests the instant the modal opens.
  useEffect(() => {
    if (sessionInitialized && !pendingReset) return;
    if (!profileSet) return;
    if (profileModalOpen) return;
    applyInterestExclusions(interests);
    if (!sessionInitialized) setSessionInitialized(true);
    if (pendingReset) setPendingReset(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    interests,
    profileSet,
    profileModalOpen,
    sessionInitialized,
    pendingReset,
  ]);

  // ---------- data fetching (mirrors data-viewer) ----------
  const [chartData, setChartData] = useState<Record<string, ChartPayload>>({});
  const [compareChartData, setCompareChartData] = useState<
    Record<string, ChartPayload>
  >({});
  const [compareTableData, setCompareTableData] = useState<
    Record<string, DataRow[]>
  >({});

  const applyFilters = useApplyFilters();
  const tableDefs = chartDefs.filter((c) =>
    c.subtype.startsWith('renderTable'),
  );
  const nonTableDefs = chartDefs.filter(
    (c) => !c.subtype.startsWith('renderTable'),
  );

  useEffect(() => {
    nonTableDefs.forEach((chart: ChartDef) => {
      const url = chart.url;
      const filters = buildFilters(myLocation, {
        col: 'year',
        selected: [
          (chart.chartParams?.fixedYear as number | undefined) ?? yearMin,
          (chart.chartParams?.fixedYear as number | undefined) ?? yearMax,
        ],
      });
      const compFilters = buildFilters(comparison, {
        col: 'year',
        selected: [
          (chart.chartParams?.fixedYear as number | undefined) ?? yearMin,
          (chart.chartParams?.fixedYear as number | undefined) ?? yearMax,
        ],
      });

      applyFilters({
        dataURL: url,
        filters: filters,
        onData: (data, metadata, tableData) =>
          setChartData((prev) => ({
            ...prev,
            [chart.id]: {
              data: data as DataRow[],
              metadata: metadata as ChartMetadata,
              tableData: tableData as DataRow[] | undefined,
            },
          })),
      });

      applyFilters({
        dataURL: url,
        filters: compFilters,
        onData: (data, metadata, tableData) =>
          setCompareChartData((prev) => ({
            ...prev,
            [chart.id]: {
              data: data as DataRow[],
              metadata: metadata as ChartMetadata,
              tableData: tableData as DataRow[] | undefined,
            },
          })),
      });
    });
  }, [myLocation, comparison, yearMin, yearMax]);

  useEffect(() => {
    const seen = new Set<string>();
    tableDefs.forEach((def) => {
      const effectiveExtra = def.tableConfig?.extraParams
        ? {
            ...def.tableConfig.extraParams,
            year_min: yearMin,
            year_max: yearMax,
          }
        : { year_min: yearMin, year_max: yearMax };
      const key = `${def.url}::${JSON.stringify(effectiveExtra)}`;
      if (seen.has(key)) return;
      seen.add(key);
      const siblings = tableDefs.filter((d) => {
        const extra = d.tableConfig?.extraParams
          ? {
              ...d.tableConfig.extraParams,
              year_min: yearMin,
              year_max: yearMax,
            }
          : { year_min: yearMin, year_max: yearMax };
        return `${d.url}::${JSON.stringify(extra)}` === key;
      });
      applyFilters({
        dataURL: def.url,
        filters: buildFilters(myLocation, {
          col: 'year',
          selected: [yearMin, yearMax],
        }),
        onData: (data, metadata) =>
          siblings.forEach((d) =>
            setChartData((prev) => ({
              ...prev,
              [d.id]: {
                data: data as DataRow[],
                metadata: metadata as ChartMetadata,
              },
            })),
          ),
      });
      if (comparison.name) {
        applyFilters({
          dataURL: def.url,
          filters: buildFilters(comparison, {
            col: 'year',
            selected: [yearMin, yearMax],
          }),
          onData: (data) =>
            siblings.forEach((d) =>
              setCompareTableData((prev) => ({
                ...prev,
                [d.id]: data as DataRow[],
              })),
            ),
        });
      }
    });
  }, [myLocation, comparison, yearMin, yearMax]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- build chart items ----------
  const isSubcountyLocation = myLocation.type === 'town';
  const employmentCounty = myLocation.county;

  const charts = nonTableDefs.map((chart) => {
    if (chart.id === 'employment' && isSubcountyLocation) {
      return createChartItem({
        title: myLocation.name,
        xField: '',
        yField: '',
        data: [],
        subtype: 'noteCard',
        categories: chart.categories,
        notes: `County-level data (${employmentCounty} County) — QCEW does not report employment at the town level.`,
      });
    }
    return createChartItem({
      title: myLocation.name,
      xField: chart.xField,
      yField: chart.yField,
      data: chartData[chart.id]?.data || [],
      tableData: chartData[chart.id]?.tableData || [],
      showCols: chart.showCols,
      metadata: chartData[chart.id]?.metadata,
      compareData: compareChartData[chart.id]?.data || [],
      compareTableData: compareChartData[chart.id]?.tableData || [],
      subtype: chart.subtype,
      chartParams: {
        ...chart.chartParams,
        legendLabels: [myLocation.name, comparison.name],
      },
      description: chart.title,
      notes: chart.notes,
      categories: chart.categories,
    });
  });

  const tableItems = tableDefs.map((def) =>
    createTableItem({
      title: myLocation.name,
      description: def.title,
      data: chartData[def.id]?.data || [],
      metadata: chartData[def.id]?.metadata,
      compareData: compareTableData[def.id] || [],
      chartParams: { legendLabels: [myLocation.name, comparison.name] },
      notes: def.notes,
      subtype: def.subtype,
      trendChart: def.trendChart,
      categories: def.categories,
    }),
  );

  // Canonical category order derived from chartDefs (first occurrence wins)
  const CATEGORY_ORDER: string[] = [];
  chartDefs.forEach((def) =>
    def.categories?.forEach((cat) => {
      if (!CATEGORY_ORDER.includes(cat)) CATEGORY_ORDER.push(cat);
    }),
  );
  const categoryRank = (cats?: string[]) => {
    if (!cats?.length) return CATEGORY_ORDER.length; // uncategorised goes last
    const ranks = cats.map((c) => {
      const i = CATEGORY_ORDER.indexOf(c);
      return i === -1 ? CATEGORY_ORDER.length : i;
    });
    return Math.min(...ranks);
  };

  // Pair each item with its stable ID (chartDef ID for auto-populated;
  // item.id for manually saved charts from other pages), then sort by category
  const savedCharts = savedItems.filter(
    (i) => i.type === 'chart',
  ) as ChartItem<DataRow>[];
  const allPairs = [
    ...nonTableDefs.map((def, i) => ({ defId: def.id, item: charts[i] })),
    ...tableDefs.map((def, i) => ({ defId: def.id, item: tableItems[i] })),
    ...savedCharts.map((item) => ({ defId: item.id, item })),
  ].sort(
    (a, b) => categoryRank(a.item.categories) - categoryRank(b.item.categories),
  );

  const isIncluded = (defId: string) => !excludedIds.includes(defId);
  const includedPairs = allPairs.filter((p) => isIncluded(p.defId));
  const excludedPairs = allPairs.filter((p) => !isIncluded(p.defId));

  // ---------- report builder: sections + per-section chart order ----------
  // Included charts grouped by their first category — this is the same
  // grouping rule the PDF uses, so screen and PDF always agree on sections.
  const categoryMap = new Map<string, typeof includedPairs>();
  includedPairs.forEach((p) => {
    const cat = p.item.categories?.[0] ?? 'Other';
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(p);
  });

  // User-ordered sections first (dropping any that no longer have charts),
  // then any categories not yet ordered, ranked by the chartDefs-derived
  // CATEGORY_ORDER as a sensible default.
  const resolvedSectionOrder: string[] = [
    ...sectionOrder.filter((cat) => categoryMap.has(cat)),
    ...Array.from(categoryMap.keys())
      .filter((cat) => !sectionOrder.includes(cat))
      .sort((a, b) => categoryRank([a]) - categoryRank([b])),
  ];

  const resolveChartOrder = (category: string) => {
    const pairs = categoryMap.get(category) ?? [];
    const orderIds = sectionChartOrder[category] ?? [];
    const byId = new Map(pairs.map((p) => [p.defId, p]));
    const known = orderIds
      .map((id) => byId.get(id))
      .filter((p): p is (typeof pairs)[number] => !!p);
    const knownIds = new Set(known.map((p) => p.defId));
    const missing = pairs.filter((p) => !knownIds.has(p.defId));
    return [...known, ...missing];
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith('section:')) {
      if (!overId.startsWith('section:')) return;
      const ids = resolvedSectionOrder.map((c) => `section:${c}`);
      const oldIndex = ids.indexOf(activeId);
      const newIndex = ids.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return;
      reorderSections(arrayMove(resolvedSectionOrder, oldIndex, newIndex));
      return;
    }

    // Chart card drag — only reorder within the same section (categories
    // are fixed; dropping on a card from a different section is a no-op).
    const category =
      includedPairs.find((p) => p.defId === activeId)?.item.categories?.[0] ??
      'Other';
    const ids = resolveChartOrder(category).map((p) => p.defId);
    if (!ids.includes(overId)) return;
    const oldIndex = ids.indexOf(activeId);
    const newIndex = ids.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) return;
    reorderChartsInSection(category, arrayMove(ids, oldIndex, newIndex));
  };

  // ---------- PDF ----------
  const handleDownloadPdf = async () => {
    if (!chartsRef.current) return;
    setIsGenerating(true);
    try {
      flushSync(() => setIsPdfMode(true));
      await new Promise((r) => setTimeout(r, 300));

      const sections: PdfSection[] = resolvedSectionOrder.map((category) => ({
        category,
        items: resolveChartOrder(category).map(({ defId, item }) => {
          const isTablePrimary = item.subtype.startsWith('renderTable');
          const forcedTable = isTablePrimary && !item.trendChart;
          const customization = chartCustomizations[defId];
          const label = customization?.title ?? item.description;
          return {
            chart: item,
            defId,
            mode: forcedTable ? 'native-table' : 'image',
            title: [label, item.title].filter(Boolean).join(' for '),
            notes: customization?.notes ?? item.notes,
          };
        }),
      }));

      const { generateReportPdf } = await import('@/lib/pdfReport/generatePdf');
      await generateReportPdf(sections, chartsRef.current!, myLocation.name);
    } catch (err) {
      console.error('[WorkingReport] PDF generation failed:', err);
      alert('PDF generation failed — see the browser console for details.');
    } finally {
      setIsPdfMode(false);
      setIsGenerating(false);
    }
  };

  const handleClearReport = () => {
    clearItems();
    chartDefs.forEach((def) => excludeById(def.id));
    resetLayout();
    setPendingReset(true);
    openProfileModal();
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <HeroSection
          myLocation={myLocation}
          comparison={comparison}
          interests={interests}
          yearMin={yearMin}
          yearMax={yearMax}
          openProfileModal={openProfileModal}
          isGenerating={isGenerating}
          handleDownloadPdf={handleDownloadPdf}
          handleClearReport={handleClearReport}
        />
        {!isPdfMode && includedPairs.length > 0 && (
          <Group justify="flex-end" px="md">
            <Text size="sm" c="dimmed">
              Layout
            </Text>
            <SegmentedControl
              size="xs"
              value={layoutStyle}
              onChange={(v) => setLayoutStyle(v as 'list' | 'grid')}
              data={[
                { label: 'List', value: 'list' },
                { label: 'Grid', value: 'grid' },
              ]}
            />
          </Group>
        )}

        <PdfModeContext.Provider value={isPdfMode}>
          <div ref={chartsRef}>
            <DndContext
              id="working-report-dnd"
              sensors={dndSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={resolvedSectionOrder.map((c) => `section:${c}`)}
                strategy={verticalListSortingStrategy}
              >
                <Stack gap="xl" px="md">
                  {resolvedSectionOrder.map((category) => {
                    const pairs = resolveChartOrder(category);
                    const chartIds = pairs.map((p) => p.defId);
                    const effectiveLayoutStyle = isPdfMode
                      ? 'list'
                      : layoutStyle;
                    const ChartWrapper =
                      effectiveLayoutStyle === 'grid' ? SimpleGrid : Stack;
                    const chartWrapperProps =
                      effectiveLayoutStyle === 'grid'
                        ? {
                            cols: { base: 1, md: 2 },
                            spacing: 'md',
                            verticalSpacing: 'md',
                          }
                        : {};
                    const isCollapsed = collapsedSections.has(category);
                    return (
                      <SortableSection
                        key={category}
                        id={`section:${category}`}
                      >
                        {(handleProps) => (
                          <Box>
                            <Group mb="sm" gap={6} justify="space-between">
                              <Group gap={6}>
                                {!isPdfMode && (
                                  <Box
                                    style={{
                                      cursor: 'grab',
                                      touchAction: 'none',
                                    }}
                                    {...handleProps.attributes}
                                    {...handleProps.listeners}
                                  >
                                    <DotsSixVerticalIcon size={18} />
                                  </Box>
                                )}
                                <Title order={3}>{category}</Title>
                              </Group>
                              {!isPdfMode && (
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  onClick={() =>
                                    toggleSectionCollapsed(category)
                                  }
                                  aria-label={
                                    isCollapsed
                                      ? `Expand ${category}`
                                      : `Collapse ${category}`
                                  }
                                >
                                  {isCollapsed ? (
                                    <CaretRightIcon size={18} />
                                  ) : (
                                    <CaretDownIcon size={18} />
                                  )}
                                </ActionIcon>
                              )}
                            </Group>
                            <Collapse expanded={isPdfMode || !isCollapsed}>
                              <SortableContext
                                items={chartIds}
                                strategy={verticalListSortingStrategy}
                              >
                                <ChartWrapper {...chartWrapperProps}>
                                  {pairs.map(({ defId, item }) => (
                                    <SortableChartItem
                                      key={defId}
                                      id={defId}
                                      chart={item}
                                      defId={defId}
                                      userInterests={interests}
                                      isIncludedFn={isIncluded}
                                      onToggle={toggleExcluded}
                                    />
                                  ))}
                                </ChartWrapper>
                              </SortableContext>
                            </Collapse>
                          </Box>
                        )}
                      </SortableSection>
                    );
                  })}
                </Stack>
              </SortableContext>
            </DndContext>
          </div>
        </PdfModeContext.Provider>

        {excludedPairs.length > 0 && (
          <>
            <Divider
              label="Not included in report"
              labelPosition="center"
              mt="xl"
              size="md"
            />
            <Box>
              <ChartStack
                charts={excludedPairs.map((p) => p.item)}
                action="toggle"
                userInterests={interests}
                defIds={excludedPairs.map((p) => p.defId)}
                onToggle={toggleExcluded}
                isIncludedFn={isIncluded}
              />
            </Box>
          </>
        )}
      </Stack>
    </Container>
  );
}

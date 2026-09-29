'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Checkbox,
  Collapse,
  Container,
  Drawer,
  Grid,
  Group,
  List,
  Menu,
  Modal,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { ChartStackItem } from '@/components/Charts';
import { useProfile } from '@/components/profile/profileStore';
import {
  useApplyFilters,
  buildFilters,
} from '@/components/FilterUI/useApplyFilters';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  PencilSimpleIcon,
  EyeIcon,
  DownloadSimpleIcon,
  DotsSixVerticalIcon,
  CaretDownIcon,
  CaretRightIcon,
  DotsThreeIcon,
  ListBulletsIcon,
  TrashIcon,
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

// Sticky offsets: --header-offset tracks the site header (0 while it hides
// on scroll, see globals.css); the report toolbar is ~60px below it.
const TOOLBAR_H = 60;
const BELOW_TOOLBAR = `calc(var(--header-offset) + ${TOOLBAR_H + 16}px)`;

function HeroSection({
  myLocation,
  comparison,
  yearMin,
  yearMax,
  openProfileModal,
}: {
  myLocation: { name?: string };
  comparison: { name?: string };
  yearMin: number;
  yearMax: number;
  openProfileModal: () => void;
}) {
  return (
    <Box
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100vw',
        left: '50%',
        marginLeft: '-50vw',
        marginTop: 'calc(-1 * var(--mantine-spacing-xl))',
        background: `linear-gradient(160deg, ${COLORS.spruceDeep} 0%, ${COLORS.spruce} 100%)`,
        paddingTop: 36,
        paddingBottom: 28,
      }}
    >
      <Container size="xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Group gap="xs" mb={10}>
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
              size="sm"
              style={{
                color: COLORS.birchDim,
                background: COLORS.amber,
                fontFamily: FONTS.mono,
              }}
            >
              Beta
            </Badge>
          </Group>
          <Title
            order={1}
            style={{
              fontFamily: FONTS.display,
              fontWeight: 600,
              fontSize: 'clamp(1.9rem, 4vw, 2.6rem)',
              lineHeight: 1.1,
              color: COLORS.birch,
            }}
          >
            {myLocation?.name || 'No location selected'}
          </Title>
          <Group gap="xs" mt={8} wrap="wrap">
            <Text style={{ color: 'rgba(246,245,239,0.72)' }}>
              {comparison?.name ? `Compared to ${comparison.name} · ` : ''}
              {yearMin}–{yearMax}
            </Text>
            <Button
              size="compact-sm"
              variant="subtle"
              leftSection={<PencilSimpleIcon size={14} weight="bold" />}
              onClick={openProfileModal}
              styles={{ root: { color: COLORS.amberSoft } }}
            >
              Edit profile
            </Button>
          </Group>
        </motion.div>
      </Container>
    </Box>
  );
}

function ReportToolbar({
  includedCount,
  sectionCount,
  previewMode,
  setPreviewMode,
  isGenerating,
  onDownload,
  onEditProfile,
  onClear,
  onOpenContents,
}: {
  includedCount: number;
  sectionCount: number;
  previewMode: boolean;
  setPreviewMode: (v: boolean) => void;
  isGenerating: boolean;
  onDownload: () => void;
  onEditProfile: () => void;
  onClear: () => void;
  onOpenContents: () => void;
}) {
  return (
    <Box
      style={{
        position: 'sticky',
        top: 'var(--header-offset)',
        transition: 'top 250ms ease',
        zIndex: 100,
        minHeight: TOOLBAR_H,
        // Full-bleed background and bottom rule without leaving the container
        background: 'var(--background)',
        boxShadow: `0 0 0 100vmax var(--background), 0 1px 0 100vmax ${COLORS.line}`,
        clipPath: 'inset(0 -100vmax -1px)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Group justify="space-between" w="100%" py="xs" gap="sm">
        <Group gap="sm">
          <Button
            hiddenFrom="md"
            size="xs"
            variant="default"
            leftSection={<ListBulletsIcon size={14} />}
            onClick={onOpenContents}
          >
            Contents
          </Button>
          <Text size="sm" c="dimmed">
            <Text span fw={700} c={COLORS.ink}>
              {includedCount}
            </Text>{' '}
            {includedCount === 1 ? 'chart' : 'charts'}
            {sectionCount > 0 && (
              <>
                {' in '}
                <Text span fw={700} c={COLORS.ink}>
                  {sectionCount}
                </Text>{' '}
                {sectionCount === 1 ? 'section' : 'sections'}
              </>
            )}
          </Text>
        </Group>
        <Group gap="sm">
          <SegmentedControl
            size="xs"
            value={previewMode ? 'preview' : 'edit'}
            onChange={(v) => setPreviewMode(v === 'preview')}
            data={[
              {
                label: (
                  <Center style={{ gap: 10 }}>
                    <PencilSimpleIcon size={16} />
                    <span>Edit</span>
                  </Center>
                ),
                value: 'edit',
              },
              {
                label: (
                  <Center style={{ gap: 10 }}>
                    <EyeIcon size={16} />
                    <span>Preview</span>
                  </Center>
                ),
                value: 'preview',
              },
            ]}
          />
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="default" size="lg" aria-label="More">
                <DotsThreeIcon size={18} weight="bold" />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<PencilSimpleIcon size={14} />}
                onClick={onEditProfile}
              >
                Edit profile
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<TrashIcon size={14} />}
                onClick={onClear}
              >
                Clear report…
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Button
            size="sm"
            loading={isGenerating}
            color={COLORS.spruce}
            disabled={includedCount === 0}
            onClick={onDownload}
            leftSection={<DownloadSimpleIcon size={16} weight="bold" />}
          >
            Download PDF
          </Button>
        </Group>
      </Group>
    </Box>
  );
}

type OutlineGroup = {
  category: string;
  rows: { defId: string; title: string; included: boolean }[];
};

// Table of contents: every available chart, grouped like the report. The
// checkbox is the single place to add/remove charts; clicking an included
// title jumps to it.
function ReportOutline({
  groups,
  onToggle,
  onJump,
}: {
  groups: OutlineGroup[];
  onToggle: (defId: string) => void;
  onJump: (defId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleCollapsed = (category: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(category)) next.add(category);
      return next;
    });

  return (
    <Stack gap="md">
      <Box>
        <Text fw={700}>Contents</Text>
        <Text size="xs" c="dimmed">
          Check a chart to add it to your report.
        </Text>
      </Box>
      {groups.map(({ category, rows }) => {
        const isOpen = !collapsed.has(category);
        return (
          <Box key={category}>
            <UnstyledButton
              w="100%"
              mb={isOpen ? 6 : 0}
              onClick={() => toggleCollapsed(category)}
              aria-expanded={isOpen}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap={4} wrap="nowrap">
                  {isOpen ? (
                    <CaretDownIcon size={12} weight="bold" color="gray" />
                  ) : (
                    <CaretRightIcon size={12} weight="bold" color="gray" />
                  )}
                  <Text
                    size="xs"
                    fw={700}
                    tt="uppercase"
                    c="dimmed"
                    style={{ letterSpacing: '0.06em' }}
                  >
                    {category}
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  {rows.filter((r) => r.included).length}/{rows.length}
                </Text>
              </Group>
            </UnstyledButton>
            <Collapse expanded={isOpen}>
              <Stack gap={6}>
                {rows.map((r) => (
                  <Group key={r.defId} gap={8} wrap="nowrap" align="flex-start">
                    <Checkbox
                      size="xs"
                      mt={2}
                      checked={r.included}
                      onChange={() => onToggle(r.defId)}
                      aria-label={`${r.included ? 'Remove' : 'Add'} ${r.title}`}
                    />
                    <Anchor
                      component="button"
                      type="button"
                      size="sm"
                      lh={1.3}
                      ta="left"
                      underline="hover"
                      c={r.included ? COLORS.ink : 'dimmed'}
                      onClick={() =>
                        r.included ? onJump(r.defId) : onToggle(r.defId)
                      }
                    >
                      {r.title}
                    </Anchor>
                  </Group>
                ))}
              </Stack>
            </Collapse>
          </Box>
        );
      })}
    </Stack>
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
    <div
      ref={setNodeRef}
      id={`chart-${defId}`}
      style={{ ...style, scrollMarginTop: BELOW_TOOLBAR }}
    >
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
  // Preview hides editing chrome (same as PDF mode) without changing layout
  const [previewMode, setPreviewMode] = useState(false);
  const hideChrome = isPdfMode || previewMode;
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
    reorderSections,
    reorderChartsInSection,
    resetLayout,
    guideDismissed,
    dismissGuide,
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

  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const handleClearReport = () => {
    setClearConfirmOpen(false);
    clearItems();
    chartDefs.forEach((def) => excludeById(def.id));
    resetLayout();
    setPendingReset(true);
    openProfileModal();
  };

  // ---------- outline (table of contents) ----------
  const defTitles = new Map(chartDefs.map((d) => [d.id, d.title]));
  const outlineMap = new Map<string, OutlineGroup['rows']>();
  allPairs.forEach(({ defId, item }) => {
    const cat = item.categories?.[0] ?? 'Other';
    if (!outlineMap.has(cat)) outlineMap.set(cat, []);
    outlineMap.get(cat)!.push({
      defId,
      title:
        chartCustomizations[defId]?.title ||
        item.description ||
        defTitles.get(defId) ||
        item.title,
      included: isIncluded(defId),
    });
  });
  // Stable order (rows never jump when checked/unchecked): the user's
  // section/chart order where one exists, else the default chartDefs order.
  const defaultIndex = new Map(allPairs.map((p, i) => [p.defId, i]));
  const outlineGroups: OutlineGroup[] = [
    ...sectionOrder.filter((cat) => outlineMap.has(cat)),
    ...Array.from(outlineMap.keys())
      .filter((cat) => !sectionOrder.includes(cat))
      .sort((a, b) => categoryRank([a]) - categoryRank([b])),
  ].map((category) => {
    const userOrder = sectionChartOrder[category] ?? [];
    const rank = (id: string) =>
      userOrder.includes(id)
        ? userOrder.indexOf(id)
        : userOrder.length + (defaultIndex.get(id) ?? 0);
    return {
      category,
      rows: [...outlineMap.get(category)!].sort(
        (a, b) => rank(a.defId) - rank(b.defId),
      ),
    };
  });

  const [contentsOpen, setContentsOpen] = useState(false);
  const jumpToChart = (defId: string) => {
    setContentsOpen(false);
    if (collapsedSections.size) setCollapsedSections(new Set());
    requestAnimationFrame(() => {
      const el = document.getElementById(`chart-${defId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Charts above may still be growing as their data arrives, and the
      // site header hiding mid-scroll shifts the target — land it exactly.
      window.addEventListener(
        'scrollend',
        () => el.scrollIntoView({ block: 'start' }),
        { once: true },
      );
    });
  };

  const outline = (
    <ReportOutline
      groups={outlineGroups}
      onToggle={toggleExcluded}
      onJump={jumpToChart}
    />
  );

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <HeroSection
          myLocation={myLocation}
          comparison={comparison}
          yearMin={yearMin}
          yearMax={yearMax}
          openProfileModal={openProfileModal}
        />
        <ReportToolbar
          includedCount={includedPairs.length}
          sectionCount={resolvedSectionOrder.length}
          previewMode={previewMode}
          setPreviewMode={setPreviewMode}
          isGenerating={isGenerating}
          onDownload={handleDownloadPdf}
          onEditProfile={openProfileModal}
          onClear={() => setClearConfirmOpen(true)}
          onOpenContents={() => setContentsOpen(true)}
        />
        <Modal
          opened={clearConfirmOpen}
          onClose={() => setClearConfirmOpen(false)}
          title="Clear report?"
          centered
        >
          <Text size="sm">
            This removes all saved charts and layout changes. This can&apos;t be
            undone.
          </Text>
          <Group justify="flex-end" mt="lg">
            <Button
              variant="default"
              onClick={() => setClearConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button color="red" onClick={handleClearReport}>
              Clear report
            </Button>
          </Group>
        </Modal>
        <Drawer
          opened={contentsOpen}
          onClose={() => setContentsOpen(false)}
          title="Report contents"
          hiddenFrom="md"
        >
          {outline}
        </Drawer>

        <Grid gap="xl">
          {!previewMode && (
            <Grid.Col span={{ base: 12, md: 3 }} visibleFrom="md">
              <Box
                style={{
                  position: 'sticky',
                  top: BELOW_TOOLBAR,
                  transition: 'top 250ms ease',
                }}
              >
                <ScrollArea.Autosize
                  mah={`calc(100vh - ${BELOW_TOOLBAR} - 24px)`}
                  offsetScrollbars
                >
                  {outline}
                </ScrollArea.Autosize>
              </Box>
            </Grid.Col>
          )}
          <Grid.Col span={{ base: 12, md: previewMode ? 12 : 9 }}>
            <Stack gap="lg">
              {!guideDismissed && !previewMode && (
                <Alert
                  variant="light"
                  title="How this works"
                  withCloseButton
                  onClose={dismissGuide}
                  closeButtonLabel="Dismiss guide"
                >
                  <List type="ordered" size="sm" spacing={4}>
                    <List.Item>
                      Check charts under <b>Contents</b> to add them to your
                      report.
                    </List.Item>
                    <List.Item>
                      Drag <b>⋮⋮</b> to reorder. Click a chart&apos;s title or
                      note to edit it.
                    </List.Item>
                    <List.Item>
                      Switch to <b>Preview</b> to check it, then{' '}
                      <b>Download PDF</b>.
                    </List.Item>
                  </List>
                </Alert>
              )}

              {includedPairs.length === 0 && (
                <Card withBorder radius="md" padding="xl">
                  <Stack align="center" gap="xs">
                    <Title order={3}>Your report is empty</Title>
                    <Text c="dimmed" ta="center" maw={420}>
                      Check charts under Contents, or add them from the Data
                      Viewer.
                    </Text>
                    <Button
                      component={Link}
                      href="/data-viewer"
                      variant="filled"
                      color={COLORS.spruce}
                      mt="sm"
                    >
                      Go to Data Viewer
                    </Button>
                  </Stack>
                </Card>
              )}

              <Box
                style={
                  previewMode
                    ? {
                        maxWidth: 900,
                        width: '100%',
                        margin: '0 auto',
                        padding: '40px 36px',
                        background: '#fff',
                        borderRadius: 6,
                        border: `1px solid ${COLORS.line}`,
                        boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
                      }
                    : undefined
                }
              >
                <PdfModeContext.Provider value={hideChrome}>
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
                        <Stack gap={40}>
                          {resolvedSectionOrder.map((category) => {
                            const pairs = resolveChartOrder(category);
                            const chartIds = pairs.map((p) => p.defId);
                            const isCollapsed = collapsedSections.has(category);
                            return (
                              <SortableSection
                                key={category}
                                id={`section:${category}`}
                              >
                                {(handleProps) => (
                                  <Box>
                                    <Group
                                      mb="sm"
                                      pb={6}
                                      gap={6}
                                      justify="space-between"
                                      style={{
                                        borderBottom: `2px solid ${COLORS.line}`,
                                      }}
                                    >
                                      <Group gap={8}>
                                        {!hideChrome && (
                                          <Box
                                            style={{
                                              cursor: 'grab',
                                              touchAction: 'none',
                                              display: 'flex',
                                            }}
                                            aria-label={`Reorder ${category} section`}
                                            {...handleProps.attributes}
                                            {...handleProps.listeners}
                                          >
                                            <DotsSixVerticalIcon size={18} />
                                          </Box>
                                        )}
                                        <Title order={3}>{category}</Title>
                                        {!hideChrome && (
                                          <Badge
                                            variant="light"
                                            color="gray"
                                            size="sm"
                                          >
                                            {pairs.length}{' '}
                                            {pairs.length === 1
                                              ? 'chart'
                                              : 'charts'}
                                          </Badge>
                                        )}
                                      </Group>
                                      {!hideChrome && (
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
                                    <Collapse
                                      expanded={hideChrome || !isCollapsed}
                                    >
                                      <SortableContext
                                        items={chartIds}
                                        strategy={verticalListSortingStrategy}
                                      >
                                        <Stack>
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
                                        </Stack>
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
              </Box>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}

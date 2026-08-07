'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  Container,
  Text,
  Title,
  Button,
  Stack,
  Group,
  Divider,
  Box,
  Grid,
} from '@mantine/core';
import { ChartStack } from '@/components/Charts';
import { useProfile } from '@/components/profile/profileStore';
import {
  useApplyFilters,
  buildFilters,
} from '@/components/FilterUI/useApplyFilters';
import { motion } from 'motion/react';
import {
  PencilSimpleIcon,
  DownloadSimpleIcon,
  XIcon,
} from '@phosphor-icons/react';
import { ChartDef, chartDefs } from '@/components/Charts/configs/ChartDefs';
import { ChartItem, ChartMetadata, DataRow } from '@/types/cachedCharts';
import { COLORS, FONTS } from '@/app/theme';

// one chart's backend payload, keyed by chart def id in state below
type ChartPayload = {
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
    // Full-bleed: breaks out of the page's centered Container so the hero
    // touches both edges of the viewport instead of floating as a card.
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
          {/* Profile panel — sits beside the title, always on the dark
             background so the light text stays legible. Kept compact so
             it doesn't compete with the location title. */}
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

export default function WorkingReport() {
  const chartsRef = useRef<HTMLDivElement>(null);
  const [isPdfMode, setIsPdfMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    myLocation,
    comparison,
    interests,
    yearMin,
    yearMax,
    openProfileModal,
  } = useProfile();
  const {
    excludedIds,
    toggleExcluded,
    clearExclusions,
    excludeById,
    items: savedItems,
    clearItems,
    sessionInitialized,
    setSessionInitialized,
    pendingReset,
    setPendingReset,
  } = useItems();

  // Apply auto-exclude based on interests: exclude any chart whose categories
  // don't overlap with the user's interests (no-op if interests is empty).
  const applyInterestExclusions = (currentInterests: string[]) => {
    if (currentInterests.length === 0) return;
    chartDefs.forEach((def) => {
      const matches = def.categories?.some((cat) =>
        currentInterests.includes(cat),
      );
      if (!matches) excludeById(def.id);
    });
    savedItems.forEach((item) => {
      const matches = (
        'categories' in item ? item.categories : undefined
      )?.some((cat: string) => currentInterests.includes(cat));
      if (!matches) excludeById(item.id);
    });
  };

  // On first load of a new browser session, reset inclusions based on profile
  // interests. sessionStorage clears on tab close.
  useEffect(() => {
    if (!sessionInitialized) {
      clearExclusions();
      applyInterestExclusions(interests);
      setSessionInitialized(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // After a manual clear + profile save, re-apply exclusions with new interests.
  useEffect(() => {
    if (pendingReset) {
      applyInterestExclusions(interests);
      setPendingReset(false);
    }
  }, [interests, pendingReset]); // eslint-disable-line react-hooks/exhaustive-deps

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
          chart.chartParams?.fixedYear ?? yearMin,
          chart.chartParams?.fixedYear ?? yearMax,
        ],
      });
      const compFilters = buildFilters(comparison, {
        col: 'year',
        selected: [
          chart.chartParams?.fixedYear ?? yearMin,
          chart.chartParams?.fixedYear ?? yearMax,
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
        onData: (data) =>
          siblings.forEach((d) =>
            setChartData((prev) => ({
              ...prev,
              [d.id]: { data: data as DataRow[] },
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

  // ---------- PDF ----------
  const handleDownloadPdf = async () => {
    if (!chartsRef.current) return;
    setIsGenerating(true);
    try {
      flushSync(() => setIsPdfMode(true));
      await new Promise((r) => setTimeout(r, 300));
      const { generateReportPdf } = await import('@/lib/pdfReport/generatePdf');
      await generateReportPdf(
        includedPairs.map((p) => p.item),
        chartsRef.current!,
        myLocation.name,
      );
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
    clearExclusions();
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
        <PdfModeContext.Provider value={isPdfMode}>
          <div ref={chartsRef}>
            <ChartStack
              charts={includedPairs.map((p) => p.item)}
              action="toggle"
              userInterests={interests}
              defIds={includedPairs.map((p) => p.defId)}
              onToggle={toggleExcluded}
              isIncludedFn={isIncluded}
            />
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

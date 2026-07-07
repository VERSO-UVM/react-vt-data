'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  Container,
  Text,
  Title,
  Button,
  Center,
  Stack,
  Group,
  Divider,
  Box,
  Paper,
  Grid,
  Badge,
} from '@mantine/core';
import { ChartStack } from '@/components/Charts';
import { useProfile } from '@/components/profile/profileStore';
import {
  useApplyFilters,
  buildFilters,
} from '@/components/FilterUI/useApplyFilters';
import { ChartDef, chartDefs } from '@/components/Charts/configs/ChartDefs';
import { createChartItem, createTableItem } from '@/utils/itemFactory';
import { useItems } from '@/components/ItemsProvider';
import { PdfModeContext } from '@/contexts/PdfModeContext';

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
      const matches = (item as any).categories?.some((cat: string) =>
        currentInterests.includes(cat),
      );
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
  const [chartData, setChartData] = useState<
    Record<string, { data: any[]; metadata?: any; tableData?: any[] }>
  >({});
  const [compareChartData, setCompareChartData] = useState<
    Record<string, { data: any[]; metadata?: any; tableData?: any[] }>
  >({});
  const [compareTableData, setCompareTableData] = useState<
    Record<string, any[]>
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
        selected: [chart.chartParams?.fixedYear ?? yearMin,
                  chart.chartParams?.fixedYear ?? yearMax],
      });
      const compFilters = buildFilters(comparison, {
        col: 'year',
        selected: [chart.chartParams?.fixedYear ?? yearMin,
                  chart.chartParams?.fixedYear ?? yearMax],
      });

      applyFilters({
        dataURL: url,
        filters: filters,
        onData: (data, metadata, tableData) =>
          setChartData((prev) => ({
            ...prev,
            [chart.id]: { data, metadata, tableData },
          })),
      });

      applyFilters({
        dataURL: url,
        filters: compFilters,
        onData: (data, metadata, tableData) =>
          setCompareChartData((prev) => ({
            ...prev,
            [chart.id]: { data, metadata, tableData },
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
            setChartData((prev) => ({ ...prev, [d.id]: { data } })),
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
              setCompareTableData((prev) => ({ ...prev, [d.id]: data })),
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
      metadata: chartData[chart.id]?.metadata || [],
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
      metadata: chartData[def.id]?.metadata || [],
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
  const savedCharts = savedItems.filter((i) => i.type === 'chart') as any[];
  const allPairs = [
    ...nonTableDefs.map((def, i) => ({ defId: def.id, item: charts[i] })),
    ...tableDefs.map((def, i) => ({ defId: def.id, item: tableItems[i] })),
    ...savedCharts.map((item: any) => ({ defId: item.id, item })),
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

  function reportSummary() {
    return (
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Paper
          radius="xl"
          p="xl"
          withBorder
          shadow="sm"
          // Move position to the right
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'white',
            height: '100%',
          }}
        >
          <Title order={3} ta="right" mb="xl">
            Report Summary
          </Title>
          <Box>
            <Text size="xs" c="dimmed" ta="right">
              LOCATION
            </Text>
            <Text fw={600} ta="right" size="xl">
              {myLocation.name}
            </Text>
          </Box>
          <Box>
            <Text size="xs" c="dimmed" ta="right">
              COMPARED WITH
            </Text>

            <Text fw={600} ta="right" size="xl">
              {comparison.name}
            </Text>
          </Box>

          <Box>
            <Text size="xs" c="dimmed" ta="right">
              REPORT PERIOD
            </Text>

            <Text fw={600} ta="right" size="xl">
              {yearMin}–{yearMax}
            </Text>
          </Box>
        </Paper>
      </Grid.Col>
    );
  }

  function reportActionButtons() {
    return (
      <Group>
        <Button size="md" onClick={handleDownloadPdf} loading={isGenerating}>
          Download PDF
        </Button>
        <Button
          size="md"
          variant="light"
          color="red"
          onClick={() => {
            clearItems();
            clearExclusions();
            setPendingReset(true);
            openProfileModal();
          }}
        >
          Clear report
        </Button>
      </Group>
    );
  }

  function reportHeaderCard() {
    return (
      <Paper
        radius="xl"
        p={20}
        style={{
          background:
            'linear-gradient(135deg, #f8fafc 0%, #eef4ff 50%, #e7f5ff 100%)',
          border: '1px solid #dee2e6',
        }}
      >
        <Grid align="center">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="md">
              <Title
                order={1}
                style={{
                  fontSize: 'clamp(2rem, 4vw, 4rem)',
                  lineHeight: 1.1,
                }}
              >
                Working Report
              </Title>

              <Text size="lg" c="dimmed" maw={700}>
                Tailor your personalized report to your specific interests and
                needs.
              </Text>
              {reportActionButtons()}
              <Badge size="sm" color="white" c="dimmed">
                {`${includedPairs.length} of ${allPairs.length} charts included in report`}
              </Badge>
            </Stack>
          </Grid.Col>
          {reportSummary()}
        </Grid>
      </Paper>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {reportHeaderCard()}
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

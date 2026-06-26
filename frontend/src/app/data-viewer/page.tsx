'use client';

import {
  Badge,
  Box,
  Center,
  Container,
  Grid,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { createChartItem, createTableItem } from '@/utils/itemFactory';
import { ChartStack } from '@/components/Charts';
import { useProfile } from '@/components/profile/profileStore';
import { DataViewerSidebar } from '@/components/Sidebar/DataViewerSidebar'
import {
  useApplyFilters,
  buildFilters,
} from '@/components/FilterUI/useApplyFilters';
import { useEffect, useState } from 'react';
import { ChartDef, chartDefs } from '@/components/Charts/configs/ChartDefs';

function ViewerSummary({ 
  myLocation, 
  comparison, 
  yearMin, 
  yearMax 
}: { 
  myLocation: any; 
  comparison: any; 
  yearMin: number; 
  yearMax: number 
}) {
    return(
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Paper
          radius="xl"
          p="xl"
          withBorder
          shadow="sm"
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'white',
            height: '100%',
          }}
        >
          <Title order={3} ta="right" mb="xl">Summary</Title>
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

            <Text fw={600} ta="right" size='xl'>
              {comparison.name}
            </Text>
          </Box>

          <Box>
            <Text size="xs" c="dimmed" ta="right">
              REPORT PERIOD
            </Text>

            <Text fw={600} ta="right" size='xl'>
              {yearMin}–{yearMax}
            </Text>
          </Box>
        </Paper>
      </Grid.Col>
    )
  }

function ViewerHeader({
  myLocation, 
  comparison, 
  yearMin, 
  yearMax 
}: { 
  myLocation: any; 
  comparison: any; 
  yearMin: number; 
  yearMax: number 
}) {
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
                  Data Viewer
                </Title>

                <Text size="lg" c="dimmed" maw={700}>
                  Interactive charts and tables for exploring Vermont communities.
                </Text>
              </Stack>
            </Grid.Col>
              <ViewerSummary
                myLocation={myLocation}
                comparison={comparison}
                yearMin={yearMin}
                yearMax={yearMax}
              />
          </Grid>
        </Paper>
  );
  }

export default function DataViewerPage() {
  const { myLocation, comparison, interests, yearMin, yearMax } = useProfile();
  const [chartData, setChartData] = useState<
    Record<string, { data: any[]; metadata?: any; tableData?: any[] }>
  >({});
  const [compareChartData, setCompareChartData] = useState<
    Record<string, { data: any[]; metadata?: any; tableData?: any[] }>
  >({});
  const [compareTableData, setCompareTableData] = useState<
    Record<string, any[]>
  >({});

  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [focusMode, setFocusMode] = useState<'all' | 'focus'>('all');

  const applyFilters = useApplyFilters();
  const tableDefs = chartDefs.filter((c) =>
    c.subtype.startsWith('renderTable'),
  );
  const nonTableDefs = chartDefs.filter(
    (c) => !c.subtype.startsWith('renderTable'),
  );
  const sections = [...new Set(chartDefs.flatMap((c) => c.categories ?? []))]
  .map((category) => ({
    id: category.toLowerCase().replace(/\s+/g, '-'),
    label: category,
    count: chartDefs.filter((c) =>
      c.categories?.includes(category)
    ).length,
  }));


  useEffect(() => {
    nonTableDefs.forEach((chart: ChartDef) => {
      const url = chart.url;
      const filters = buildFilters(myLocation, {
        col: 'year',
        selected: [yearMin, yearMax],
      });
      const compFilters = buildFilters(comparison, {
        col: 'year',
        selected: [yearMin, yearMax],
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
      // Merge profile year range into extraParams, overriding any hardcoded defaults
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
      // Primary location fetch
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
      // Comparison location fetch
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
  }, [myLocation, comparison, yearMin, yearMax]);

  // QCEW employment data is county-level only; swap to a note card for town selections
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
        defId: chart.id,
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

  const allItems = [...charts, ...tableItems];
  
  let filteredItems = allItems;

  if (focusMode === 'focus' && interests.length > 0) {
    filteredItems = filteredItems.filter((c) =>
      c.categories?.some((cat) => interests.includes(cat)),
    );
  }

  if (selectedCategories.length > 0) {
    filteredItems = filteredItems.filter((c) =>
      c.categories?.some((cat) =>
        selectedCategories.includes(cat),
      ),
    );
  }

  if (search.trim()) {
    const q = search.toLowerCase();

    filteredItems = filteredItems.filter(
      (c) =>
        c.description?.toLowerCase().includes(q) ||
        c.categories?.some((cat) =>
          cat.toLowerCase().includes(q),
        ),
    );
  }

const visibleItems = filteredItems;

      return (
    <>
  <Container size="xl" pt="xl" mb="xl">
    <ViewerHeader
      myLocation={myLocation}
      comparison={comparison}
      yearMin={yearMin}
      yearMax={yearMax}
    />
  </Container>

  <Container size="xl">
    <Grid align="start">
      <Grid.Col span={{ base: 12, md: 3 }}>
        <div
          style={{
            position: 'sticky',
            top: 20,
          }}
        >
        <DataViewerSidebar
          sections={sections}
          focusMode={focusMode}
          setFocusMode={setFocusMode}
          search={search}
          onSearchChange={setSearch}
          selectedCategories={selectedCategories}
          onCategoriesChange={setSelectedCategories}
        />
        </div>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 9 }}>
        <ChartStack
          charts={visibleItems}
          action="add"
          userInterests={interests}
          defIds={visibleItems.map((c) => c.chartParams?.defId)}
        />
      </Grid.Col>
    </Grid>
  </Container>
</>
  );
}

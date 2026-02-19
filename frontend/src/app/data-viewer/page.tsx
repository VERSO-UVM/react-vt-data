'use client';

import { Center, Container, Group, SegmentedControl, Text, Title } from '@mantine/core';
import { createChartItem, createTableItem } from '@/utils/itemFactory';
import { ChartStack } from '@/components/Charts';
import { useProfile } from '@/components/profile/profileStore';
import {
  useApplyFilters,
  buildFilters,
} from '@/components/FilterUI/useApplyFilters';
import { useEffect, useState } from 'react';
import { ChartDef, chartDefs } from '@/components/Charts/configs/ChartDefs';

export default function DataViewerPage() {
  const { myLocation, comparison, interests, yearMin, yearMax } = useProfile();
  const [chartData, setChartData] = useState<
    Record<string, { data: any[]; metadata?: any; tableData?: any[] }>
  >({});
  const [compareChartData, setCompareChartData] = useState<
    Record<string, { data: any[]; metadata?: any; tableData?: any[] }>
  >({});
  const [focusMode, setFocusMode] = useState<'all' | 'focus'>('all');

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
      const filterKey = chart.filterKey;
      const dataKey = chart.dataKey;
      const filters = buildFilters(myLocation);
      const compFilters = buildFilters(comparison);

      applyFilters(
        url,
        filters,
        filterKey,
        dataKey,
        (data, metadata, tableData) =>
          setChartData((prev) => ({
            ...prev,
            [chart.id]: { data, metadata, tableData },
          })),
      );
      applyFilters(
        url,
        compFilters,
        filterKey,
        dataKey,
        (data, metadata, tableData) =>
          setCompareChartData((prev) => ({
            ...prev,
            [chart.id]: { data, metadata, tableData },
          })),
      );
    });
  }, [myLocation, comparison]);

  useEffect(() => {
    const seen = new Set<string>();
    tableDefs.forEach((def) => {
      // Merge profile year range into extraParams, overriding any hardcoded defaults
      const effectiveExtra = def.tableConfig?.extraParams
        ? { ...def.tableConfig.extraParams, year_min: yearMin, year_max: yearMax }
        : { year_min: yearMin, year_max: yearMax };
      const key = `${def.url}::${JSON.stringify(effectiveExtra)}`;
      if (seen.has(key)) return;
      seen.add(key);
      const siblings = tableDefs.filter((d) => {
        const extra = d.tableConfig?.extraParams
          ? { ...d.tableConfig.extraParams, year_min: yearMin, year_max: yearMax }
          : { year_min: yearMin, year_max: yearMax };
        return `${d.url}::${JSON.stringify(extra)}` === key;
      });
      applyFilters(
        def.url,
        {},
        undefined,
        undefined,
        (data) =>
          siblings.forEach((d) =>
            setChartData((prev) => ({ ...prev, [d.id]: { data } })),
          ),
        { name: myLocation.name, ...effectiveExtra },
      );
    });
  }, [myLocation, yearMin, yearMax]);

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
      notes: def.notes,
      subtype: def.subtype,
      trendChart: def.trendChart,
      categories: def.categories,
    }),
  );

  const allItems = [...charts, ...tableItems];
  const visibleItems =
    focusMode === 'focus' && interests.length > 0
      ? allItems.filter((c) =>
          c.categories?.some((cat) => interests.includes(cat)),
        )
      : allItems;

  return (
    <>
      <Center mb="md">
        <Title order={2}>Data Analysis</Title>
      </Center>
      {interests.length > 0 && (
        <Group
          mb="md"
          justify="flex-end"
          style={{
            position: 'sticky',
            top: 56,
            zIndex: 100,
            backgroundColor: 'var(--mantine-color-body)',
            paddingBlock: 8,
            paddingInline: 16,
          }}
        >
          <Text size="sm" c="dimmed">
            {interests.join(', ')}
          </Text>
          <SegmentedControl
            size="sm"
            value={focusMode}
            onChange={(v) => setFocusMode(v as 'all' | 'focus')}
            data={[
              { label: 'All charts', value: 'all' },
              { label: 'My focus', value: 'focus' },
            ]}
          />
        </Group>
      )}
      <Container size="xl">
        <ChartStack charts={visibleItems} action="add" userInterests={interests} />
      </Container>
    </>
  );
}

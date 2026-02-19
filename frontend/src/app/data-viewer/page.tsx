'use client';

import { Container, Group, SegmentedControl, Text } from '@mantine/core';
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
  const { myLocation, comparison, interests } = useProfile();
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
      const key = `${def.url}::${JSON.stringify(def.tableConfig?.extraParams)}`;
      if (seen.has(key)) return;
      seen.add(key);
      const siblings = tableDefs.filter(
        (d) =>
          `${d.url}::${JSON.stringify(d.tableConfig?.extraParams)}` === key,
      );
      applyFilters(
        def.url,
        {},
        undefined,
        undefined,
        (data) =>
          siblings.forEach((d) =>
            setChartData((prev) => ({ ...prev, [d.id]: { data } })),
          ),
        { name: myLocation.name, ...def.tableConfig?.extraParams },
      );
    });
  }, [myLocation]);

  const charts = nonTableDefs.map((chart) =>
    createChartItem({
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
    }),
  );

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
    <Container size="xl">
      {interests.length > 0 && (
        <Group mb="md" justify="flex-end">
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
      <ChartStack charts={visibleItems} action="add" userInterests={interests} />
    </Container>
  );
}

'use client';

import { Container } from '@mantine/core';
import { createChartItem } from '@/utils/itemFactory';
import { ChartStack } from '@/components/Charts';
import { useProfile } from '@/components/profile/profileStore';
import {
  useApplyFilters,
  buildFilters,
} from '@/components/FilterUI/useApplyFilters';
import { useEffect, useState } from 'react';
import { ChartDef, chartDefs } from '@/components/Charts/configs/ChartDefs';

export default function DataViewerPage() {
  const { myLocation, comparison } = useProfile();
  const [chartData, setChartData] = useState<
    Record<string, { data: any[]; metadata?: any; rawData?: any[] }>
  >({});
  const [compareChartData, setCompareChartData] = useState<
    Record<string, { data: any[]; metadata?: any; rawData?: any[] }>
  >({});
  const applyFilters = useApplyFilters();

  useEffect(() => {
    chartDefs.forEach((chart: ChartDef) => {
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
        (data, metadata, rawData) =>
          setChartData((prev) => ({
            ...prev,
            [chart.id]: { data, metadata, rawData },
          })),
      );
      applyFilters(
        url,
        compFilters,
        filterKey,
        dataKey,
        (data, metadata, rawData) =>
          setCompareChartData((prev) => ({
            ...prev,
            [chart.id]: { data, metadata, rawData },
          })),
      );
    });
  }, [myLocation, comparison]);

  const charts = chartDefs.map((chart) =>
    createChartItem({
      title: myLocation.name,
      xField: chart.xField,
      yField: chart.yField,
      data: chartData[chart.id]?.data || [],
      rawData: chartData[chart.id]?.rawData || [],

      metadata: chartData[chart.id]?.metadata || [],
      compareData: compareChartData[chart.id]?.data || [],
      compareRawData: compareChartData[chart.id]?.rawData || [],

      subtype: chart.subtype,
      chartParams: {
        ...chart.chartParams,
        legendLabels: [myLocation.name, comparison.name],
      },
      description: chart.title,
      notes: chart.notes,
    }),
  );

  return (
    <Container size="xl">
      <ChartStack charts={charts} action="add" />
    </Container>
  );
}

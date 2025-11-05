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
  const [chartData, setChartData] = useState<Record<string, any[]>>({});
  const [compareChartData, setCompareChartData] = useState<
    Record<string, any[]>
  >({});
  const applyFilters = useApplyFilters();

  useEffect(() => {
    chartDefs.forEach((chart: ChartDef) => {
      const url = chart.url;
      const filterkey = chart.filterkey;
      const filters = buildFilters(myLocation);
      const compFilters = buildFilters(comparison);

      applyFilters(url, filters, filterkey, (data) =>
        setChartData((prev) => ({ ...prev, [chart.id]: data })),
      );
      applyFilters(url, compFilters, filterkey, (data) =>
        setCompareChartData((prev) => ({ ...prev, [chart.id]: data })),
      );
    });
  }, [myLocation, comparison]);

  const title =
    myLocation.type === 'state'
      ? 'Vermont'
      : (myLocation[myLocation.type] ?? 'Unknown');

  const charts = chartDefs.map((chart) =>
    createChartItem({
      title,
      xField: chart.xField,
      yField: chart.yField,
      data: chartData[chart.id] || [],
      compareData: compareChartData[chart.id] || [],
      subtype: chart.subtype,
      chartParams: {
        ...chart.chartParams,
        legendLabels: [myLocation.name, comparison.name],
      },
      description: chart.title,
    }),
  );

  return (
    <Container size="xl">
      <ChartStack charts={charts} action="add" />
    </Container>
  );
}

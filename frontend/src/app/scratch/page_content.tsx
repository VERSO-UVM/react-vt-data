'use client';

import { Container, Stack, Paper } from '@mantine/core';
import FilterContainer from '@/components/FilterUI/Filter_wrap';
import { useFilter } from '@/components/FilterUI/FilterContext';
import { useState } from 'react';
import { createChartItem } from '@/utils/itemFactory';
import { DiffPerXBarChart } from '@/components/Charts/Bar';
import { useEffect } from 'react';
import { BASE_API_URL } from '@/config';
import { ChartCard } from '@/components/Charts';
import ResetButton from '@/components/reload';

export default function BasePage() {
  const [data, setData] = useState<any[]>([]);
  const [chartConfig, setChartConfig] = useState<any>(null);
  const { setFormat, selectedFilters, labels } = useFilter();

  useEffect(() => {
    setFormat('aggregated_acres'); // safe here
  }, [setFormat]);

  const handleData = (data: any) => {
    const activeFilters = Object.entries(selectedFilters)
      .map(([level, value]) => `${labels[Number(level)]}: ${value}`)
      .join(', ');

    const chartTitle = activeFilters
      ? `Zoning Acreage: (${activeFilters})`
      : 'Zoning Acreage';

    console.log('chart data', data);
    setChartConfig(
      createChartItem({
        title: chartTitle,
        xField: 'District Type',
        yField: 'Acres',
        data: data,
        subtype: 'DiffXBar',
        chartParams: { color: 'hex_color' },
      }),
    );
  };
  return (
    <Container size="xl" py="md">
      <ResetButton />
      <Stack>
        <Paper p="md" shadow="sm">
          <Stack>
            <FilterContainer
              apiURL={`${BASE_API_URL}/load/mapping/zoning/filters`}
              dataURL={`${BASE_API_URL}/load/mapping/zoning`}
              onData={(fetchedData) => {
                setData(fetchedData);
                handleData(fetchedData);
              }}
            />
          </Stack>
        </Paper>

        {chartConfig && (
          <ChartCard
            chart={chartConfig}
            ChartComponent={DiffPerXBarChart}
            action="add"
          />
        )}
      </Stack>
    </Container>
  );
}

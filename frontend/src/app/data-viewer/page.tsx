'use client';

import { Stack, Text, Card, Container, Box, Title } from '@mantine/core';
import { AddChart } from '@/components/Charts/saving';
import { createChartItem } from '@/utils/itemFactory';
import ChartStack from '@/components/Charts';

const data1: any[] = [
  { name: 'Page A', uv: 4000, pv: 2400, amt: 2400 },
  { name: 'Page B', uv: 3000, pv: 1398, amt: 2210 },
  { name: 'Page C', uv: 2000, pv: 9800, amt: 2290 },
  { name: 'Page D', uv: 2780, pv: 3908, amt: 2000 },
  { name: 'Page E', uv: 1890, pv: 4800, amt: 2181 },
  { name: 'Page F', uv: 2390, pv: 3800, amt: 2500 },
  { name: 'Page G', uv: 3490, pv: 4300, amt: 2100 },
];

const data2: any[] = [
  { name: 'Page A', uv: 1234, pv: 1110, amt: 2420 },
  { name: 'Page B', uv: 3100, pv: 1398, amt: 2410 },
  { name: 'Page C', uv: 2550, pv: 500, amt: 2590 },
  { name: 'Page D', uv: 2050, pv: 3908, amt: 2500 },
  { name: 'Page E', uv: 1120, pv: 4560, amt: 2381 },
  { name: 'Page F', uv: 2540, pv: 3800, amt: 2900 },
  { name: 'Page G', uv: 3350, pv: 4120, amt: 1100 },
];

const data3: any[] = [
  {
    name: 'Page A',
    uv: 4000,
    pv: 2400,
    amt: 2400,
  },
  {
    name: 'Page B',
    uv: 3000,
    pv: 1398,
    amt: 2210,
  },
  {
    name: 'Page C',
    uv: 2000,
    pv: 9800,
    amt: 2290,
  },
  {
    name: 'Page D',
    uv: 2780,
    pv: 3908,
    amt: 2000,
  },
  {
    name: 'Page E',
    uv: 1890,
    pv: 4800,
    amt: 2181,
  },
  {
    name: 'Page F',
    uv: 2390,
    pv: 3800,
    amt: 2500,
  },
  {
    name: 'Page G',
    uv: 3490,
    pv: 4300,
    amt: 2100,
  },
];

import windham_acreage from '@/Data/windham_acreage.json';

const chart = createChartItem({
  title: 'Simple Time Series',
  xField: 'name',
  yField: 'uv',
  data: data1,
  subtype: 'DualLine',
  chartParams: {
    datakey: 'pv',
  },
});

const chart2 = createChartItem({
  title: 'Simple Time Series 2',
  xField: 'name',
  yField: 'uv',
  data: data2,
  subtype: 'DualLine',
  chartParams: {
    datakey: 'pv',
  },
});

const chart3 = createChartItem({
  title: 'Simple Bar Chart ',
  xField: 'name',
  yField: '',
  data: data3,
  subtype: 'SameXBar',
  chartParams: {
    datakeys: [
      ['pv', '#8884d8'],
      ['uv', '#24b317ff'],
    ],
  },
});

const chart4 = createChartItem({
  title: 'Windham Acerage ',
  xField: 'District Type',
  yField: 'Acres',
  data: windham_acreage,
  subtype: 'DiffXBar',
  chartParams: {
    color: 'hex_color',
  },
});

const charts = [chart, chart2, chart3, chart4];

export default function DataViewerPage() {
  return (
    <Container size="xl">
      <ChartStack charts={charts} action="add" />
    </Container>
  );
}

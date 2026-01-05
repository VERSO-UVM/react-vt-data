import React from 'react';

// recharts
import {
  BarChart,
  Bar,
  Rectangle,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import * as d3 from 'd3';

// chartjs
import { Bar as BarJS } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as TooltipJS,
  Legend as LegendJS,
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, TooltipJS, LegendJS);

import { ChartItem } from '@/types/cachedCharts';

const SamePerXBarChart = <TData,>({ chart }: { chart: ChartItem<TData> }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        width={500}
        height={300}
        data={chart.data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={chart.xField} />
        <YAxis />
        <Tooltip />
        <Legend />
        {chart.chartParams.datakeys.map(([datakey, color]) => (
          <Bar key={datakey} dataKey={datakey} fill={color} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

const DiffPerXBarChart = <TData,>({ chart }: { chart: ChartItem<TData> }) => {
  const labels = chart.data.map((entry: any) => entry[chart.xField]);
  const colors = chart.data.map((entry: any) => entry[chart.chartParams.color]);

  const data = {
    labels,
    datasets: [
      {
        label: chart.yField,
        data: chart.data.map((entry: any) => entry[chart.yField]),
        backgroundColor: colors,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // hide default legend
      },
      tooltip: {
        enabled: true,
      },
    },
  };

  return <BarJS data={data} options={options} />;
};
interface CompareDiffChartItem<TData> extends ChartItem<TData> {
  compareData: TData[];
  chartParams: {
    color?: string;
    legendLabels?: [string, string];
    colorScheme?: string;
  };
}

const CompareDiffPerXBarChart = <TData,>({
  chart,
}: {
  chart: CompareDiffChartItem<TData>;
}) => {
  const labels = chart.data.map((entry: any) => entry[chart.xField]);

  let colors: string[];
  if (chart.chartParams?.color && chart.data[0]?.[chart.chartParams.color]) {
    // 1. Use per-entry colors from data (zoning case)
    colors = chart.data.map((entry: any) => entry[chart.chartParams.color]);
  } else {
    // 2. Use d3 color scale
    const schemeName = chart.chartParams?.colorScheme || 'schemeCategory10';
    const colorScale = d3.scaleOrdinal((d3 as any)[schemeName]);
    console.log('Using scheme:', schemeName);
    console.log('Scheme exists?', (d3 as any)[schemeName]);
    colors = chart.data.map((_, index) => colorScale(index.toString()));
  }
  const compareColors = chart.compareData.map(() => '#999');

  const legendLabels = chart.chartParams.legendLabels || [
    chart.yField,
    `${chart.yField} (compare)`,
  ];

  const data = {
    labels,
    datasets: [
      {
        label: legendLabels[0],
        data: chart.data.map((entry: any) => entry[chart.yField]),
        backgroundColor: colors,
      },
      {
        label: legendLabels[1],
        data: chart.compareData.map((entry: any) => entry[chart.yField]),
        backgroundColor: compareColors,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
  };

  return <BarJS data={data} options={options} />;
};

export { SamePerXBarChart, DiffPerXBarChart, CompareDiffPerXBarChart };

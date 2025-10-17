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

//
import { schemePastel2 } from 'd3-scale-chromatic';
import { scaleOrdinal } from 'd3-scale';
const colorScale = scaleOrdinal(schemePastel2);

import { ChartItem } from '@/types/cachedCharts';

interface BarChartProps<TData> {
  chart: ChartItem<TData>;
}

const SamePerXBarChart = <TData,>({ chart }: { chart: any }) => {
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

const DiffPerXBarChart = <TData,>({ chart }: { chart: any }) => {
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

export { SamePerXBarChart, DiffPerXBarChart };

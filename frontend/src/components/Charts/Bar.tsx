import React from 'react';

// recharts
import {
  BarChart,
  Bar,
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
import { usePdfMode } from '@/contexts/PdfModeContext';

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
        {chart.chartParams?.datakeys.map(
          ([datakey, color]: [string, string]) => (
            <Bar key={datakey} dataKey={datakey} fill={color} />
          ),
        )}
      </BarChart>
    </ResponsiveContainer>
  );
};

// ---------------------------------------------------------------------------
// DiffPerXBarChart — single dataset, per-bar colors from data
// ---------------------------------------------------------------------------

/** SVG (Recharts) version used when rendering to PDF. */
const DiffPerXBarChartSVG = <TData,>({
  chart,
}: {
  chart: ChartItem<TData>;
}) => {
  const colors = chart.data.map((entry: any) => entry[chart.chartParams!.color]);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chart.data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={chart.xField} />
        <YAxis />
        <Tooltip />
        <Bar dataKey={chart.yField}>
          {chart.data.map((_: any, index: number) => (
            <Cell key={index} fill={colors[index]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const DiffPerXBarChart = <TData,>({ chart }: { chart: ChartItem<TData> }) => {
  const isPdfMode = usePdfMode();
  if (isPdfMode) return <DiffPerXBarChartSVG chart={chart} />;

  const labels = chart.data.map((entry: any) => entry[chart.xField]);
  const colors = chart.data.map((entry: any) => entry[chart.chartParams!.color]);

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
      legend: { display: false },
      tooltip: { enabled: true },
    },
  };

  return <BarJS data={data} options={options} />;
};

// ---------------------------------------------------------------------------
// CompareDiffPerXBarChart — two datasets, primary with per-bar colors
// ---------------------------------------------------------------------------

interface CompareDiffChartItem<TData> extends ChartItem<TData> {
  compareData: TData[];
  chartParams: {
    color?: string;
    legendLabels?: [string, string];
    colorScheme?: string;
  };
}

/** SVG (Recharts) version used when rendering to PDF. */
const CompareDiffPerXBarChartSVG = <TData,>({
  chart,
}: {
  chart: CompareDiffChartItem<TData>;
}) => {
  const legendLabels = chart.chartParams.legendLabels ?? [
    chart.yField,
    `${chart.yField} (compare)`,
  ];

  // Determine per-bar primary colors (same logic as Chart.js version)
  let colors: string[];
  if (
    chart.chartParams?.color &&
    (chart.data[0] as any)?.[chart.chartParams.color]
  ) {
    colors = chart.data.map((entry: any) => entry[chart.chartParams.color!]);
  } else {
    const schemeName = chart.chartParams?.colorScheme ?? 'schemeCategory10';
    const colorScale = d3.scaleOrdinal<string, string>((d3 as any)[schemeName]);
    colors = chart.data.map((_: any, i: number) => colorScale(i.toString()));
  }

  // Merge primary + compare into one array for grouped bars
  const merged = chart.data.map((entry: any, i: number) => ({
    [chart.xField]: entry[chart.xField],
    primary: entry[chart.yField],
    compare: (chart.compareData?.[i] as any)?.[chart.yField] ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={merged}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={chart.xField} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="primary" name={legendLabels[0]}>
          {merged.map((_: any, i: number) => (
            <Cell key={i} fill={colors[i]} />
          ))}
        </Bar>
        <Bar dataKey="compare" name={legendLabels[1]} fill="#999" />
      </BarChart>
    </ResponsiveContainer>
  );
};

const CompareDiffPerXBarChart = <TData,>({
  chart,
}: {
  chart: CompareDiffChartItem<TData>;
}) => {
  const isPdfMode = usePdfMode();
  if (isPdfMode) return <CompareDiffPerXBarChartSVG chart={chart} />;

  const labels = chart.data.map((entry: any) => entry[chart.xField]);

  let colors: string[];
  if (
    chart.chartParams?.color &&
    (chart.data[0] as any)?.[chart.chartParams.color]
  ) {
    colors = chart.data.map((entry: any) => entry[chart.chartParams.color!]);
  } else {
    const schemeName = chart.chartParams?.colorScheme || 'schemeCategory10';
    const colorScale = d3.scaleOrdinal<string, string>((d3 as any)[schemeName]);
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

// ---------------------------------------------------------------------------
// CompareHBarChart — horizontal grouped bars
// ---------------------------------------------------------------------------

/**
 * Horizontal grouped bar chart for head-to-head location comparison.
 * data entries:        [{ [xField]: variableName, [yField]: primaryValue }]
 * compareData entries: [{ [xField]: variableName, [yField]: compareValue }]
 * chartParams.unit:    optional suffix appended to tooltip values (e.g. '%')
 *
 * Extensible to multiple variables: just add more entries to both arrays.
 */

/** SVG (Recharts) version used when rendering to PDF. */
const CompareHBarChartSVG = <TData,>({
  chart,
}: {
  chart: CompareDiffChartItem<TData>;
}) => {
  const legendLabels = chart.chartParams?.legendLabels ?? [
    'Primary',
    'Comparison',
  ];
  const unit = (chart.chartParams as any)?.unit ?? '';

  const merged = chart.data.map((entry: any, i: number) => ({
    name: entry[chart.xField],
    [legendLabels[0]]: entry[chart.yField],
    [legendLabels[1]]: (chart.compareData?.[i] as any)?.[chart.yField] ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={merged}
        layout="vertical"
        margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={(v: any) => `${v}${unit}`} />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fontSize: 11 }}
        />
        <Tooltip formatter={(v: any) => `${v}${unit}`} />
        <Legend />
        <Bar dataKey={legendLabels[0]} fill="#154734" />
        <Bar dataKey={legendLabels[1]} fill="#8899aa" />
      </BarChart>
    </ResponsiveContainer>
  );
};

const CompareHBarChart = <TData,>({
  chart,
}: {
  chart: CompareDiffChartItem<TData>;
}) => {
  const isPdfMode = usePdfMode();
  if (isPdfMode) return <CompareHBarChartSVG chart={chart} />;

  const labels = chart.data.map((entry: any) => entry[chart.xField]);
  const legendLabels = chart.chartParams?.legendLabels || [
    'Primary',
    'Comparison',
  ];
  const unit = (chart.chartParams as any)?.unit ?? '';

  const data = {
    labels,
    datasets: [
      {
        label: legendLabels[0],
        data: chart.data.map((entry: any) => entry[chart.yField]),
        backgroundColor: '#154734',
      },
      {
        label: legendLabels[1] ?? 'Comparison',
        data: (chart.compareData ?? []).map(
          (entry: any) => entry[chart.yField],
        ),
        backgroundColor: '#8899aa',
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw}${unit}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          callback: (value: any) => `${value}${unit}`,
        },
      },
    },
  };

  return <BarJS data={data} options={options} />;
};

export {
  SamePerXBarChart,
  DiffPerXBarChart,
  CompareDiffPerXBarChart,
  CompareHBarChart,
};

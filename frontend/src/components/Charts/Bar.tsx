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
  TooltipItem,
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, TooltipJS, LegendJS);

import { ChartItem, DataRow } from '@/types/cachedCharts';
import { usePdfMode } from '@/contexts/PdfModeContext';

// d3 color schemes looked up by name (e.g. 'schemeCategory10')
const d3Schemes = d3 as unknown as Record<string, readonly string[]>;

const SamePerXBarChart = ({ chart }: { chart: ChartItem<DataRow> }) => {
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
        {chart.chartParams?.datakeys?.map(([datakey, color]) => (
          <Bar key={datakey} dataKey={datakey} fill={color} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

// ---------------------------------------------------------------------------
// DiffPerXBarChart — single dataset, per-bar colors from data
// ---------------------------------------------------------------------------

/** SVG (Recharts) version used when rendering to PDF. */
const DiffPerXBarChartSVG = ({ chart }: { chart: ChartItem<DataRow> }) => {
  const colors = chart.data.map(
    (entry) => entry[chart.chartParams!.color!] as string,
  );
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
          {chart.data.map((_, index) => (
            <Cell key={index} fill={colors[index]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const DiffPerXBarChart = ({ chart }: { chart: ChartItem<DataRow> }) => {
  const isPdfMode = usePdfMode();
  if (isPdfMode) return <DiffPerXBarChartSVG chart={chart} />;

  const labels = chart.data.map((entry) => entry[chart.xField]);
  const colors = chart.data.map(
    (entry) => entry[chart.chartParams!.color!] as string,
  );

  const data = {
    labels,
    datasets: [
      {
        label: chart.yField,
        data: chart.data.map((entry) => entry[chart.yField] as number),
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

interface CompareDiffChartItem extends ChartItem<DataRow> {
  compareData: DataRow[];
  chartParams: {
    color?: string;
    legendLabels?: [string, string];
    colorScheme?: string;
    unit?: string;
  };
}

/** SVG (Recharts) version used when rendering to PDF. */
const CompareDiffPerXBarChartSVG = ({
  chart,
}: {
  chart: CompareDiffChartItem;
}) => {
  const legendLabels = chart.chartParams.legendLabels ?? [
    chart.yField,
    `${chart.yField} (compare)`,
  ];

  // Determine per-bar primary colors (same logic as Chart.js version)
  let colors: string[];
  if (chart.chartParams?.color && chart.data[0]?.[chart.chartParams.color]) {
    colors = chart.data.map(
      (entry) => entry[chart.chartParams.color!] as string,
    );
  } else {
    const schemeName = chart.chartParams?.colorScheme ?? 'schemeCategory10';
    const colorScale = d3.scaleOrdinal<string, string>(d3Schemes[schemeName]);
    colors = chart.data.map((_, i) => colorScale(i.toString()));
  }

  // Merge primary + compare into one array for grouped bars
  const merged = chart.data.map((entry, i) => ({
    [chart.xField]: entry[chart.xField],
    primary: entry[chart.yField],
    compare: chart.compareData?.[i]?.[chart.yField] ?? null,
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
          {merged.map((_, i) => (
            <Cell key={i} fill={colors[i]} />
          ))}
        </Bar>
        <Bar dataKey="compare" name={legendLabels[1]} fill="#999" />
      </BarChart>
    </ResponsiveContainer>
  );
};

const CompareDiffPerXBarChart = ({
  chart,
}: {
  chart: CompareDiffChartItem;
}) => {
  const isPdfMode = usePdfMode();
  if (isPdfMode) return <CompareDiffPerXBarChartSVG chart={chart} />;

  const labels = chart.data.map((entry) => entry[chart.xField]);

  let colors: string[];
  if (chart.chartParams?.color && chart.data[0]?.[chart.chartParams.color]) {
    colors = chart.data.map(
      (entry) => entry[chart.chartParams.color!] as string,
    );
  } else {
    const schemeName = chart.chartParams?.colorScheme || 'schemeCategory10';
    const colorScale = d3.scaleOrdinal<string, string>(d3Schemes[schemeName]);
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
        data: chart.data.map((entry) => entry[chart.yField] as number),
        backgroundColor: colors,
      },
      {
        label: legendLabels[1],
        data: chart.compareData.map((entry) => entry[chart.yField] as number),
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
const CompareHBarChartSVG = ({ chart }: { chart: CompareDiffChartItem }) => {
  const legendLabels = chart.chartParams?.legendLabels ?? [
    'Primary',
    'Comparison',
  ];
  const unit = chart.chartParams?.unit ?? '';

  const merged = chart.data.map((entry, i) => ({
    name: entry[chart.xField],
    [legendLabels[0]]: entry[chart.yField],
    [legendLabels[1]]: chart.compareData?.[i]?.[chart.yField] ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={merged}
        layout="vertical"
        margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={(v) => `${v}${unit}`} />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fontSize: 11 }}
        />
        <Tooltip formatter={(v) => `${v}${unit}`} />
        <Legend />
        <Bar dataKey={legendLabels[0]} fill="#154734" />
        <Bar dataKey={legendLabels[1]} fill="#8899aa" />
      </BarChart>
    </ResponsiveContainer>
  );
};

const CompareHBarChart = ({ chart }: { chart: CompareDiffChartItem }) => {
  const isPdfMode = usePdfMode();
  if (isPdfMode) return <CompareHBarChartSVG chart={chart} />;

  const labels = chart.data.map((entry) => entry[chart.xField]);
  const legendLabels = chart.chartParams?.legendLabels || [
    'Primary',
    'Comparison',
  ];
  const unit = chart.chartParams?.unit ?? '';

  const data = {
    labels,
    datasets: [
      {
        label: legendLabels[0],
        data: chart.data.map((entry) => entry[chart.yField] as number),
        backgroundColor: '#154734',
      },
      {
        label: legendLabels[1] ?? 'Comparison',
        data: (chart.compareData ?? []).map(
          (entry) => entry[chart.yField] as number,
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
          label: (ctx: TooltipItem<'bar'>) =>
            `${ctx.dataset.label}: ${ctx.raw}${unit}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          callback: (value: number | string) => `${value}${unit}`,
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

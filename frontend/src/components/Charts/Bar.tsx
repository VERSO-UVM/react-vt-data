import { useMemo } from 'react';

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
  const colors = chart.data.map(
    (entry: any) => entry[chart.chartParams!.color],
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
  const colors = chart.data.map(
    (entry: any) => entry[chart.chartParams!.color],
  );

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
    fixedYear?: number;
    percentFormat?: boolean;
    includeCategories?: string[];
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

  const includeCategories = chart.chartParams?.includeCategories;
  const filteredData = includeCategories
    ? chart.data.filter((entry: any) =>
        includeCategories.includes(entry[chart.xField])
      )
    : chart.data;

  const filteredCompareData = includeCategories
    ? chart.compareData.filter((entry: any) =>
        includeCategories.includes(entry[chart.xField])
      )
    : chart.compareData;
  
  const labels = filteredData.map((entry: any) => entry[chart.xField]);

  let colors: string[];
  if (
    chart.chartParams?.color &&
    (chart.data[0] as any)?.[chart.chartParams.color]
  ) {
      colors = filteredData.map((entry: any) => entry[chart.chartParams.color!]);
  } else {
    const schemeName = chart.chartParams?.colorScheme || 'schemeTableau10';
    const colorScale = d3.scaleOrdinal<string, string>((d3 as any)[schemeName]);
    colors = filteredData.map((_, index) => colorScale(index.toString()));
  }
  const compareColors = filteredCompareData.map(() => '#D3D3D3'); 

  const legendLabels = chart.chartParams.legendLabels || [
    chart.yField,
    `${chart.yField} (compare)`,
  ];
  const data = {
    labels,
    datasets: [
      {
        label: legendLabels[0],
        data: filteredData.map((entry: any) => entry[chart.yField]),
        backgroundColor: colors,
      },
      {
        label: legendLabels[1],
        data: filteredCompareData.map((entry: any) => entry[chart.yField]),
        backgroundColor: compareColors,
      },
    ],
  };

  const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const value = context.parsed.y;
          return chart.chartParams?.percentFormat ?? false ? `${value}%` : value.toLocaleString();
        },
      },
    },
  },
  scales: {
    y: {
      ticks: {
        callback: (value: any) =>
          chart.chartParams?.percentFormat ?? false ? `${value}%` : value.toLocaleString(),
      },
    },
  },
};

  return <BarJS data={data} options={options} />;
};


type AllowanceRow = {
  use_type: string;
  val: string;
  Acres: number;
};

const VAL_GROUPS: Record<string, string> = {
  True: "Allowed",
  False: "Prohibited",
  "Public Hearing": "May be Allowed",
  "Allowed/Conditional": "May be Allowed",
  Overlay: "May be Allowed",
  "Not Mentioned": "Not Mentioned",
};

const VAL_GROUP_COLORS: Record<string, string> = {
  Allowed: "#274c77",
  "May be Allowed": "#6096ba",
  Prohibited: "#e07a5f",
  "Not Mentioned": "#c8d3d5",
};

const USE_TYPE_ORDER = [
    "1 Family",
    "2 Family",
    "3 Family",
    "4 Family",
    // "Acessory Dwelling Unit", // NOTE: matches the typo in the source data ("Acessory")
    // "Planned Unit Development",
    // "Planned Residential Development",
  ];

  const INCLUDED_USE_TYPES = new Set([
    "1_Family",
    "2_Family",
    "3_Family",
    "4_Family",
  ]);

  const sortUseTypes = (types: string[]) => {
    return [...types].sort((a, b) => {
      const ai = USE_TYPE_ORDER.indexOf(a);
      const bi = USE_TYPE_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  };

const groupVal = (val: string) => VAL_GROUPS[val] ?? val;
const VAL_ORDER = ["Allowed", "May be Allowed", "Prohibited", "Not Mentioned"];

const cleanUseType = (useType: string) => useType.replace(/_/g, " ");

const ZoningAllowanceStackedBarChart = <TData,>({
  chart,
}: {
  chart: CompareDiffChartItem<TData>;
}) => {
  // const isPdfMode = usePdfMode();
  // if (isPdfMode) return <ZoningAllowanceStackedBarChartSVG chart={chart} />;

  const mainRows = ((chart.data || []) as AllowanceRow[]).filter((r) =>
    INCLUDED_USE_TYPES.has(r.use_type)
  );

const compareRows = ((chart.compareData || []) as AllowanceRow[]).filter((r) =>
    INCLUDED_USE_TYPES.has(r.use_type)
  );

  // ----------------------------
  // Pivot long → wide, grouping vals and cleaning use_type labels
  // ----------------------------
  type PivotRow = { use_type: string } & Record<string, number | string>;
  const pivot = (rows: AllowanceRow[]): Record<string, PivotRow> => {
    const map: Record<string, PivotRow> = {};

    for (const r of rows) {
      const useType = cleanUseType(r.use_type);
      const group = groupVal(r.val);

      if (!map[useType]) {
        map[useType] = { use_type: useType };
      }
      map[useType][group] = ((map[useType][group] as number) || 0) + (Number(r.Acres) || 0);
    }

    return map;
  };

  const main = useMemo(() => pivot(mainRows), [mainRows]);
  const compare = useMemo(() => pivot(compareRows), [compareRows]);

  const labels = useMemo(
    () => sortUseTypes(Array.from(new Set([...Object.keys(main), ...Object.keys(compare)]))),
    [main, compare]
  );

  const stackKeys = VAL_ORDER;


  const colorForGroup = (group: string) =>
    VAL_GROUP_COLORS[group] ?? "#999999";

  const mutedColor = (hex: string) => {
    const { r, g, b } = d3.rgb(hex);
    return `rgba(${r}, ${g}, ${b}, 0.45)`;
  };
  
  
  const datasets = useMemo(
    () => [
      ...stackKeys.map((key) => ({
        label: `${key} (Current)`,
        data: labels.map((l) => main[l]?.[key] || 0),
        stack: "main",
        backgroundColor: colorForGroup(key),
      })),

      ...stackKeys.map((key) => ({
        label: `${key} (Compare)`,
        data: labels.map((l) => compare[l]?.[key] || 0),
        stack: "compare",
        backgroundColor: mutedColor(colorForGroup(key)),
        borderColor: colorForGroup(key),
        borderWidth: 1,
      })),
    ],
    [stackKeys, labels, main, compare, colorForGroup]
  );

  const data = { labels, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          generateLabels: (chart: any) =>
            stackKeys.map((key) => {
              const mainIndex = chart.data.datasets.findIndex(
                (ds: any) => ds.label === `${key} (Current)`
              );
              const compareIndex = chart.data.datasets.findIndex(
                (ds: any) => ds.label === `${key} (Compare)`
              );

              const mainMeta = chart.getDatasetMeta(mainIndex);
              const compareMeta = chart.getDatasetMeta(compareIndex);

              const hidden =
                (mainMeta.hidden ?? chart.data.datasets[mainIndex].hidden) &&
                (compareMeta.hidden ?? chart.data.datasets[compareIndex].hidden);

              return {
                text: key,
                fillStyle: colorForGroup(key),
                strokeStyle: colorForGroup(key),
                lineWidth: 1,
                hidden,
                datasetIndex: mainIndex,
              };
            }),
        },
        onClick: (_e: any, legendItem: any, legend: any) => {
          const chart = legend.chart;
          const key = legendItem.text;

          chart.data.datasets.forEach((ds: any, idx: number) => {
            if (ds.label?.startsWith(key)) {
              const meta = chart.getDatasetMeta(idx);
              meta.hidden = !(meta.hidden ?? false);
            }
          });

          chart.update();
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) =>
            `${ctx.dataset.label}: ${ctx.raw?.toLocaleString?.() ?? ctx.raw}`,
        },
      },
    },
    scales: {
      x: { stacked: true},
      y: { stacked: true },
    },
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
  ZoningAllowanceStackedBarChart
};

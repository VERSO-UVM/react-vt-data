'use client';

import { useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, 
         Tooltip, XAxis, YAxis } from 'recharts';
import { ChartItem } from '@/types/cachedCharts';
import { Text } from '@mantine/core';

/** Small label shown above the chart when comparison data is present. */
const CompareNote = ({ name }: { name: string }) => (  
  <Text size="xs" c="dimmed" mb={4}>
    <span style={{ letterSpacing: 2, marginRight: 6 }}>– – –</span>
    Dashed Lines = {name}
  </Text>
);

// ---------------------------------------------------------------------------
// Demographics: Under 18 vs 65+
// ---------------------------------------------------------------------------

export const DemographicsTrendChart = <TData,>({chart}: {chart: ChartItem<TData>;}) => {
  
  const AGE_SERIES = [
    { key: 'Under 18', color: '#154734' },
    { key: '65+', color: '#1c7ed6' },
  ];
  
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggleSeries = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  if (!data || data.length === 0) return null;

  const years = Array.from(new Set(data.map((r) => r.year))).sort();
    
  const labels = chart.chartParams?.legendLabels as
    | [string, string]
    | undefined;
  

  const buildPoint = (rows: any[], year: number) => {
    const find = (label: string) =>
      rows.find((r) => r.year === year && r.Variable === label)?.Percent ??
      null;
    const p65_74 = find('65 to 74') ?? 0;
    const p75plus = find('75 Plus') ?? 0;
    return {
      'Under 18': find('Under 18'),
      '65+':p65_74 + p75plus > 0 ? Math.round((p65_74 + p75plus) * 10) / 10 : null,
    };
  };

  const plotData = years.map((year) => ({
    year,
    ...buildPoint(data, year),
    ...(compareData.length > 0
      ? {
          'Under 18 (cmp)': buildPoint(compareData, year)['Under 18'],
          '65+ (cmp)': buildPoint(compareData, year)['65+'],
        }
      : {}),
  }));

  return (
    <>
      {compareData.length > 0 && <CompareNote name={labels?.[1] ?? 'Comparison'} />}
      <Text size="xs" c="dimmed" mb={4}>
        Click legend items to show or hide age groups.
      </Text>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={plotData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis unit="%" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
          <Tooltip formatter={(val: any) => (val != null ? `${val}%` : '—')} />
          <Legend align="right" verticalAlign="bottom"
                  onClick={(e: any) => toggleSeries(e.dataKey)} formatter={(value) => (
            <span style={{ color: hidden.has(value) ? "#999" : "#222",
                          textDecoration: hidden.has(value) ? "line-through" : "none"}}>
              {value}
            </span>)}/>
          {AGE_SERIES.map((s) => (
            <Line 
              key={s.key} 
              dataKey={s.key} 
              name={`${s.key} (${labels?.[0] ?? 'Main'})`}
              stroke={s.color} 
              strokeWidth={2}
              dot={false} 
              hide={hidden.has(s.key)}
            />))}
            {compareData.length > 0 && AGE_SERIES.map((s) => (
            <Line
              key={`${s.key}-cmp`} 
              dataKey={`${s.key} (cmp)`}
              name={`${s.key} (${labels?.[1] ?? 'Comparison'})`}
              stroke={s.color}
              strokeWidth={2} 
              strokeDasharray="6 4" 
              legendType="none" 
              dot={false} 
              hide={hidden.has(s.key)}
            />))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};

// Historic Population
export const PopulationTrendChart = <TData,>({chart}: {chart: ChartItem<TData>;}) => {
  
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggleSeries = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];

  const years = Array.from(
    new Set([
      ...data.map((d) => Number(d.year)),
      ...compareData.map((d) => Number(d.year)),
    ])
  ).sort((a, b) => a - b);

  const labels = chart.chartParams?.legendLabels as | [string, string] | undefined; 

  const plotData = years.map((year) => ({
    year,
    Population:
      data.find((d) => Number(d.year) === year)?.Population ?? null,
    "Population (cmp)":
      compareData.find((d) => Number(d.year) === year)?.Population ?? null,
  }));

  return (
    <>
      <Text size="xs" c="dimmed" mb={4}>
        Click legend items to show or hide locations.
      </Text>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={plotData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} 
            tickFormatter={(value) => value.toLocaleString()}/>
          <Tooltip formatter={(value: number) => value.toLocaleString()}/>
          <Legend align="right" verticalAlign="bottom" 
                  onClick={(e: any) => toggleSeries(e.dataKey)} formatter={(value) => (
            <span style={{ color: hidden.has(value) ? "#999" : "#222",
                          textDecoration: hidden.has(value) ? "line-through" : "none"}}>
              {value}
            </span>
          )} />
          <Line
            type="monotone"
            dataKey="Population"
            name={`${labels?.[0] ?? 'Main'}`}
            stroke="#154734"
            strokeWidth={3}
            dot={false}
            hide={hidden.has('Population')}
          />
          {compareData.length > 0 && (
            <>
              <Line
                type="monotone"
                dataKey="Population (cmp)"
                name={`${labels?.[1] ?? 'Comparison'}`}
                stroke="#1c7ed6"
                strokeWidth={3}
                dot={false}
                hide={hidden.has('Population (cmp)')}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};




// ---------------------------------------------------------------------------
// Demographics: Median Age Chart
// ---------------------------------------------------------------------------
export const MedianAgeTrendChart = <TData,>({chart,}: {chart: ChartItem<TData>;}) => {
  
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggleSeries = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  if (!data || data.length === 0) return null;

  const years = Array.from(new Set(data.map((r) => r.year))).sort();
  const labels = chart.chartParams?.legendLabels as
    | [string, string]
    | undefined;

  const buildPoint = (rows: any[], year: number) => {
    const find = (label: string) =>
      rows.find((r) => r.year === year && r.Variable === label)?.Value ?? null;
    return { 'Median Age': find('Median Age') };
  };

  const plotData = years.map((year) => ({
    year,
    ...buildPoint(data, year),
    ...(compareData.length > 0
      ? {
          'Median Age (cmp)': buildPoint(compareData, year)['Median Age'],
        }
      : {}),
  }));

  return (
    <>
      <Text size="xs" c="dimmed" mb={4}>
        Click legend items to show or hide locations.
      </Text>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={plotData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            domain={['auto', 'auto']}
            tickFormatter={(value) => Number(value).toFixed(0)}
          />
          <Tooltip
            formatter={(val: any) =>
              val != null ? `${Number(val).toFixed(1)} years` : '—'
            }
          />
          <Legend align="right" verticalAlign="bottom" 
                  onClick={(e: any) => toggleSeries(e.dataKey)} formatter={(value) => (
            <span style={{ color: hidden.has(value) ? "#999" : "#222",
                          textDecoration: hidden.has(value) ? "line-through" : "none"}}>
              {value}
            </span>
          )} />
          <Line
            type="monotone"
            dataKey="Median Age"
            name={`${labels?.[0] ?? 'Main'}`} 
            stroke="#154734"
            strokeWidth={3}
            dot={false}
            hide={hidden.has('Median Age')}
          />
          {compareData.length > 0 && (
            <>
              <Line
                type="monotone"
                dataKey="Median Age (cmp)"
                name={`${labels?.[1] ?? 'Comparison'}`}
                stroke="#1c7ed6"
                strokeWidth={3}
                dot={false}
                hide={hidden.has('Median Age (cmp)')}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};

// ---------------------------------------------------------------------------
// Education: all attainment levels except "Some College, No Degree"
// ---------------------------------------------------------------------------
export const EducationTrendChart = <TData,>({
  chart,
}: {
  chart: ChartItem<TData>;
}) => {

  const EDU_SERIES = [
    { key: 'No High School Diploma', color: '#d62828' },
    { key: 'High School Graduate', color: '#f77f00' },
    { key: "Associate's Degree", color: '#fcbf49' },
    { key: "Bachelor's Degree", color: '#003049' },
    { key: 'Postgraduate Degree', color: '#457b9d' },
  ];
    
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggleSeries = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
    
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  if (!data || data.length === 0) return null;

  const keys = new Set(EDU_SERIES.map((s) => s.key));
  const filtered = data.filter((r) => keys.has(r.Variable));
  const cmpFiltered = compareData.filter((r) => keys.has(r.Variable));
  const years = Array.from(new Set(filtered.map((r) => r.year))).sort();
  const labels = chart.chartParams?.legendLabels as
    | [string, string]
    | undefined;

  const plotData = years.map((year) => {
    const rows = filtered.filter((r) => r.year === year);
    const cmpRows = cmpFiltered.filter((r) => r.year === year);
    const pt: Record<string, any> = { year };
    for (const { key } of EDU_SERIES) {
      pt[key] = rows.find((r) => r.Variable === key)?.Percent ?? null;
      if (compareData.length > 0) {
        pt[`${key} (${labels?.[1] ?? 'Comparison'})`] =
          cmpRows.find((r) => r.Variable === key)?.Percent ?? null;
      }
    }
    return pt;
  });

  return (
    <>
      {compareData.length > 0 && <CompareNote name={labels?.[1] ?? 'Comparison'} />}
      <Text size="xs" c="dimmed" mb={4}>
        Click legend items to show or hide education categories.
      </Text>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={plotData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis unit="%" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
          <Tooltip formatter={(val: any) => (val != null ? `${val}%` : '—')} />
          <Legend onClick={(e: any) => toggleSeries(e.dataKey)} formatter={(value) => (
            <span style={{ color: hidden.has(value) ? "#999" : "#222",
                          textDecoration: hidden.has(value) ? "line-through" : "none"}}>
              {value} 
            </span>)}/>
          {EDU_SERIES.map((s) => (
          <Line 
            key={s.key} 
            dataKey={s.key} 
            stroke={s.color} 
            strokeWidth={2}
            dot={false} 
            hide={hidden.has(s.key)}
          />))}
          {compareData.length > 0 && EDU_SERIES.map((s) => (
          <Line
            key={`${s.key}-cmp`} 
            dataKey={`${s.key} (${labels?.[1] ?? 'Comparison'})`} 
            stroke={s.color}
            strokeWidth={1.5} 
            strokeDasharray="6 4" 
            legendType="none" 
            dot={false} 
            hide={hidden.has(s.key)}
          />))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};

// ---------------------------------------------------------------------------
// Housing
// ---------------------------------------------------------------------------

// Median Home Value
export const HomeValueTrendChart = <TData,>({
  chart,
}: {
  chart: ChartItem<TData>;
}) => {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggleSeries = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  if (!data || data.length === 0) return null;

  const years = Array.from(new Set(data.map((r) => r.year))).sort();
  const labels = chart.chartParams?.legendLabels as
    | [string, string]
    | undefined;

  const buildPoint = (rows: any[], year: number) => {
    const row = rows.find((r) => r.Variable === 'Median Home Value' && r.year === year);
    return {'Median Home Value': row?.Value ?? null};};

  const plotData = years.map((year) => ({
    year,
    ...buildPoint(data, year), ...(compareData.length > 0 ? 
      {'Median Home Value (cmp)': buildPoint(compareData, year)['Median Home Value']}: {})}));

  return (
    <>
      <Text size="xs" c="dimmed" mb={4}>
        Click legend items to show or hide locations.
      </Text>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={plotData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis unit="$" tick={{ fontSize: 10 }} domain={['auto', 'auto']} 
                 tickFormatter={(val: any) => val != null ? new Intl.NumberFormat('en-US').format(val) : ''} />
          <Tooltip formatter={(val: any) => val != null ? `$${new Intl.NumberFormat('en-US').format(val)}`: '—'}/>
            <Legend align="right" verticalAlign="bottom" onClick={(e: any) => toggleSeries(e.dataKey)} formatter={(value) => (
            <span style={{ color: hidden.has(value) ? "#999" : "#222",
                          textDecoration: hidden.has(value) ? "line-through" : "none"}}>
              {value}
            </span>
          )} />
          <Line
            type="monotone"
            dataKey="Median Home Value"
            name={`${labels?.[0] ?? 'Main'}`}
            stroke="#154734"
            strokeWidth={3}
            dot={false}
            hide={hidden.has('Median Home Value')}
          />
          {compareData.length > 0 && (
            <>
              <Line
                type="monotone"
                dataKey="Median Home Value (cmp)"
                name={`${labels?.[1] ?? 'Comparison'}`}
                stroke="#1c7ed6"
                strokeWidth={3}
                dot={false}
                hide={hidden.has('Median Home Value (cmp)')}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};


export const HousingTenureAreaChart = <TData,>({
  chart,
}: {
  chart: ChartItem<TData>;
}) => {

  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggleSeries = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  if (!data || data.length === 0) return null;

  const years = Array.from(new Set(data.map((r) => r.year))).sort();
  const labels = chart.chartParams?.legendLabels as
    | [string, string]
    | undefined;

  const buildPoint = (rows: any[], year: number) => {
    const row = rows.find((r) => r.Variable === 'Renter-Occupied Units' && r.year === year);
    return {'Renter-Occupied Units': row?.Percent ?? null};};

  const plotData = years.map((year) => ({
    year,
    ...buildPoint(data, year), ...(compareData.length > 0 ? 
      {'Renter-Occupied Units (cmp)': buildPoint(compareData, year)['Renter-Occupied Units']}: {})}));

  return (
    <>
      <Text size="xs" c="dimmed" mb={4}>
        Click legend items to show or hide locations.
      </Text>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={plotData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} unit="%"/>
          <Tooltip formatter={(value: number) => value.toLocaleString() + `%`}/>
          <Legend align="right" verticalAlign="bottom" 
                  onClick={(e: any) => toggleSeries(e.dataKey)} formatter={(value) => (
            <span style={{ color: hidden.has(value) ? "#999" : "#222",
                          textDecoration: hidden.has(value) ? "line-through" : "none"}}>
              {value}
            </span>
          )} />
          <Line
            type="monotone"
            dataKey="Renter-Occupied Units"
            name={`${labels?.[0] ?? 'Main'}`}
            stroke="#154734"
            strokeWidth={3}
            dot={false}
            hide={hidden.has('Renter-Occupied Units')}
          />
          {compareData.length > 0 && (
            <>
              <Line
                type="monotone"
                dataKey="Renter-Occupied Units (cmp)"
                name={`${labels?.[1] ?? 'Comparison'}`}
                stroke="#1c7ed6"
                strokeWidth={3}
                dot={false}
                hide={hidden.has('Renter-Occupied Units (cmp)')}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};

// ---------------------------------------------------------------------------
// Housing: Housing Tenure
// ---------------------------------------------------------------------------

export const HousingUnitsTrendChart = <TData,>({
  chart,
}: {
  chart: ChartItem<TData>;
}) => {
  
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggleSeries = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  if (!data || data.length === 0) return null;

  const years = Array.from(new Set(data.map((r) => r.year))).sort();
  const labels = chart.chartParams?.legendLabels as
    | [string, string]
    | undefined;

  const buildPoint = (rows: any[], year: number) => {
    const row = rows.find((r) => r.Variable === 'Total Housing Units' && r.year === year);
    return {'Total Housing Units': row?.Value ?? null};};

  const plotData = years.map((year) => ({
    year,
    ...buildPoint(data, year), ...(compareData.length > 0 ? 
      {'Total Housing Units (cmp)': buildPoint(compareData, year)['Total Housing Units']}: {})}));

  return (
    <>
      <Text size="xs" c="dimmed" mb={4}>
        Click legend items to show or hide locations.
      </Text>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={plotData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} 
            tickFormatter={(value) => value.toLocaleString()}/>
          <Tooltip formatter={(value: number) => value.toLocaleString()}/>
          <Legend align="right" verticalAlign="bottom" 
                  onClick={(e: any) => toggleSeries(e.dataKey)} formatter={(value) => (
            <span style={{ color: hidden.has(value) ? "#999" : "#222",
                          textDecoration: hidden.has(value) ? "line-through" : "none"}}>
              {value}
            </span>
          )} />
          <Line
            type="monotone"
            dataKey="Total Housing Units"
            name={`${labels?.[0] ?? 'Main'}`}
            stroke="#154734"
            strokeWidth={3}
            dot={false}
            hide={hidden.has('Total Housing Units')}
          />
          {compareData.length > 0 && (
            <>
              <Line
                type="monotone"
                dataKey="Total Housing Units (cmp)"
                name={`${labels?.[1] ?? 'Comparison'}`}
                stroke="#1c7ed6"
                strokeWidth={3}
                dot={false}
                hide={hidden.has('Total Housing Units (cmp)')}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};

// ---------------------------------------------------------------------------
// Economics: Unemployment Rate
// ---------------------------------------------------------------------------

export const UnemploymentTrendChart = <TData,>({
  chart,
}: {
  chart: ChartItem<TData>;
}) => {
  
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggleSeries = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  if (!data || data.length === 0) return null;

  const years = Array.from(new Set(data.map((r) => r.year))).sort();
  const labels = chart.chartParams?.legendLabels as
    | [string, string]
    | undefined;

  const buildPoint = (rows: any[], year: number) => {
    const row = rows.find((r) => r.year === year);
    return {
      'Unemployment Rate': row?.Value ?? null,
    };
  };

  const plotData = years.map((year) => ({
    year,
    ...buildPoint(data, year),
    ...(compareData.length > 0
      ? {
          'Unemployment Rate (cmp)': buildPoint(compareData, year)['Unemployment Rate'],
        }
      : {}),
  }));

  return (
    <>
      <Text size="xs" c="dimmed" mb={4}>
        Click legend items to show or hide locations.
      </Text>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={plotData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis unit="%" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
          <Tooltip formatter={(val: any) => val != null ? `${Number(val).toFixed(1)}%` : '—'}/>
          <Legend align="right" verticalAlign="bottom"
                  onClick={(e: any) => toggleSeries(e.dataKey)} formatter={(value) => (
            <span style={{ color: hidden.has(value) ? "#999" : "#222",
                          textDecoration: hidden.has(value) ? "line-through" : "none"}}>
              {value}
            </span>
          )} />
          <Line
            type="monotone"
            dataKey="Unemployment Rate"
            name={`${labels?.[0] ?? 'Main'}`}
            stroke="#154734"
            strokeWidth={2}
            dot={false}
            hide={hidden.has('Unemployment Rate')}
          />
          {compareData.length > 0 && (
            <>
              <Line
                type="monotone"
                dataKey="Unemployment Rate (cmp)"
                name={`${labels?.[1] ?? 'Comparison'}`}
                stroke="#1c7ed6"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                hide={hidden.has('Unemployment Rate (cmp)')}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};

// ---------------------------------------------------------------------------
// Economics: Median Earnings (Male vs Female vs All Workers)
// ---------------------------------------------------------------------------

export const EarningsTrendChart = <TData,>({
  chart,
}: {
  chart: ChartItem<TData>;
}) => {
  
  const EARN_SERIES = [
    { key: 'Male Full-Time Workers', color: '#161E54' },
    { key: 'Female Full-Time Workers', color: '#F16D34' },
    { key: "All Workers", color: '#9BB0C1' },
  ];
  
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggleSeries = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  if (!data || data.length === 0) return null;
  const keys = new Set(EARN_SERIES.map((s) => s.key));
  const years = Array.from(new Set(data.map((r) => r.year))).sort();
  const labels = chart.chartParams?.legendLabels as
    | [string, string]
    | undefined;

  const buildPoint = (rows: any[], year: number) => {
    const find = (label: string) =>
      rows.find((r) => String(r.year) === String(year) && r.Variable === label)
        ?.Value ?? null;
    return {
      'Male Full-Time Workers': find('DP03_0093'),
      'Female Full-Time Workers': find('DP03_0094'),
      'All Workers': find('DP03_0092'),
    };
  };

  const plotData = years.map((year) => ({
    year,
    ...buildPoint(data, year),
    ...(compareData.length > 0
      ? {
          'Male Full-Time Workers (cmp)': buildPoint(compareData, year)[
            'Male Full-Time Workers'
          ],
          'Female Full-Time Workers (cmp)': buildPoint(compareData, year)[
            'Female Full-Time Workers'
          ],
          'All Workers (cmp)': buildPoint(compareData, year)['All Workers'],
        }
      : {}),
  }));
  return (
    <>
      {compareData.length > 0 && <CompareNote name={labels?.[1] ?? 'Comparison'} />}
      <Text size="xs" c="dimmed" mb={4}>
        Click legend items to show or hide income groups.
      </Text>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={plotData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            domain={['auto', 'auto']}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: any) =>
              value != null
                ? `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                : '—'
            }
          />
          <Legend align="right" verticalAlign="bottom"
                  onClick={(e: any) => toggleSeries(e.dataKey)} formatter={(value) => (
            <span style={{ color: hidden.has(value) ? "#999" : "#222",
                          textDecoration: hidden.has(value) ? "line-through" : "none"}}>
              {value} 
            </span>)}/>
          {EARN_SERIES.map((s) => (
          <Line 
            key={s.key} 
            dataKey={s.key} 
            stroke={s.color} 
            strokeWidth={2}
            dot={false} 
            hide={hidden.has(s.key)}
          />))}
          {compareData.length > 0 && EARN_SERIES.map((s) => (
          <Line
            key={`${s.key}-cmp`} 
            dataKey={`${s.key} (cmp)`} 
            stroke={s.color}
            strokeWidth={2} 
            strokeDasharray="6 4" 
            legendType="none" 
            dot={false} 
            hide={hidden.has(s.key)}
          />))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};

export const HouseholdIncomeTrendChart = <TData,>({
  chart,
}: {
  chart: ChartItem<TData>;
}) => {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggleSeries = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  if (!data || data.length === 0) return null;

  const years = Array.from(new Set(data.map((r) => r.year))).sort();
  const labels = chart.chartParams?.legendLabels as
    | [string, string]
    | undefined;

  const buildPoint = (rows: any[], year: number) => {
    const row = rows.find((r) => r.Variable === 'Median Household Income' && r.year === year);
    return {'Median Household Income': row?.Value ?? null};};

  const plotData = years.map((year) => ({
    year,
    ...buildPoint(data, year), ...(compareData.length > 0 ? 
      {'Median Household Income (cmp)': buildPoint(compareData, year)['Median Household Income']}: {})}));

  return (
    <>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={plotData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            domain={['auto', 'auto']}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip formatter={(value: any) => value != null ? `$${Number(value).toLocaleString(
            'en-US', { maximumFractionDigits: 0 })}`: '—'}/>
          <Legend align="right" verticalAlign="bottom" 
                  onClick={(e: any) => toggleSeries(e.dataKey)} formatter={(value) => (
            <span style={{ color: hidden.has(value) ? "#999" : "#222",
                          textDecoration: hidden.has(value) ? "line-through" : "none"}}>
              {value}
            </span>
          )} />
          <Line
            type="monotone"
            dataKey="Median Household Income"
            name={`${labels?.[0] ?? 'Main'}`}
            stroke="#154734"
            strokeWidth={3}
            dot={false}
            hide={hidden.has('Median Household Income')}
          />
          {compareData.length > 0 && (
            <>
              <Line
                type="monotone"
                dataKey="Median Household Income (cmp)"
                name={`${labels?.[1] ?? 'Comparison'}`}
                stroke="#1c7ed6"
                strokeWidth={3}
                dot={false}
                hide={hidden.has('Median Household Income (cmp)')}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};


export const PerCapitaIncomeTrendChart = <TData,>({
  chart,
}: {
  chart: ChartItem<TData>;
}) => {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggleSeries = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  if (!data || data.length === 0) return null;

  const years = Array.from(new Set(data.map((r) => r.year))).sort();
  const labels = chart.chartParams?.legendLabels as
    | [string, string]
    | undefined;

  const buildPoint = (rows: any[], year: number) => {
    const row = rows.find((r) => r.Variable === 'Per Capita Income' && r.year === year);
    return {'Per Capita Income': row?.Value ?? null};};

  const plotData = years.map((year) => ({
    year,
    ...buildPoint(data, year), ...(compareData.length > 0 ? 
      {'Per Capita Income (cmp)': buildPoint(compareData, year)['Per Capita Income']}: {})}));

  return (
    <>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={plotData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            domain={['auto', 'auto']}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip formatter={(value: any) => value != null ? `$${Number(value).toLocaleString(
            'en-US', { maximumFractionDigits: 0 })}`: '—'}/>
          <Legend align="right" verticalAlign="bottom" 
                  onClick={(e: any) => toggleSeries(e.dataKey)} formatter={(value) => (
            <span style={{ color: hidden.has(value) ? "#999" : "#222",
                          textDecoration: hidden.has(value) ? "line-through" : "none"}}>
              {value}
            </span>
          )} />
          <Line
            type="monotone"
            dataKey="Per Capita Income"
            name={`${labels?.[0] ?? 'Main'}`}
            stroke="#154734"
            strokeWidth={3}
            dot={false}
            hide={hidden.has('Per Capita Income')}
          />
          {compareData.length > 0 && (
            <>
              <Line
                type="monotone"
                dataKey="Per Capita Income (cmp)"
                name={`${labels?.[1] ?? 'Comparison'}`}
                stroke="#1c7ed6"
                strokeWidth={3}
                dot={false}
                hide={hidden.has('Per Capita Income (cmp)')}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};



// Labor Force Participation Rate (16+) and Prime-Age Labor Force Participation Rate (25-54)
export const LaborForceTrendChart = <TData,>({
  chart,
}: {
  chart: ChartItem<TData>;
}) => {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggleSeries = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  if (!data || data.length === 0) return null;

  const years = Array.from(new Set(data.map((r) => r.year))).sort();
  const labels = chart.chartParams?.legendLabels as
    | [string, string]
    | undefined;

  const buildPoint = (rows: any[], year: number) => {
    const row = rows.find((r) => r.Variable === 'Labor Force Participation Rate (16+)' && r.year === year);
    return {'Labor Force Participation Rate (16+)': row?.Percent ?? null};};

  const plotData = years.map((year) => ({
    year,
    ...buildPoint(data, year), ...(compareData.length > 0 ? 
      {'Labor Force Participation Rate (16+) (cmp)': buildPoint(compareData, year)['Labor Force Participation Rate (16+)']}: {})}));

  return (
    <>
      <Text size="xs" c="dimmed" mb={4}>
        Click legend items to show or hide locations.
      </Text>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={plotData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis unit="%" tick={{ fontSize: 10 }} domain={['auto', 'auto']} 
                 tickFormatter={(val: any) => val != null ? `${val}` : '—'} />
          <Tooltip formatter={(val: any) => val != null ? `${val}%` : '—'}/>
          <Legend align="right" verticalAlign="bottom" 
                  onClick={(e: any) => toggleSeries(e.dataKey)} formatter={(value) => (
            <span style={{ color: hidden.has(value) ? "#999" : "#222",
                          textDecoration: hidden.has(value) ? "line-through" : "none"}}>
              {value}
            </span>
          )} />
          <Line
            type="monotone"
            dataKey="Labor Force Participation Rate (16+)"
            name={`${labels?.[0] ?? 'Main'}`}
            stroke="#154734"
            strokeWidth={3}
            dot={false}
            hide={hidden.has('Labor Force Participation Rate (16+)')}
          />
          {compareData.length > 0 && (
            <>
              <Line
                type="monotone"
                dataKey="Labor Force Participation Rate (16+) (cmp)"
                name={`${labels?.[1] ?? 'Comparison'}`}
                stroke="#1c7ed6"
                strokeWidth={3}
                dot={false}
                hide={hidden.has('Labor Force Participation Rate (16+) (cmp)')}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};

export const LaborForceTrendChartPrimeAge = <TData,>({
  chart,
}: {
  chart: ChartItem<TData>;
}) => {

  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggleSeries = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  if (!data || data.length === 0) return null;

  const years = Array.from(new Set(data.map((r) => r.year))).sort();
  const labels = chart.chartParams?.legendLabels as
    | [string, string]
    | undefined;

  const buildPoint = (rows: any[], year: number) => {
    const row = rows.find((r) => r.Variable === 'Prime-Age Labor Force Participation Rate (25-54)' && r.year === year);
    return {'Prime-Age Labor Force Participation Rate (25-54)': row?.Percent ?? null};};

  const plotData = years.map((year) => ({
    year,
    ...buildPoint(data, year), ...(compareData.length > 0 ? 
      {'Prime-Age Labor Force Participation Rate (25-54) (cmp)': buildPoint(compareData, year)['Prime-Age Labor Force Participation Rate (25-54)']}: {})}));

  return (
    <>
      <Text size="xs" c="dimmed" mb={4}>
        Click legend items to show or hide locations.
      </Text>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={plotData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis unit="%" tick={{ fontSize: 10 }} domain={['auto', 'auto']} 
                 tickFormatter={(val: any) => val != null ? `${val}` : '—'} />
          <Tooltip formatter={(val: any) => val != null ? `${val}%` : '—'}/>
          <Legend align="right" verticalAlign="bottom" 
                  onClick={(e: any) => toggleSeries(e.dataKey)} formatter={(value) => (
            <span style={{ color: hidden.has(value) ? "#999" : "#222",
                          textDecoration: hidden.has(value) ? "line-through" : "none"}}>
              {value}
            </span>
          )} />
          <Line
            type="monotone"
            dataKey="Prime-Age Labor Force Participation Rate (25-54)"
            name={`${labels?.[0] ?? 'Main'}`}
            stroke="#154734"
            strokeWidth={3}
            dot={false}
            hide={hidden.has('Prime-Age Labor Force Participation Rate (25-54)')}
          />
          {compareData.length > 0 && (
            <>
              <Line
                type="monotone"
                dataKey="Prime-Age Labor Force Participation Rate (25-54) (cmp)"
                name={`${labels?.[1] ?? 'Comparison'}`}
                stroke="#1c7ed6"
                strokeWidth={3}
                dot={false}
                hide={hidden.has('Prime-Age Labor Force Participation Rate (25-54) (cmp)')}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};

// ---------------------------------------------------------------------------
// Generic two-location trend chart for the DP-combined explorer
// data:        [{year, Value}] for side A
// compareData: [{year, Value}] for side B
// chartParams.legendLabels: [sideA label, sideB label]
// chartParams.measure:      raw measure string (e.g. 'Percent') for formatting
// ---------------------------------------------------------------------------

export const DPTrendChart = <TData,>({
  chart,
}: {
  chart: ChartItem<TData>;
}) => {
  const data = chart.data as any[];
  const compareData = (chart.compareData ?? []) as any[];
  const lbls = chart.chartParams?.legendLabels as [string, string] | undefined;
  const primaryName = lbls?.[0] ?? 'Side A';
  const compareName = lbls?.[1] ?? 'Side B';
  const isPercent = (chart.chartParams?.measure as string | undefined)
    ?.toLowerCase()
    .includes('percent');

  const allYears = Array.from(
    new Set([...data, ...compareData].map((r) => r.year)),
  ).sort((a, b) => a - b);

  const plotData = allYears.map((year) => ({
    year,
    primary: data.find((r) => r.year === year)?.Value ?? null,
    compare: compareData.find((r) => r.year === year)?.Value ?? null,
  }));

  const fmt = (v: any) =>
    v != null ? (isPercent ? `${v}%` : Number(v).toLocaleString()) : '—';

  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={plotData}
        margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) =>
            isPercent ? `${v}%` : Number(v).toLocaleString()
          }
          domain={['auto', 'auto']}
        />
        <Tooltip formatter={(val: any, name: string) => [fmt(val), name]} />
        <Legend />
        <Line
          type="monotone"
          dataKey="primary"
          name={primaryName}
          stroke="#154734"
          strokeWidth={2}
          dot={false}
        />
        {compareData.length > 0 && (
          <Line
            type="monotone"
            dataKey="compare"
            name={compareName}
            stroke="#8899aa"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            dot={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};

'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartItem, DataRow } from '@/types/cachedCharts';
import { ScrollArea, SegmentedControl, Table } from '@mantine/core';
import { useState } from 'react';
import { usePdfMode } from '@/contexts/PdfModeContext';

const SECTOR_COLORS: Record<string, string> = {
  'Goods-producing': '#264653',
  'Trade, Transportation & Utilities': '#287271',
  'Education & Health Services': '#2a9d8f',
  'Leisure & Hospitality': '#8ab17d',
  'Professional & Business Services': '#e9c46a',
  'Information & Financial Activities': '#f4a261',
  Government: '#e76f51',
  'Other Services': '#c0c0c0',
};

const yAxisFmt = (v: any) => `${(v / 1000).toFixed(0)}k`;
const tooltipFmt = (v: any) => `${v.toLocaleString(0)}`;

type EmpView = 'stacked' | 'trend' | 'table';

// Gallery tiles get a compact height; report/PDF get the full interactive height.
const GALLERY_H = 275;
const INNER_H = 345;

// Same year-snapping helper used by the trend charts — keeps x-axis tick
// density consistent everywhere gallery-vs-report matters.
const computeGalleryTicks = (
  values: string[],
  keepEvery = 4,
): string[] | undefined => {
  if (values.length === 0) return undefined;
  if (values.length <= keepEvery) return values;
  const step = Math.ceil(values.length / keepEvery);
  const ticks = values.filter((_, i) => i % step === 0);
  if (ticks[ticks.length - 1] !== values[values.length - 1]) {
    ticks.push(values[values.length - 1]);
  }
  return ticks;
};

export const EmploymentAreaChart = ({
  chart,
  view = 'report',
}: {
  chart: ChartItem<any>;
  view?: 'gallery' | 'report';
}) => {
  const isPdfMode = usePdfMode();
  const isGallery = view === 'gallery';

  const [localView, setLocalView] = useState<EmpView>('stacked');
  // Gallery tiles always show the stacked view — no controls, no state to manage.
  const activeView: EmpView = isPdfMode || isGallery ? 'stacked' : localView;

  const data = chart.data as any[];
  if (!data?.length) return null;

  const sectors = Object.keys(data[0]).filter((k) => k !== 'quarter_label');

  const q1Ticks = data
    .filter((d) => String(d.quarter_label).endsWith('Q1'))
    .map((d) => d.quarter_label as string);

  const galleryTicks = computeGalleryTicks(q1Ticks, 4);

  const dataWithTotal = data.map((row) => ({
    ...row,
    Total: sectors.reduce((sum, s) => {
      const v = row[s];
      return v != null && !isNaN(Number(v)) ? sum + Number(v) : sum;
    }, 0),
  }));

  const totals = dataWithTotal
    .map((r) => r.Total as number)
    .filter((v) => v > 0);
  const minTotal = totals.length ? Math.min(...totals) : 0;
  const maxTotal = totals.length ? Math.max(...totals) : 0;
  const range = maxTotal - minTotal || 1;
  const rough = range / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const step =
    norm < 1.5 ? mag : norm < 3 ? 2 * mag : norm < 7 ? 5 * mag : 10 * mag;
  const trendYMin = (Math.floor(minTotal / step) - 1) * step;
  const trendYMax = Math.ceil(maxTotal / step) * step;

  const tableRows = [...dataWithTotal].reverse();

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

  const height = isGallery ? GALLERY_H : INNER_H;

  return (
    <>
      {!isPdfMode && !isGallery && (
        <SegmentedControl
          value={localView}
          onChange={(v) => setLocalView(v as EmpView)}
          data={[
            { label: 'Stacked', value: 'stacked' },
            { label: 'Trend', value: 'trend' },
            { label: 'Table', value: 'table' },
          ]}
          size="xs"
          mb="sm"
        />
      )}

      {activeView === 'stacked' && (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={data}
            margin={
              isGallery
                ? { top: 4, right: 8, left: 8, bottom: 0 }
                : { top: 10, right: 20, left: 20, bottom: 5 }
            }
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
            <XAxis
              dataKey="quarter_label"
              ticks={isGallery ? galleryTicks : q1Ticks}
              tick={{ fontSize: isGallery ? 9 : 11 }}
              interval={0}
            />
            <YAxis
              tickFormatter={yAxisFmt}
              tick={{ fontSize: isGallery ? 9 : 11 }}
              width={isGallery ? 36 : 65}
              label={
                isGallery
                  ? undefined
                  : {
                      value: 'Employment',
                      angle: -90,
                      position: 'insideLeft',
                      offset: -5,
                      style: { fontSize: 11 },
                    }
              }
            />
            {!isGallery && (
              <Tooltip
                formatter={(val, name) => [tooltipFmt(val), name]}
                labelFormatter={(label) => `Quarter: ${label}`}
              />
            )}
            {!isGallery && (
              <Legend
                verticalAlign="top"
                wrapperStyle={{ fontSize: 12 }}
                content={({ payload }) => (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      gap: '12px',
                      paddingBottom: '8px',
                    }}
                  >
                    {payload?.map((entry: any) => {
                      const key = entry.value;
                      const isHidden = hidden.has(key);
                      return (
                        <span
                          key={key}
                          onClick={() => toggleSeries(key)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            color: isHidden ? '#999' : '#222',
                            textDecoration: isHidden ? 'line-through' : 'none',
                            userSelect: 'none',
                          }}
                        >
                          <span
                            style={{
                              width: 12,
                              height: 12,
                              background: isHidden ? '#ccc' : entry.color,
                              marginRight: 6,
                              borderRadius: 2,
                            }}
                          />
                          {key}
                        </span>
                      );
                    })}
                  </div>
                )}
              />
            )}
            {sectors.map((s) => (
              <Area
                key={s}
                type="monotone"
                dataKey={s}
                stackId="1"
                fill={SECTOR_COLORS[s] ?? '#aaa'}
                stroke={SECTOR_COLORS[s] ?? '#aaa'}
                fillOpacity={0.85}
                dot={false}
                activeDot={false}
                hide={hidden.has(s)}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}

      {activeView === 'trend' && !isGallery && (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={dataWithTotal}
            margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
            <XAxis
              dataKey="quarter_label"
              ticks={q1Ticks}
              tick={{ fontSize: 11 }}
              interval={0}
            />
            <YAxis
              tickFormatter={yAxisFmt}
              tick={{ fontSize: 11 }}
              width={65}
              domain={[trendYMin, trendYMax]}
              label={{
                value: 'Employment',
                angle: -90,
                position: 'insideLeft',
                offset: -5,
                style: { fontSize: 11 },
              }}
            />
            <Tooltip
              formatter={(val, name) => [tooltipFmt(val), name]}
              labelFormatter={(label) => `Quarter: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="Total"
              stroke="#154734"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {activeView === 'table' && !isGallery && (
        <ScrollArea style={isPdfMode ? undefined : { height: INNER_H }}>
          <Table striped highlightOnHover withColumnBorders fz="xs">
            <Table.Thead
              style={{
                position: 'sticky',
                top: 0,
                background: 'white',
                zIndex: 1,
              }}
            >
              <Table.Tr>
                <Table.Th>Quarter</Table.Th>
                {sectors.map((s) => (
                  <Table.Th key={s} style={{ textAlign: 'right' }}>
                    {s}
                  </Table.Th>
                ))}
                <Table.Th style={{ textAlign: 'right' }}>Total</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tableRows.map((row) => (
                <Table.Tr key={String(row.quarter_label)}>
                  <Table.Td>{row.quarter_label}</Table.Td>
                  {sectors.map((s) => (
                    <Table.Td key={s} style={{ textAlign: 'right' }}>
                      {tooltipFmt(row[s])}
                    </Table.Td>
                  ))}
                  <Table.Td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {tooltipFmt(row.Total)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}
    </>
  );
};

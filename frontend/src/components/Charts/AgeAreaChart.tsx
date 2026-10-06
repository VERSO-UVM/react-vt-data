'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartItem } from '@/types/cachedCharts';
import { ScrollArea, SegmentedControl, Table } from '@mantine/core';
import { useState } from 'react';
import { usePdfMode } from '@/contexts/PdfModeContext';

// Key order = stacking order (youngest at the bottom) and legend order.
const AGE_COLORS: Record<string, string> = {
  'Under 18': '#264653',
  '18 to 24': '#287271',
  '25 to 34': '#2a9d8f',
  '35 to 44': '#8ab17d',
  '45 to 54': '#e9c46a',
  '55 to 64': '#f4a261',
  '65 to 74': '#e76f51',
  '75 Plus': '#c0c0c0',
};
const AGES = Object.keys(AGE_COLORS);

const compactFmt = new Intl.NumberFormat('en-US', { notation: 'compact' });
const yAxisFmt = (v: number) => compactFmt.format(v);
const tooltipFmt = (v: unknown) => (v as number).toLocaleString();

// Gallery tiles get a compact height; report/PDF get the full interactive height.
const GALLERY_H = 275;
const INNER_H = 345;

export const AgeAreaChart = ({
  chart,
  view = 'report',
}: {
  chart: ChartItem;
  view?: 'gallery' | 'report';
}) => {
  const isPdfMode = usePdfMode();
  const isGallery = view === 'gallery';

  const [localView, setLocalView] = useState<'chart' | 'table'>('chart');
  const activeView = isPdfMode || isGallery ? 'chart' : localView;

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

  // Long (Year, Variable, Value) -> wide, one row per year, oldest first.
  const byYear = new Map<number, Record<string, number>>();
  for (const row of chart.data ?? []) {
    const age = String(row.Variable);
    const value = Number(row.Value);
    if (!(age in AGE_COLORS) || isNaN(value)) continue;
    const year = Number(row.year); // API returns lowercase `year`
    const entry = byYear.get(year) ?? { Year: year };
    entry[age] = (entry[age] ?? 0) + value;
    byYear.set(year, entry);
  }
  const data = [...byYear.values()].sort((a, b) => a.Year - b.Year);
  if (!data.length) return null;

  const height = isGallery ? GALLERY_H : INNER_H;

  return (
    <>
      {!isPdfMode && !isGallery && (
        <SegmentedControl
          value={localView}
          onChange={(v) => setLocalView(v as 'chart' | 'table')}
          data={[
            { label: 'Chart', value: 'chart' },
            { label: 'Table', value: 'table' },
          ]}
          size="xs"
          mb="sm"
        />
      )}
      {activeView === 'chart' && (
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
              dataKey="Year"
              type="number"
              domain={['dataMin', 'dataMax']}
              allowDecimals={false}
              tickFormatter={(y) => String(y)}
              tick={{ fontSize: isGallery ? 9 : 11 }}
            />
            <YAxis
              tickFormatter={yAxisFmt}
              tick={{ fontSize: isGallery ? 9 : 11 }}
              width={isGallery ? 36 : 65}
              label={
                isGallery
                  ? undefined
                  : {
                      value: 'Population',
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
                labelFormatter={(label) => `Year: ${label}`}
              />
            )}
            {!isGallery && (
              <Legend
                verticalAlign="top"
                wrapperStyle={{ fontSize: 12 }}
                content={() => (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      gap: '12px',
                      paddingBottom: '8px',
                    }}
                  >
                    {AGES.map((key) => {
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
                              background: isHidden ? '#ccc' : AGE_COLORS[key],
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
            {AGES.map((s) => (
              <Area
                key={s}
                type="monotone"
                dataKey={s}
                stackId="1"
                fill={AGE_COLORS[s]}
                stroke={AGE_COLORS[s]}
                fillOpacity={0.85}
                dot={false}
                activeDot={false}
                isAnimationActive={!isPdfMode}
                hide={hidden.has(s)}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
      {activeView === 'table' && (
        <ScrollArea style={{ height: INNER_H }}>
          <Table striped highlightOnHover withColumnBorders fz="xs">
            <Table.Thead
              style={{ position: 'sticky', top: 0, background: 'white' }}
            >
              <Table.Tr>
                <Table.Th>Year</Table.Th>
                {AGES.map((a) => (
                  <Table.Th key={a} style={{ textAlign: 'right' }}>
                    {a}
                  </Table.Th>
                ))}
                <Table.Th style={{ textAlign: 'right' }}>Total</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.map((row) => (
                <Table.Tr key={row.Year}>
                  <Table.Td>{row.Year}</Table.Td>
                  {AGES.map((a) => (
                    <Table.Td key={a} style={{ textAlign: 'right' }}>
                      {tooltipFmt(row[a] ?? 0)}
                    </Table.Td>
                  ))}
                  <Table.Td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {tooltipFmt(AGES.reduce((t, a) => t + (row[a] ?? 0), 0))}
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

'use client';
import { Box, Divider, Paper, Stack, Title, Text } from '@mantine/core';
import { useState } from 'react';
import { BASE_API_URL } from '@/config';
import VTMap from '@/components/mapping';
import { cdc_filtering } from '@/components/FilterRedux/filterDefs';
import { FilterWrap } from '@/components/FilterRedux/filterWrap';
import { assemble } from '@/components/FilterRedux/apiHelpers';
import { postRequest } from '@/components/FilterRedux/filterRequest';
import { FilterSpec } from '@/components/FilterRedux/filterTypes';

type Legend = {
  grid: number[][][];
  measures: [string, string];
  edges_x: number[];
  edges_y: number[];
};

function BivariateLegend({ legend }: { legend: Legend }) {
  const { grid, measures, edges_x, edges_y } = legend;
  const rgba = (c: number[]) => `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 255})`;
  const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
  const cut_x = edges_x.slice(1, -1); // interior cutpoints
  const cut_y = edges_y.slice(1, -1);
  const CELL = 26;

  return (
    <Paper withBorder p="sm" radius="md" style={{ display: 'inline-block' }}>
      <Text size="xs" fw={500} mb={6}>
        {measures[0]} × {measures[1]}
      </Text>
      <div style={{ display: 'flex', gap: 6 }}>
        {/* y-axis: label + tick values */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
          oz
        >
          {cut_y
            .slice()
            .reverse()
            .map((v, i) => (
              <Text
                key={i}
                size="10px"
                c="dimmed"
                style={{ lineHeight: `${CELL}px` }}
              >
                {fmt(v)}
              </Text>
            ))}
        </div>

        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(3, ${CELL}px)`,
              gap: 1,
            }}
          >
            {[2, 1, 0].map((y) =>
              [0, 1, 2].map((x) => (
                <div
                  key={`${x}-${y}`}
                  style={{
                    width: CELL,
                    height: CELL,
                    backgroundColor: rgba(grid[y][x]),
                  }}
                />
              )),
            )}
          </div>
          {/* x-axis tick values under gridlines */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-evenly',
              marginTop: 2,
            }}
          >
            {cut_x.map((v, i) => (
              <Text key={i} size="10px" c="dimmed">
                {fmt(v)}
              </Text>
            ))}
          </div>
        </div>
      </div>
      <Text size="10px" c="dimmed" ta="center" mt={2}>
        {measures[0]} →
      </Text>
    </Paper>
  );
}

export default function Scratch_CDC() {
  const [legend, setLegend] = useState<Legend | null>(null);
  const [rows, setRows] = useState<{}>({});
  const tableURL = `${BASE_API_URL}/load/mapping/cdc/places/double_new`;
  const legendURL = `${BASE_API_URL}/load/mapping/cdc/places/bins`;

  const handleApply = async (specs: FilterSpec[]) => {
    const payload = assemble(specs);
    const [legendData, rowsData] = await Promise.all([
      postRequest({ dataURL: legendURL, payload }),
      postRequest({ dataURL: tableURL, payload }),
    ]);
    setLegend(legendData);
    setRows(rowsData);
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        padding: 16,
        height: 'calc(100vh - 80px)',
      }}
    >
      <Paper
        withBorder
        p="md"
        radius="md"
        style={{ width: 340, flexShrink: 0, overflowY: 'auto' }}
      >
        <Title order={4} mb="sm">
          Compare Variables
        </Title>
        <FilterWrap handleApply={handleApply} filterList={cdc_filtering} />
        {legend && <BivariateLegend legend={legend} />}
      </Paper>
      <Box
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <VTMap geojson={rows} showCountyLines={false} />
      </Box>
    </div>
  );
}

// TableView.tsx
import { useState } from 'react';
import { Box, Button, Group, ScrollArea, Table, Text, Title, SegmentedControl } from '@mantine/core';
import { ChartItem, DataRow } from '@/types/cachedCharts';

interface TableViewProps<TData> {
  chart: ChartItem<TData>;
  rows?: DataRow[]; // derived/reshaped rows (e.g. trend plotData) take priority
}

const HOME_BG = 'var(--mantine-color-green-0)';
const COMP_BG = 'var(--mantine-color-blue-0)';
const SPLIT_BORDER = '1px solid var(--mantine-color-gray-3)';
const CMP_SUFFIX = ' (cmp)';

const formatCell = (v: unknown) => {
  if (v == null) return '—';
  if (typeof v === 'number')
    return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return String(v);
};

export const TableView = <TData extends DataRow>({
  chart,
  rows: rowsOverride,
}: TableViewProps<TData>) => {
  const rows = (rowsOverride ?? chart.tableData ?? chart.data) as DataRow[];
  const [showCompare, setShowCompare] = useState(false);
  const usePivot = chart.trendChart

  if (!rows || rows.length === 0) return null;

  const labels = chart.chartParams?.legendLabels as
    [string, string] | undefined;
  const homeLabel = labels?.[0] ?? 'Primary';
  const compareLabel = labels?.[1] ?? 'Comparison';

  if (usePivot) {
  // x-axis key: prefer chart.xField if it's an actual key on the rows, else fall back to 'year'
    const xKey =
      chart.xField && rows[0] && chart.xField in rows[0] ? chart.xField : 'year';

    const xValues = Array.from(new Set(rows.map((r) => r[xKey]))).filter(
      (v) => v != null,
    );

    // series/row keys = every column except the x key and its "(cmp)" counterpart
    const allKeys = rows[0] ? Object.keys(rows[0]) : [];
    const seriesKeys = allKeys.filter(
      (k) => k !== xKey && !k.endsWith(CMP_SUFFIX),
    );

    const hasCompare = seriesKeys.some((k) =>
      rows.some((r) => r[`${k}${CMP_SUFFIX}`] != null),
    );

    const findRow = (x: unknown) => rows.find((r) => r[xKey] === x);
    
  return (
    <Box h="100%">
      {hasCompare && (
        <Group mb="xs" gap="sm" align="center">
          <Button
            size="xs"
            variant={showCompare ? 'filled' : 'light'}
            color="blue"
            onClick={() => setShowCompare((v) => !v)}
          >
            {showCompare ? 'Hide Comparison' : 'Show Comparison'}
          </Button>
          {showCompare && (
            <Group gap={6}>
              <Box
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: HOME_BG,
                  border: '1px solid var(--mantine-color-green-3)',
                  display: 'inline-block',
                }}
              />
              <Text size="xs">{homeLabel}</Text>
              <Box
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: COMP_BG,
                  border: '1px solid var(--mantine-color-blue-3)',
                  display: 'inline-block',
                  marginLeft: 8,
                }}
              />
              <Text size="xs">{compareLabel}</Text>
            </Group>
          )}
        </Group>
      )}

      <ScrollArea>
          <Table striped withTableBorder withColumnBorders fz="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th></Table.Th>
                {xValues.map((x) => (
                  <Table.Th key={String(x)}>{String(x)}</Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {seriesKeys.map((key) => (
                <Table.Tr key={key}>
                  <Table.Td>{key}</Table.Td>
                  {xValues.map((x) => {
                    const row = findRow(x);
                    const mainVal = row?.[key];
                    if (!showCompare || !hasCompare) {
                      return (
                        <Table.Td key={String(x)}>
                          {formatCell(mainVal)}
                        </Table.Td>
                      );
                    }
                    const cmpVal = row?.[`${key}${CMP_SUFFIX}`];
                    return (
                      <Table.Td key={String(x)} style={{ padding: 0 }}>
                        <div style={{ display: 'flex', minWidth: 90 }}>
                          <div
                            style={{
                              flex: 1,
                              padding: '3px 6px',
                              background: HOME_BG,
                              textAlign: 'right',
                            }}
                          >
                            {formatCell(mainVal)}
                          </div>
                          <div
                            style={{
                              flex: 1,
                              padding: '3px 6px',
                              background: COMP_BG,
                              borderLeft: SPLIT_BORDER,
                              textAlign: 'right',
                            }}
                          >
                            {formatCell(cmpVal)}
                          </div>
                        </div>
                      </Table.Td>
                    );
                  })}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
      </ScrollArea>
    </Box>
  );
};

const columns = rows[0] ? Object.keys(rows[0]) : [];

return (
  <ScrollArea>
    <Table striped withTableBorder withColumnBorders fz="xs">
      <Table.Thead>
        <Table.Tr>
          {columns.map((column) => (
            <Table.Th key={column}>{column}</Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>

      <Table.Tbody>
        {rows.map((row, i) => (
          <Table.Tr key={i}>
            {columns.map((column) => (
              <Table.Td key={column}>
                {formatCell(row[column])}
              </Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  </ScrollArea>
);
}

interface ViewSwitchProps {
  view: 'chart' | 'table';
  setView: (view: 'chart' | 'table') => void;
}

export const ViewSwitch = ({ view, setView }: ViewSwitchProps) => (
  <Group justify="space-between" mb="sm">
    <Title order={4}></Title>
    <SegmentedControl
      value={view}
      defaultValue="chart"
      transitionDuration={300}
      transitionTimingFunction="linear"
      onChange={(v) => setView(v as 'chart' | 'table')}
      data={[
        { label: 'Chart', value: 'chart' },
        { label: 'Table', value: 'table' },
      ]}
    />
  </Group>
);
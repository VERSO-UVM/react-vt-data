import { useState } from 'react';
import { Box, Button, Group, ScrollArea, Table, Text } from '@mantine/core';
import { FileXlsIcon } from '@phosphor-icons/react';
import { ChartItem, DataRow } from '@/types/cachedCharts';
import { COLORS } from '@/app/theme';
import * as XLSX from 'xlsx';
import { saveWorksheet } from './TableView';
import {
  FieldOf,
  MarginFootnote,
  cellCompanion,
  cellMarginFlags,
  cellText,
  moeField,
  useShowMargins,
} from './margins';

// tidy ACS row shape consumed by the demographics tables
interface AcsRow extends DataRow {
  year?: number | string;
  Variable?: string;
  Value?: number;
  Percent?: number;
}

const HOME_BG = 'var(--mantine-color-green-0)';
const COMP_BG = 'var(--mantine-color-blue-0)';
const SPLIT_BORDER = '1px solid var(--mantine-color-gray-3)';

const DemographicsTableBase = ({
  chart,
  fieldOf,
}: {
  chart: ChartItem<AcsRow>;
  fieldOf: FieldOf;
}) => {
  const data = chart.data;
  const compareData = chart.compareData ?? [];
  const hasCompare = compareData.length > 0;
  const [showCompare, setShowCompare] = useState(false);
  const show = useShowMargins();

  // The export always writes the comparison columns, but the footnote
  // explains only the cells on screen.
  const allRows = [...data, ...compareData];
  const exported = cellMarginFlags(allRows, fieldOf);
  const shown = cellMarginFlags(showCompare ? allRows : data, fieldOf);

  const labels = chart.chartParams?.legendLabels as
    [string, string] | undefined;
  const homeLabel = labels?.[0] ?? 'Primary';
  const compareLabel = labels?.[1] ?? 'Comparison';

  const years = Array.from(new Set(data.map((r) => r.year))).sort();
  const variables = Array.from(new Set(data.map((r) => r.Variable)));

  const findRow = (
    rows: AcsRow[],
    variable: string | undefined,
    year: number | string | undefined,
  ) => rows.find((r) => r.Variable === variable && r.year === year);

  // Mirrors the table: a "Variable" column, then one column per year that
  // splits in two (main place | comparison) under a merged year header. With
  // margins, each variable's row is followed by a row of its margins.
  const exportTable = () => {
    const sub = hasCompare ? [homeLabel, compareLabel] : [];
    const width = hasCompare ? 2 : 1;
    const num = (r: AcsRow | undefined) => r?.[fieldOf(r)] ?? '';
    const moe = (r: AcsRow | undefined) =>
      cellCompanion(r, fieldOf, moeField) ?? '';
    const header = [
      'Variable',
      ...years.flatMap((y) => (hasCompare ? [y, ''] : [y])),
    ];
    const line = (
      label: string,
      cell: (r: AcsRow | undefined) => unknown,
      variable?: string,
    ) => [
      label,
      ...years.flatMap((year) => [
        cell(findRow(data, variable, year)),
        ...(hasCompare ? [cell(findRow(compareData, variable, year))] : []),
      ]),
    ];
    const body = variables.flatMap((variable) => [
      line(String(variable), num, variable),
      ...(exported.margins ? [line(`${variable} MOE`, moe, variable)] : []),
    ]);
    const rows = hasCompare
      ? [header, ['', ...years.flatMap(() => sub)], ...body]
      : [header, ...body];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    if (hasCompare) {
      sheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
        ...years.map((_, i) => ({
          s: { r: 0, c: 1 + i * width },
          e: { r: 0, c: i * width + width },
        })),
      ];
    }
    saveWorksheet(chart, sheet);
  };

  return (
    // Fills the chart box and scrolls inside it; a ScrollArea with no bounded
    // height never scrolls vertically, so long tables were cut off.
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Group mb="xs" gap="sm" align="center">
        <Button
          size="xs"
          color={COLORS.spruce}
          leftSection={<FileXlsIcon size={20} />}
          onClick={exportTable}
        >
          Export
        </Button>
        {hasCompare && (
          <Button
            size="xs"
            variant={showCompare ? 'filled' : 'light'}
            color="blue"
            onClick={() => setShowCompare((v) => !v)}
          >
            {showCompare ? 'Hide Comparison' : 'Show Comparison'}
          </Button>
        )}
        {hasCompare && showCompare && (
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

      <ScrollArea style={{ flex: 1, minHeight: 0 }}>
        <Table stickyHeader striped withTableBorder withColumnBorders fz="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th></Table.Th>
              {years.map((y) => (
                <Table.Th key={y}>{y}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {variables.map((variable) => (
              <Table.Tr key={variable}>
                <Table.Td>{variable}</Table.Td>
                {years.map((year) => {
                  const mainRow = findRow(data, variable, year);
                  if (!showCompare) {
                    return (
                      <Table.Td key={year}>
                        {cellText(mainRow, fieldOf, show)}
                      </Table.Td>
                    );
                  }
                  const cmpRow = findRow(compareData, variable, year);
                  return (
                    <Table.Td key={year} style={{ padding: 0 }}>
                      <div style={{ display: 'flex', minWidth: 90 }}>
                        <div
                          style={{
                            flex: 1,
                            padding: '3px 6px',
                            background: HOME_BG,
                            textAlign: 'right',
                          }}
                        >
                          {cellText(mainRow, fieldOf, show)}
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
                          {cellText(cmpRow, fieldOf, show)}
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
      {shown.margins && (
        <MarginFootnote lowReliability={shown.lowReliability} show={show} />
      )}
    </Box>
  );
};

export const renderTable = ({ chart }: { chart: ChartItem<AcsRow> }) => (
  <DemographicsTableBase chart={chart} fieldOf={() => 'Percent'} />
);

export const renderTableEstimates = ({
  chart,
}: {
  chart: ChartItem<AcsRow>;
}) => <DemographicsTableBase chart={chart} fieldOf={() => 'Value'} />;

/** Shows Percent when available, falls back to Value — for mixed tables like Housing. */
export const renderTableMixed = ({ chart }: { chart: ChartItem<AcsRow> }) => (
  <DemographicsTableBase
    chart={chart}
    fieldOf={(row) => (row?.Percent != null ? 'Percent' : 'Value')}
  />
);

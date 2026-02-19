import { ScrollArea, Table } from '@mantine/core';
import { ChartItem } from '@/types/cachedCharts';

export const renderTable = <TData,>({ chart }: { chart: ChartItem<TData> }) => {
  const data = chart.data as any[];
  const years = Array.from(new Set(data.map((r) => r.year))).sort();
  const variables = Array.from(new Set(data.map((r) => r.Variable)));

  return (
    <ScrollArea>
      <Table striped withTableBorder withColumnBorders fz="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Demographic</Table.Th>
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
                const row = data.find(
                  (r) => r.Variable === variable && r.year === year,
                );
                return (
                  <Table.Td key={year}>
                    {row?.Percent != null ? `${row.Percent.toFixed(1)}%` : '—'}
                  </Table.Td>
                );
              })}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
};

import { Anchor, ScrollArea, Table, Text } from '@mantine/core';
import { DataRow } from '@/types/cachedCharts';
import { ChartBlock, useReport } from '@/components/Reports/shared';

function PermitRows({ rows }: { rows: DataRow[] }) {
  if (rows.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No permitted wastewater facilities on file.
      </Text>
    );
  }

  return (
    <ScrollArea.Autosize mah={260}>
      <Table stickyHeader striped highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Facility</Table.Th>
            <Table.Th>Permittee</Table.Th>
            <Table.Th>Permit ID</Table.Th>
            <Table.Th>NPDES ID</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((r, i) => {
            const link = r['Permit Link'];
            const permitId = r['Permit ID'];
            return (
              <Table.Tr key={`${r['Facility Name']}-${permitId}-${i}`}>
                <Table.Td>{String(r['Facility Name'] ?? '—')}</Table.Td>
                <Table.Td>{String(r['Permittee Name'] ?? '—')}</Table.Td>
                <Table.Td>
                  {typeof link === 'string' && link ? (
                    <Anchor
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {String(permitId ?? '—')}
                    </Anchor>
                  ) : (
                    String(permitId ?? '—')
                  )}
                </Table.Td>
                <Table.Td>{String(r['NPDES Permit ID'] ?? '—')}</Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </ScrollArea.Autosize>
  );
}

export default function WastewaterPermitsTable() {
  const { timeseries, primary: p, comparison: c } = useReport();
  const primary = timeseries?.wastewaterPermits?.primary ?? [];
  const comparison = timeseries?.wastewaterPermits?.comparison ?? [];
  const hasComparison = comparison.length > 0;

  return (
    <ChartBlock title="Wastewater Treatment Facility Permits">
      <Text size="sm" fw={600} mb={4}>
        {p.name}
      </Text>
      <PermitRows rows={primary} />

      {hasComparison && (
        <>
          <Text size="sm" fw={600} mt="md" mb={4}>
            {c.name}
          </Text>
          <PermitRows rows={comparison} />
        </>
      )}
    </ChartBlock>
  );
}

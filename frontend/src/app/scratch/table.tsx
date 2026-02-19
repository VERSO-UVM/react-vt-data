import { Table, ScrollArea } from '@mantine/core';

const years = [...new Set(demoData.map((r) => r.year))].sort();

const lookup: Record<string, Record<number, string>> = {};
demoData.forEach((r) => {
  const key = `${r.Category}||${r.Variable}`;
  if (!lookup[key]) lookup[key] = {};
  lookup[key][r.year] = r.Value;
});

const rows = Object.entries(lookup).map(([key, vals]) => {
  const [category, variable] = key.split('||');
  return { category, variable, vals };
});

return (
  <ScrollArea>
    <Table striped withTableBorder withColumnBorders fz="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Category</Table.Th>
          <Table.Th>Variable</Table.Th>
          {years.map((y) => (
            <Table.Th key={y}>{y}</Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map(({ category, variable, vals }) => (
          <Table.Tr key={`${category}||${variable}`}>
            <Table.Td>{category}</Table.Td>
            <Table.Td>{variable}</Table.Td>
            {years.map((y) => (
              <Table.Td key={y}>
                {vals[y] ? `${parseFloat(vals[y]).toFixed(1)}%` : '—'}
              </Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  </ScrollArea>
);

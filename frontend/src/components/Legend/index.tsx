'use client';
import { Table } from '@mantine/core';

// One record from a dataset's colors table. The label column is named per
// dataset (e.g. "soil_suitability") so it is read positionally, but every
// legend is expected to carry a hex_color.
export type LegendRow = { hex_color: string } & Record<string, string>;

interface LegendTable {
  data: LegendRow[];
}

export default function MapLegend({ data = [] }: LegendTable) {
  if (data.length === 0) return null;

  const labelKey = Object.keys(data[0])[0];

  return (
    <div>
      <br></br>
      <h2 style={{ textAlign: 'center' }}>
        <b>Legend</b>
      </h2>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ paddingRight: '15px' }}>{labelKey}</Table.Th>
            <Table.Th>Color</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.map((row, index) => (
            <Table.Tr key={index}>
              <Table.Td style={{ paddingRight: '15px' }}>
                {row[labelKey]}
              </Table.Td>
              <Table.Td>
                <span
                  style={{
                    display: 'inline-block',
                    backgroundColor: row.hex_color,
                    width: '20px',
                    height: '10px',
                  }}
                ></span>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
}

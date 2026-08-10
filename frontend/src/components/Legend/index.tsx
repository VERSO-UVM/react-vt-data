'use client';
import React from 'react';
import { Table } from '@mantine/core';

interface LegendTable {
  data: string;
}

export default function MapLegend({ data = 'noDataGiven' }: LegendTable) {
  const split_data = data.split(/},\s*/);
  // const legend_string = JSON.parse(test_brackets);
  // console.log(test_brackets);
  // I am confused why this part above prints null
  // for (const [key, value] of Object.entries(legend_string)) {
  //   console.log(`${key}: ${value}`);
  // }
  // console.log(test)
  // same with this part
  // {
  //   test_brackets.map((items_in_jsons, index) =>
  //     console.log({ items_in_jsons }),
  //   );
  // }

  return (
    <div>
      <br></br>
      <h2 style={{ textAlign: 'center' }}>
        <b>Legend</b>
      </h2>
      <Table>
        <Table.Tr>
          <Table.Th style={{ paddingRight: '15px' }}>
            {split_data[0]
              ?.split(/:\s*/)[0]
              ?.replaceAll('\"', '')
              ?.replaceAll('\{', '')}{' '}
          </Table.Th>
          <Table.Th>Color</Table.Th>
        </Table.Tr>

        {split_data.map((items_in_jsons, index) => (
          <Table.Tr key={index}>
            <Table.Td style={{ paddingRight: '15px' }}>
              {items_in_jsons
                ?.split(/,\s*/)[0]
                ?.split(/:\s*/)[1]
                ?.replaceAll('"', '')}
            </Table.Td>
            <Table.Td>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: items_in_jsons
                    ?.split(/,\s*/)[1]
                    ?.split(/:\s*/)[1]
                    ?.replaceAll('"', ''),
                  width: '20px',
                  height: '10px',
                }}
              ></span>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table>
    </div>
  );
}

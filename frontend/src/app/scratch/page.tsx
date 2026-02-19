'use client';

import { useProfile } from '@/components/profile/profileStore';
import { ScrollArea, Table, Title } from '@mantine/core';

import { useApplyFilters } from '@/components/FilterUI/useApplyFilters';
import { useEffect, useState } from 'react';
import { ChartDef, chartDefs } from '@/components/Charts/configs/ChartDefs';
import { Location } from '@/components/profile/profileStore';

export default function scratch() {
  const { myLocation, comparison } = useProfile();
  const applyFilters = useApplyFilters();
  const [data, setData] = useState<any[]>([]);

  const formatName = (location: Location) => {
    console.log(location.name);
    return `${location.name}`;
  };

  useEffect(() => {
    if (!myLocation?.name) return;
    applyFilters(
      'http://localhost:6767/load/acs5-db/tidy/demographics',
      {},
      undefined,
      undefined,
      (data) => {
        setData(data);
      },
      { name: formatName(myLocation), year_min: 2010, year_max: 2023 },
    );
  }, [myLocation]);
  console.log(data[0]);
  // Build lookups
  const years = Array.from(new Set(data.map((r) => r.year))).sort();
  const variables = Array.from(new Set(data.map((r) => r.Variable)));

  return (
    <ScrollArea>
      <Title order={3} mb="md">
        Demographic Percentage Overview for {myLocation?.name}
      </Title>
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
}

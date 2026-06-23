'use client';
import { Center, Title } from '@mantine/core';
import { useState } from 'react';
import { BASE_API_URL } from '@/config';
import FilterContainer from '@/components/FilterUI/Filter_wrap';
import { FilterProvider } from '@/components/FilterUI/FilterContext';

export default function scratch() {
  const [data, setData] = useState<any>(null);

  return (
    <>
      <Center pt="xl" mb="md">
        <Title order={2}>Zoning Rule Selection</Title>
      </Center>
      <FilterProvider>
        <FilterContainer
          apiURL={`${BASE_API_URL}/filters/tree?source=cdc_places`}
          dataURL={''}
          onData={(fetchedData) => setData(fetchedData)}
        />
      </FilterProvider>
    </>
  );
}

'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import VTMap from '@/components/mapping';
import { Container, filterProps } from '@mantine/core';
import { BASE_API_URL } from '@/config';
import FilterContainer from '@/components/FilterUI/Filter_wrap';
import { useFilter } from '@/components/FilterUI/FilterContext';

// at some point this function will need to be replaced by api, etc.
function getDataFromSlug(slug: string) {
  return fetch(`/data/${slug}.json`).then((res) => res.json());
}

function get_from_py(slug: string, filter: string, local_host: string) {
  return fetch(`$local_host/data/?slug=slug?filter=$filter`);
}

export default function MappingContent() {
  const params = useParams();
  const slug = params?.slug as string | undefined;
  const [data, setData] = useState<any>(null);
  const { format } = useFilter();

  useEffect(() => {
    if (!slug) return;
    getDataFromSlug(slug).then(setData);
  }, [slug]);

  const handleData = (data: any) => {};

  return (
    <>
      <Container size="xl" style={{ height: '80vh', padding: 0, margin: 0 }}>
        <FilterContainer
          apiURL={`${BASE_API_URL}/get/load/mapping/${slug}/filters`}
          dataURL={`${BASE_API_URL}/post/load/mapping/${slug}`}
          onData={(fetchedData) => {
            console.log('fetched Data', fetchedData);
            console.log(format);
            setData({ fetchedData });
            console.log(' Data', data);

            handleData(fetchedData);
            // console.log(data);
            data.features.forEach((f) => {
              console.log(f.geometry); // should not be undefined
            });
          }}
        />
        <VTMap geojson={data} />
      </Container>
      <br></br>
      <br></br>
      <br></br>
      <br></br>
    </>
  );
}

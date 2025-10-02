'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import VTMap from '@/components/mapping/Mapping';
import { Container } from '@mantine/core';

// at some point this function will need to be replaced by api, etc.
function getDataFromSlug(slug: string) {
  return fetch(`/data/${slug}.json`).then((res) => res.json());
}

function get_from_py(slug: string, filter: string, local_host: string) {
  return fetch(`$local_host/data/?slug=slug?filter=$filter`);
}

export default function MappingPage() {
  const params = useParams();
  const slug = params?.slug as string | undefined; // Type assertion
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!slug) return;
    getDataFromSlug(slug).then(setData);
  }, [slug]);

  return (
    <Container>
      <VTMap geojson={data} />
    </Container>
  );
}

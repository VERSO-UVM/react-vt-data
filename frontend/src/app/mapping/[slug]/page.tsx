'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import VTMap from '@/components/mapping/Mapping';
import { Container } from '@mantine/core';

function getDataFromSlug(slug: string) {
  return fetch(`/data/${slug}.json`).then((res) => res.json());
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

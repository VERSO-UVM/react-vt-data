import React from 'react';
import { Title, Center, Container } from '@mantine/core';
import ExploratoryMappingGrid from '@/components/Grids/ExploratoryMappingOptions';

export const links = [
  { link: '/mapping/zoning', label: 'Zoning' },
  { link: '/mapping/soil-suitability', label: 'Soil Suitability' },
  { link: '/mapping/flood-legal', label: 'Flood Insurance' },
];

export default function BaseMappingPage() {
  return (
    <>
      <Center pt="xl" mb="xl">
        <Title order={2}>Exploratory Mapping</Title>
      </Center>

      <Container>
        <ExploratoryMappingGrid links={links} />
      </Container>

      <span style={{ display: 'block', height: 150 }}></span>
    </>
  );
}

/*
export default function BaseMappingPage() {
  const items = links.map((link) => {
    return (
      <Link href={link.link} key={link.link}>
        <Button style={{ display: 'flex', alignItems: 'center' }}>
          <span>{link.label}</span>
        </Button>
      </Link>
    );
  });

  return (
    <>
      <Title> Exploratory Mapping </Title>
      <Container>
        <Group>{items}</Group>
      </Container>
    </>
  );
}
*/

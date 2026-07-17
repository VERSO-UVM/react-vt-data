'use client';

import React from 'react';
import { Title, Center, Container, Text } from '@mantine/core';
import ExploratoryMappingGrid from '@/components/Grids/ExploratoryMappingOptions';

export const links = [
  {
    link: '/mapping/zoning',
    label: 'Zoning',
    description:
      'Explore zoning classifications by town to understand residential, commercial, agricultural, and mixed-use regulations across Vermont.',
    badges: ['Land Use', 'Municipal'],
  },
  {
    link: '/mapping/soil-suitability',
    label: 'Soil Suitability',
    description:
      'Assess soil limitations and suitability for on-site wastewater systems and rural development.',
    badges: ['NRCS', 'Septic'],
  },
  {
    link: '/mapping/treatment-facilities',
    label: 'Wastewater Treatment Facilities',
    description:
      'Explore locations of current public wastewater treatment facilities and their capacities.',
    badges: ['ANR', 'Wastewater'],
  },
  {
    link: '/mapping/service-areas',
    label: 'Wastewater System Service Areas',
    description:
      'Examine current service areas of public wastewater systems.',
    badges: ['ANR', 'Wastewater'],
  },
  {
    link: '/mapping/flood-legal',
    label: 'Flood Insurance',
    description:
      'Identify FEMA flood hazard areas and understand development and insurance implications.',
    badges: ['FEMA', 'Flood Risk'],
  },
];

export default function BaseMappingPage() {
  return (
    <>
      <Center py={60}>
        <Container size="lg">
          <Title order={1} ta="center">
            Vermont Mapping Explorer
          </Title>

          <Text ta="center" c="dimmed" size="lg" maw={750} mx="auto" mt="md">
            Explore statewide zoning regulations, environmental constraints, and
            flood hazards through interactive geospatial datasets.
          </Text>
        </Container>
      </Center>

      <Container size="lg">
        <ExploratoryMappingGrid links={links} />
      </Container>

      <div style={{ height: 100 }} />
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

import React from 'react';
import { Title, Group, Container, Button } from '@mantine/core';
import Link from 'next/link';

const links = [
  { link: '/mapping/zoning', label: 'Zoning' },
  { link: '/mapping/soil-suitability', label: 'Soil Suitability' },
  { link: '/mapping/flood-legal', label: 'Flood Insurance' },
];

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

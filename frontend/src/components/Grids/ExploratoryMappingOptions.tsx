'use client';

import React from 'react';
import { Grid, Card, Button, Text, Group, Box } from '@mantine/core';
import Image from 'next/image';
import Link from 'next/link';

interface LinkItem {
  link: string;
  label: string;
}

interface ExploratoryMappingGridProps {
  links: LinkItem[];
}

function standardizeLabel(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

function MappingCard({ item }: { item: LinkItem }) {
  const fileName = `${standardizeLabel(item.label)}.png`;
  const src = `/images/mapping-icons/${fileName}`;

  return (
    <Card
      shadow="sm"
      radius="md"
      withBorder
      style={{ height: 300, display: 'flex', flexDirection: 'column' }}
    >
      <h1 style={{ textAlign: 'center', marginTop: 10, fontWeight: 300 }}>
        {item.label}
      </h1>
      <Card.Section
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Box
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            src={src}
            alt={item.label}
            width={200}
            height={140}
            style={{
              objectFit: 'contain',
              maxHeight: '100%',
              maxWidth: '100%',
            }}
          />
        </Box>
      </Card.Section>

      <Text
        style={{
          flexGrow: 0,
          textAlign: 'center',
          marginTop: 8,
          marginBottom: 4,
          color: '#555',
        }}
      >
        Brief description or summary about offerings/use cases.
      </Text>

      <Box style={{ padding: 12 }}>
        <Group mb="xs"></Group>
        <Button component={Link} href={item.link} fullWidth variant="filled">
          Explore {item.label}
        </Button>
      </Box>
    </Card>
  );
}

export default function ExploratoryMappingGrid({
  links,
}: ExploratoryMappingGridProps) {
  if (!links || links.length === 0) return null;

  return (
    <Grid gutter="md">
      {links.map((item) => (
        <Grid.Col key={item.link} span={{ base: 12, sm: 6, md: 4 }}>
          <MappingCard item={item} />
        </Grid.Col>
      ))}
    </Grid>
  );
}

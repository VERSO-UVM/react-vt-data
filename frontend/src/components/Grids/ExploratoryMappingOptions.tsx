'use client';

import React from 'react';
import Link from 'next/link';

import {
  Grid,
  Card,
  Button,
  Text,
  Box,
  Badge,
  Group,
  ThemeIcon,
} from '@mantine/core';

import {
  IconMap2,
  IconDroplet,
  IconShield,
} from '@tabler/icons-react';

interface LinkItem {
  link: string;
  label: string;
  description?: string;
  badges?: string[];
}

interface ExploratoryMappingGridProps {
  links: LinkItem[];
}

function getIcon(label: string) {
  switch (label) {
    case 'Zoning':
      return IconMap2;

    case 'Soil Suitability':
      return IconDroplet;

    case 'Flood Insurance':
      return IconShield;

    default:
      return IconMap2;
  }
}

function MappingCard({ item }: { item: LinkItem }) {
  const Icon = getIcon(item.label);

  return (
    <Card
      component={Link}
      href={item.link}
      withBorder
      radius="lg"
      shadow="sm"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow =
          'var(--mantine-shadow-lg)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <Box
        py="xl"
        style={{
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <ThemeIcon size={90} radius="xl" variant="light">
          <Icon size={48} />
        </ThemeIcon>
      </Box>

      <Text fw={600} size="xl" ta="center">
        {item.label}
      </Text>

      <Group justify="center" mt="sm" mb="md">
        {item.badges?.map((badge) => (
          <Badge key={badge} variant="light">
            {badge}
          </Badge>
        ))}
      </Group>

      <Text
        c="dimmed"
        ta="center"
        style={{
          flexGrow: 1,
        }}
      >
        {item.description}
      </Text>

      <Button
        component={Link}
        href={item.link}
        fullWidth
        mt="xl"
        radius="md"
      >
        Explore {item.label}
      </Button>
    </Card>
  );
}

export default function ExploratoryMappingGrid({
  links,
}: ExploratoryMappingGridProps) {
  if (!links?.length) return null;

  return (
    <Grid justify="center" gutter="xl">
      {links.map((item) => (
        <Grid.Col
          key={item.link}
          span={{ base: 12, sm: 6, md: 4 }}
        >
          <MappingCard item={item} />
        </Grid.Col>
      ))}
    </Grid>
  );
}
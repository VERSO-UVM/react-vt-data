'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Box,
  Card,
  Center,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import Link from 'next/link';
import {
  ArrowRightIcon,
  BellIcon,
  CalculatorIcon,
  DatabaseIcon,
  FileTextIcon,
  GithubLogoIcon,
  GraduationCapIcon,
} from '@phosphor-icons/react';
import { COLORS, FONTS } from '@/app/theme';

type Resource = {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  external?: boolean;
};

const RESOURCES: Resource[] = [
  {
    href: '/resources/tutorials',
    label: 'Tutorials',
    description:
      'Step-by-step materials for exploring, analyzing, and exporting Vermont data.',
    icon: GraduationCapIcon,
  },
  {
    href: '/resources/white-papers',
    label: 'White Papers',
    description:
      'Research and writing from our team on data access, the technical work behind the platform, and rural Vermont.',
    icon: FileTextIcon,
  },
  {
    href: '/resources/data-sources',
    label: 'Data Sources',
    description:
      'Browse the datasets, sources, variable descriptions, and other metadata.',
    icon: DatabaseIcon,
  },
  {
    href: '/resources/announcements',
    label: 'Announcements',
    description:
      'New services, features, datasets, and updates to the Vermont Data Collaborative website.',
    icon: BellIcon,
  },
  {
    href: 'https://github.com',
    label: 'GitHub',
    description:
      'View the source code, inspect how a number was calculated, or contribute to the platform.',
    icon: GithubLogoIcon,
    external: true,
  },
  // {
  //   href: '/resources/benefits-estimator',
  //   label: 'Vermont Benefits Estimator',
  //   description:
  //     'Estimate eligibility for Three Squares VT (SNAP), Medicaid, Dr. Dynasaur, and Child Care Financial Assistance based on household income and composition.',
  //   icon: CalculatorIcon,
  //   badge: 'Beta',
  // },
];

function ResourceCard({ resource }: { resource: Resource }) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = resource.icon;

  const cardContent = (
    <>
      <Group justify="space-between" align="flex-start" mb="md">
        <ThemeIcon
          size={42}
          radius="md"
          variant="light"
          style={{
            backgroundColor: 'rgba(27, 58, 47, 0.1)',
            color: COLORS.spruce,
          }}
        >
          <Icon size={22} weight="duotone" />
        </ThemeIcon>
      </Group>

      <Group justify="space-between" align="center">
        <Text
          fw={600}
          style={{
            fontFamily: FONTS.display,
            fontSize: 18,
            color: COLORS.ink,
          }}
        >
          {resource.label}
        </Text>
        <ActionIcon variant="transparent">
          <ArrowRightIcon
            size={18}
            style={{
              color: COLORS.amber,
              transition: 'transform 200ms ease',
              transform: isHovered ? 'rotate(-45deg)' : 'rotate(0deg)',
            }}
          />
        </ActionIcon>
      </Group>

      <Text size="sm" c="dimmed" mt={6} style={{ lineHeight: 1.6 }}>
        {resource.description}
      </Text>
    </>
  );

  const cardStyle = {
    textDecoration: 'none',
    color: 'inherit',
    borderColor: isHovered ? COLORS.spruce : COLORS.line,
    background: COLORS.birch,
    transition:
      'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
    transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
    boxShadow: isHovered
      ? '0 10px 20px rgba(0, 0, 0, 0.05), 0 3px 6px rgba(0, 0, 0, 0.05)'
      : 'none',
  } as const;

  const commonProps = {
    withBorder: true,
    radius: 'md' as const,
    p: 'lg' as const,
    style: cardStyle,
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  };

  if (resource.external) {
    return (
      <Card
        component="a"
        href={resource.href}
        target="_blank"
        rel="noopener noreferrer"
        {...commonProps}
      >
        {cardContent}
      </Card>
    );
  }

  return (
    <Card component={Link} href={resource.href} {...commonProps}>
      {cardContent}
    </Card>
  );
}

export default function ResourcesPage() {
  return (
    <Stack gap="xl">
      <Center pt="xl" mb="xl">
        <Stack align="center" gap={10}>
          <Box style={{ width: 40, height: 3, background: COLORS.spruce }} />
          <Title
            order={1}
            ta="center"
            style={{
              fontFamily: FONTS.display,
              color: COLORS.spruceDeep,
              fontSize: 'clamp(2.2rem, 3vw, 3.2rem)',
              letterSpacing: '-0.02em',
            }}
          >
            Resources
          </Title>
        </Stack>
      </Center>

      <SimpleGrid cols={{ base: 1, sm: 2 }} maw={900} mx="auto" px="md" pb="xl">
        {RESOURCES.map((resource) => (
          <ResourceCard key={resource.href} resource={resource} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

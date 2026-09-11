'use client';

import {
  Badge,
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
  GraduationCapIcon,
} from '@phosphor-icons/react';
import { COLORS, FONTS } from '@/app/theme';

type Resource = {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  comingSoon?: boolean;
};

const RESOURCES: Resource[] = [
  {
    href: '/resources/benefits-estimator',
    label: 'Vermont Benefits Estimator',
    description:
      'Estimate eligibility for Three Squares VT (SNAP), Medicaid, ' +
      'Dr. Dynasaur, and Child Care Financial Assistance based on household ' +
      'income and composition.',
    icon: CalculatorIcon,
    badge: 'Beta',
  },
  {
    href: '/resources/data-sources',
    label: 'Data Sources',
    description:
      'Browse the datasets, sources, variable descriptions, and other metadata.',
    icon: DatabaseIcon,
  },
  {
    href: '/resources/tutorial',
    label: 'Tutorials',
    description:
      'Step-by-step materials for exploring, analyzing, and exporting ' +
      'Vermont data.',
    icon: GraduationCapIcon,
    comingSoon: true,
  },
  {
    href: '/resources/announcements',
    label: 'Announcements',
    description:
      'New services, features, datasets, and updates to the Vermont Data ' +
      'Collaborative website.',
    icon: BellIcon,
    comingSoon: true,
  },
];

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
        {RESOURCES.map((resource) => {
          const Icon = resource.icon;

          const cardContent = (
            <>
              <Group justify="space-between" align="flex-start" mb="md">
                <ThemeIcon
                  size={42}
                  radius="md"
                  variant="light"
                  style={{
                    backgroundColor: resource.comingSoon
                      ? COLORS.birchDim
                      : 'rgba(27, 58, 47, 0.1)',
                    color: resource.comingSoon ? COLORS.slate : COLORS.spruce,
                  }}
                >
                  <Icon size={22} weight="duotone" />
                </ThemeIcon>

                {resource.comingSoon ? (
                  <Badge
                    variant="light"
                    style={{
                      backgroundColor: COLORS.birchDim,
                      color: COLORS.slate,
                    }}
                  >
                    Coming Soon
                  </Badge>
                ) : (
                  resource.badge && (
                    <Badge
                      variant="light"
                      style={{
                        backgroundColor: 'rgba(221, 154, 47, 0.15)',
                        color: COLORS.amber,
                      }}
                    >
                      {resource.badge}
                    </Badge>
                  )
                )}
              </Group>

              <Group justify="space-between" align="center">
                <Text
                  fw={600}
                  style={{
                    fontFamily: FONTS.display,
                    fontSize: 18,
                    color: resource.comingSoon ? COLORS.slate : COLORS.ink,
                  }}
                >
                  {resource.label}
                </Text>

                {!resource.comingSoon && (
                  <ArrowRightIcon size={18} style={{ color: COLORS.amber }} />
                )}
              </Group>

              <Text size="sm" c="dimmed" mt={6} style={{ lineHeight: 1.6 }}>
                {resource.description}
              </Text>
            </>
          );

          if (resource.comingSoon) {
            return (
              <Box
                key={resource.href}
                style={{
                  border: `1px dashed ${COLORS.line}`,
                  borderRadius: 12,
                  padding: 'var(--mantine-spacing-lg)',
                  background: 'transparent',
                  opacity: 0.7,
                }}
              >
                {cardContent}
              </Box>
            );
          }

          return (
            <Card
              key={resource.href}
              component={Link}
              href={resource.href}
              withBorder
              radius="md"
              p="lg"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                borderColor: COLORS.line,
                background: COLORS.birch,
                transition: 'box-shadow 200ms ease, border-color 200ms ease',
              }}
            >
              {cardContent}
            </Card>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}

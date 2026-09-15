'use client';

import {
  Badge,
  Box,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import * as motion from 'motion/react-client';
import {
  ArrowsLeftRightIcon,
  ChartBarIcon,
  CompassIcon,
  DatabaseIcon,
  FileArrowDownIcon,
  GraduationCapIcon,
  MapTrifoldIcon,
} from '@phosphor-icons/react';
import { COLORS, FONTS } from '@/app/theme';

// -----------------------------------------------------------------------------
// Tutorial topics — each becomes a tutorialCard once the underlying content
// exists. All are disabled for now; enable a card by adding its `href` and
// flipping `comingSoon` to false once the tutorial is written.
// -----------------------------------------------------------------------------

type TutorialCard = {
  title: string;
  description: string;
  icon: React.ElementType;
  comingSoon: boolean;
};

const TUTORIALS: TutorialCard[] = [
  {
    title: 'Getting Started',
    description: 'A first guided tour of our platform.',
    icon: CompassIcon,
    comingSoon: true,
  },
  {
    title: 'Exploring the Map',
    description:
      'How to use layers, filters, and explore relationships across zoning, flood, and infrastructure maps.',
    icon: MapTrifoldIcon,
    comingSoon: true,
  },
  {
    title: 'Using the Data Gallery',
    description:
      'Curate descriptive charts and tables from various data sources.',
    icon: ChartBarIcon,
    comingSoon: true,
  },
  {
    title: 'Comparing Communities',
    description:
      'Put two areas side-by-side using consistent measures and indicators.',
    icon: ArrowsLeftRightIcon,
    comingSoon: true,
  },
  {
    title: 'Exporting & Reports',
    description:
      'Utilizing both the working report and pre-generated profiles.',
    icon: FileArrowDownIcon,
    comingSoon: true,
  },
  {
    title: 'Data Sources & Benefits Estimator',
    description:
      'Learn about dataset metadata and estimate eligibility for state benefit programs.',
    icon: DatabaseIcon,
    comingSoon: true,
  },
];

// -----------------------------------------------------------------------------
// Tutorial card
// -----------------------------------------------------------------------------

function TutorialCardItem({
  tutorial,
  index,
}: {
  tutorial: TutorialCard;
  index: number;
}) {
  const Icon = tutorial.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration: 0.5,
        delay: index * 0.05,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Box
        style={{
          height: '100%',
          border: `1px dashed ${COLORS.line}`,
          borderRadius: 14,
          padding: 'var(--mantine-spacing-xl)',
          background: 'transparent',
          opacity: 0.65,
          cursor: 'not-allowed',
        }}
      >
        <Group justify="space-between" align="flex-start" mb="md">
          <ThemeIcon
            size={48}
            radius="md"
            variant="light"
            style={{
              backgroundColor: COLORS.birchDim,
              color: COLORS.slate,
            }}
          >
            <Icon size={24} weight="duotone" />
          </ThemeIcon>

          <Badge
            variant="light"
            style={{
              backgroundColor: COLORS.birchDim,
              color: COLORS.slate,
            }}
          >
            Coming Soon
          </Badge>
        </Group>

        <Title
          order={3}
          style={{
            fontFamily: FONTS.display,
            fontSize: 20,
            color: COLORS.slate,
          }}
        >
          {tutorial.title}
        </Title>

        <Text
          size="sm"
          mt={6}
          style={{ lineHeight: 1.65, color: COLORS.slate, opacity: 0.85 }}
        >
          {tutorial.description}
        </Text>
      </Box>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function TutorialsPage() {
  return (
    <Box style={{ backgroundColor: COLORS.birch, minHeight: '100vh' }}>
      <Box
        style={{
          background: `linear-gradient(145deg, ${COLORS.spruceDeep} 0%, ${COLORS.spruce} 100%)`,
        }}
        pt={{ base: 55, sm: 75 }}
        pb={{ base: 45, sm: 60 }}
      >
        <Container size="xl">
          <Group gap={10} mb={20}>
            <Box
              style={{ width: 28, height: 1, background: COLORS.amberSoft }}
            />
            <Text
              style={{
                fontFamily: FONTS.mono,
                fontSize: 12,
                letterSpacing: '0.14em',
                color: COLORS.amberSoft,
              }}
            >
              LEARN THE PLATFORM
            </Text>
          </Group>

          <Group gap="md" align="flex-start">
            <ThemeIcon
              size={54}
              radius="md"
              variant="light"
              style={{
                backgroundColor: 'rgba(246,245,239,.1)',
                color: COLORS.amberSoft,
              }}
            >
              <GraduationCapIcon size={28} weight="duotone" />
            </ThemeIcon>

            <Stack gap={4}>
              <Title
                order={1}
                style={{
                  fontFamily: FONTS.display,
                  color: COLORS.birch,
                  fontSize: 'clamp(2.4rem, 5vw, 4rem)',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                Tutorials
              </Title>
              <Text
                maw={620}
                style={{
                  color: 'rgba(246,245,239,.72)',
                  lineHeight: 1.7,
                }}
              >
                Step-by-step walkthroughs for exploring, analyzing, and
                exporting Vermont data. We&apos;re writing these now — check
                back soon.
              </Text>
            </Stack>
          </Group>
        </Container>
      </Box>

      <Container size="xl" py={{ base: 50, sm: 70 }}>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {TUTORIALS.map((tutorial, index) => (
            <TutorialCardItem
              key={tutorial.title}
              tutorial={tutorial}
              index={index}
            />
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}

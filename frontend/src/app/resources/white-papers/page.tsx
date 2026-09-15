'use client';

import {
  Badge,
  Box,
  Card,
  Container,
  Group,
  Image,
  SimpleGrid,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import * as motion from 'motion/react-client';
import { FileTextIcon } from '@phosphor-icons/react';

import { COLORS, FONTS } from '@/app/theme';
import { WHITE_PAPERS, WhitePaper } from './articles';

// -----------------------------------------------------------------------------
// Paper card
// -----------------------------------------------------------------------------

function PaperCard({ paper, index }: { paper: WhitePaper; index: number }) {
  const cardContent = (
    <>
      <Group justify="space-between" align="flex-start" mb="md">
        <ThemeIcon
          size={48}
          radius="md"
          variant="light"
          style={{
            backgroundColor: paper.published
              ? 'rgba(27, 58, 47, 0.1)'
              : COLORS.birchDim,
            color: paper.published ? COLORS.spruce : COLORS.slate,
          }}
        >
          <FileTextIcon size={24} weight="duotone" />
        </ThemeIcon>

        <Badge
          variant="light"
          style={
            paper.published
              ? {
                  backgroundColor: COLORS.birchDim,
                  color: COLORS.slate,
                }
              : {
                  backgroundColor: COLORS.birchDim,
                  color: COLORS.slate,
                }
          }
        >
          {paper.published ? paper.date : 'Coming Soon'}
        </Badge>
      </Group>

      <Text
        style={{
          fontFamily: FONTS.mono,
          fontSize: 11,
          color: COLORS.slate,
          textTransform: 'uppercase',
          letterSpacing: '.08em',
        }}
      >
        Paper {String(index + 1).padStart(2, '0')}
      </Text>

      <Title
        order={3}
        mt={4}
        style={{
          fontFamily: FONTS.display,
          fontSize: 22,
          color: paper.published ? COLORS.ink : COLORS.slate,
        }}
      >
        {paper.title}
      </Title>

      <Group gap="xs">
        <Image
          src={paper.author.image}
          alt={paper.author.name}
          radius="xl"
          h={25}
          w={25}
          fit="cover"
          fallbackSrc="https://placehold.co/400x400?text=No+Image"
          style={{ backgroundColor: '#f1f3f5' }}
        />

        <Text
          size="sm"
          mt={8}
          style={{
            lineHeight: 1.5,
            color: COLORS.slate,
            opacity: paper.published ? 1 : 0.85,
          }}
        >
          {paper.author.name}
        </Text>
      </Group>

      <Text
        size="sm"
        mt={8}
        style={{
          lineHeight: 1.65,
          color: COLORS.slate,
          opacity: paper.published ? 1 : 0.85,
        }}
      >
        {paper.summary}
      </Text>
    </>
  );

  // Coming soon papers aren't clickable
  if (!paper.published) {
    return (
      <Box
        style={{
          height: '100%',
          border: `1px dashed ${COLORS.line}`,
          borderRadius: 14,
          padding: 'var(--mantine-spacing-xl)',
          opacity: 0.75,
        }}
      >
        {cardContent}
      </Box>
    );
  }

  // Published papers link to the dynamic article page
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18 }}
      style={{ height: '100%' }}
    >
      <Card
        component="a"
        href={`/resources/white-papers/${paper.slug}`}
        withBorder
        radius="lg"
        p="xl"
        h="100%"
        style={{
          textDecoration: 'none',
          color: 'inherit',
          borderColor: COLORS.line,
          background: COLORS.birch,
        }}
      >
        {cardContent}
      </Card>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function WhitePapersPage() {
  return (
    <Box
      style={{
        backgroundColor: COLORS.birch,
        minHeight: '100vh',
      }}
    >
      {/* Hero */}
      <Box
        style={{
          background: `linear-gradient(
            145deg,
            ${COLORS.spruceDeep} 0%,
            ${COLORS.spruce} 100%
          )`,
        }}
        pt={{ base: 55, sm: 75 }}
        pb={{ base: 45, sm: 60 }}
      >
        <Container size="xl">
          <Group gap={10} mb={20}>
            <Box
              style={{
                width: 28,
                height: 1,
                background: COLORS.amberSoft,
              }}
            />

            <Text
              style={{
                fontFamily: FONTS.mono,
                fontSize: 12,
                letterSpacing: '0.14em',
                color: COLORS.amberSoft,
              }}
            >
              RESEARCH & WRITING
            </Text>
          </Group>

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
            White Papers
          </Title>

          <Text
            mt="md"
            maw={650}
            style={{
              color: 'rgba(246,245,239,.72)',
              lineHeight: 1.7,
            }}
          >
            Writing from our team on data access, the technical work behind the
            platform, and the broader questions we&apos;re exploring for rural
            Vermont.
          </Text>
        </Container>
      </Box>

      {/* Papers */}
      <Container size="xl" py={{ base: 50, sm: 70 }}>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {WHITE_PAPERS.map((paper, index) => (
            <PaperCard key={paper.slug} paper={paper} index={index} />
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}

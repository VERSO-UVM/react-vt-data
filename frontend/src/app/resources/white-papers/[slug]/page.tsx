import { notFound } from 'next/navigation';
import {
  Badge,
  Box,
  Container,
  Group,
  Image,
  Text,
  Title,
} from '@mantine/core';

import { COLORS, FONTS } from '@/app/theme';
import { WHITE_PAPERS } from '../articles';
import { loadWhitePaperHtml } from '../content/loadWhitePaperContent';
import styles from './content.module.css';

export function generateStaticParams() {
  return WHITE_PAPERS.filter((paper) => paper.published).map((paper) => ({
    slug: paper.slug,
  }));
}

export default async function WhitePaperPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const paper = WHITE_PAPERS.find((paper) => paper.slug === slug);
  if (!paper || !paper.published) {
    notFound();
  }
  const contentHtml = await loadWhitePaperHtml(paper.slug);
  return (
    <Box
      style={{
        backgroundColor: COLORS.birch,
        minHeight: '100vh',
      }}
    >
      <Box
        pt={{ base: 55, sm: 80 }}
        pb={{ base: 50, sm: 65 }}
        style={{
          background: `linear-gradient(
            145deg,
            ${COLORS.spruceDeep} 0%,
            ${COLORS.spruce} 100%
          )`,
        }}
      >
        <Container size="md">
          <Text
            style={{
              fontFamily: FONTS.mono,
              fontSize: 11,
              letterSpacing: '0.14em',
              color: COLORS.amberSoft,
              textTransform: 'uppercase',
            }}
          >
            White Paper
          </Text>

          <Title
            order={1}
            mt="sm"
            style={{
              fontFamily: FONTS.display,
              color: COLORS.birch,
              fontSize: 'clamp(2.4rem, 6vw, 4.5rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
            }}
          >
            {paper.title}
          </Title>

          <Text
            mt="lg"
            maw={700}
            style={{
              color: 'rgba(246,245,239,.72)',
              fontSize: 18,
              lineHeight: 1.7,
            }}
          >
            {paper.summary}
          </Text>

          <Group mt="xl" gap="sm" mb={-30}>
            <Image
              src={paper.author.image}
              alt={paper.author.name}
              radius="xl"
              h={50}
              w={50}
              fit="cover"
              fallbackSrc="https://placehold.co/400x400?text=No+Image"
            />

            <Text
              style={{
                color: 'rgba(246,245,239,.8)',
                fontSize: 14,
              }}
            >
              {paper.author.name}
            </Text>
            <Badge
              ml={600}
              size="md"
              style={{
                backgroundColor: 'transparent',
                color: COLORS.birchDim,
              }}
            >
              {paper.date}
            </Badge>
          </Group>
        </Container>
      </Box>

      <Container size="md" py={{ base: 50, sm: 75 }}>
        <Box
          className={styles.content}
          style={{
            fontSize: 17,
            lineHeight: 1.8,
            color: COLORS.ink,
          }}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </Container>
    </Box>
  );
}

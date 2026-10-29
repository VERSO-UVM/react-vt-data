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
  Title,
} from '@mantine/core';
import * as motion from 'motion/react-client';

import { COLORS, FONTS } from '@/app/theme';
import { BLOGS, Blog } from './blogs';

// -----------------------------------------------------------------------------
// Blog card
// -----------------------------------------------------------------------------

function BlogCard({ blog }: { blog: Blog }) {
  const cardContent = (
    <>
      <Group justify="space-between" align="center" mb="md">
        <Text
          style={{
            fontFamily: FONTS.mono,
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: COLORS.spruce,
          }}
        >
          Source: {blog.source}
        </Text>
      </Group>

      <Title
        order={3}
        style={{
          fontFamily: FONTS.display,
          color: COLORS.ink,
          fontSize: 21,
          lineHeight: 1.35,
        }}
      >
        {blog.title}
      </Title>

      <Text size="sm" mt="sm" style={{ lineHeight: 1.65, color: COLORS.slate }}>
        {blog.summary}
      </Text>

      <Group gap="xs" mt="lg">
        <Image
          src={blog.author.image}
          alt={blog.author.name}
          radius="xl"
          h={25}
          w={25}
          fit="cover"
          fallbackSrc="https://placehold.co/400x400?text=No+Image"
        />
        <Text size="sm" style={{ color: COLORS.slate }}>
          {blog.author.name}
        </Text>
      </Group>
    </>
  );

  // Unpublished posts aren't clickable
  if (!blog.published) {
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

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18 }}
      style={{ height: '100%' }}
    >
      <Card
        component="a"
        href={`/resources/data-blog/${blog.slug}`}
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

export default function DataBlogsPage() {
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
              DATA STORIES
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
            Data Blog
          </Title>

          <Text
            mt="md"
            maw={650}
            style={{
              color: 'rgba(246,245,239,.72)',
              lineHeight: 1.7,
            }}
          >
            Data-driven posts that dig into available data here on the platform.
            What the numbers say about housing, health, and land in state areas,
            and where to explore the data yourself on the platform.
          </Text>
        </Container>
      </Box>

      {/* Posts */}
      <Container size="xl" py={{ base: 50, sm: 70 }}>
        <Text
          mb="lg"
          style={{
            fontFamily: FONTS.mono,
            fontSize: 12,
            letterSpacing: '0.12em',
            color: COLORS.slate,
          }}
        >
          FIRST POSTS ARRIVING THIS WINTER
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {BLOGS.map((blog) => (
            <BlogCard key={blog.slug} blog={blog} />
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}

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
import { BLOGS } from '../blogs';
import {
  loadBlogCharts,
  loadBlogHtml,
  splitOnCharts,
} from '../content/loadBlogContent';
import { BlogChart } from './BlogChart';
import styles from './content.module.css';

export function generateStaticParams() {
  return BLOGS.filter((blog) => blog.published).map((blog) => ({
    slug: blog.slug,
  }));
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blog = BLOGS.find((blog) => blog.slug === slug);

  if (!blog || !blog.published) {
    notFound();
  }

  const [contentHtml, charts] = await Promise.all([
    loadBlogHtml(blog.slug),
    loadBlogCharts(blog.slug),
  ]);

  return (
    <Box
      style={{
        backgroundColor: '#F2F1EA',
        minHeight: '100vh',
      }}
    >
      {/* Article hero */}
      <Box
        pt={{ base: 55, sm: 85 }}
        pb={{ base: 55, sm: 75 }}
        style={{
          background: `linear-gradient(
            145deg,
            ${COLORS.spruceDeep} 0%,
            ${COLORS.spruce} 100%
          )`,
        }}
      >
        <Container size="md">
          {/* Eyebrow */}
          <Text
            style={{
              fontFamily: FONTS.mono,
              fontSize: 11,
              letterSpacing: '0.14em',
              color: COLORS.amberSoft,
              textTransform: 'uppercase',
            }}
          >
            Data Blog · {blog.source}
          </Text>

          {/* Tags */}
          <Group gap={6} mt="lg">
            {blog.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                color={COLORS.amberSoft}
                radius="sm"
                styles={{
                  root: {
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: COLORS.birch,
                  },
                }}
              >
                {tag}
              </Badge>
            ))}
          </Group>

          {/* Title */}
          <Title
            order={1}
            mt="lg"
            maw={850}
            style={{
              fontFamily: FONTS.display,
              color: COLORS.birch,
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              lineHeight: 1.08,
              letterSpacing: '-0.035em',
            }}
          >
            {blog.title}
          </Title>

          {/* Summary */}
          <Text
            mt="lg"
            maw={680}
            style={{
              color: 'rgba(246,245,239,.8)',
              fontSize: 18,
              lineHeight: 1.8,
            }}
          >
            {blog.summary}
          </Text>

          {/* Author and date */}
          <Group
            mt="xl"
            gap="sm"
            align="center"
            justify="space-between"
            wrap="wrap"
          >
            <Group gap="sm" align="center">
              <Image
                src={blog.author.image}
                alt={blog.author.name}
                radius="xl"
                h={44}
                w={44}
                fit="cover"
                fallbackSrc="https://placehold.co/400x400?text=No+Image"
              />

              <Text
                style={{
                  color: 'rgba(246,245,239,.9)',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {blog.author.name}
              </Text>
            </Group>

            <Text
              style={{
                color: COLORS.birchDim,
                fontSize: 12,
                fontFamily: FONTS.mono,
                letterSpacing: '0.04em',
              }}
            >
              {blog.date}
            </Text>
          </Group>
        </Container>
      </Box>

      {/* Article content */}
      <Container size="xl" py={{ base: 35, sm: 60 }}>
        <Box
          className={styles.content}
          style={{
            maxWidth: 1100,
            width: '100%',
            margin: '0 auto',
            padding: 'clamp(24px, 5vw, 64px)',
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid rgba(27, 58, 47, 0.08)',
            boxShadow: '0 8px 35px rgba(27, 58, 47, 0.045)',
            fontSize: 17,
            lineHeight: 1.85,
            color: COLORS.ink,
          }}
        >
          {splitOnCharts(contentHtml).map((part, i) => {
            if (i % 2 === 0) {
              return <div key={i} dangerouslySetInnerHTML={{ __html: part }} />;
            }

            const spec = charts[part];

            if (!spec) {
              throw new Error(
                `Blog "${slug}": no chart "${part}" in charts.json`,
              );
            }

            return <BlogChart key={i} spec={spec} />;
          })}
        </Box>
      </Container>

      {/* Bottom spacing */}
      <Box h={{ base: 20, sm: 35 }} />
    </Box>
  );
}

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
  return BLOGS.filter((paper) => paper.published).map((paper) => ({
    slug: paper.slug,
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
            Data Blog · {blog.source}
          </Text>

          <Group gap={6} mt="sm">
            {blog.tags.map((tag) => (
              <Badge key={tag} variant="outline" color={COLORS.amberSoft}>
                {tag}
              </Badge>
            ))}
          </Group>

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
            {blog.title}
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
            {blog.summary}
          </Text>

          <Group mt="xl" gap="sm" mb={-30}>
            <Image
              src={blog.author.image}
              alt={blog.author.name}
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
              {blog.author.name}
            </Text>
            <Badge
              ml={600}
              size="md"
              style={{
                backgroundColor: 'transparent',
                color: COLORS.birchDim,
              }}
            >
              {blog.date}
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
    </Box>
  );
}

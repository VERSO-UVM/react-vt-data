'use client';

import {
  Container,
  Title,
  Text,
  Button,
  Box,
  Group,
  Grid,
  Card,
  Stack,
  ThemeIcon,
  Paper,
  Badge,
  SimpleGrid,
  Divider,
} from '@mantine/core';
import {
  IconMap2,
  IconChartBar,
  IconDatabaseExport,
  IconArrowsDiff,
  IconBuildingCommunity,
  IconUsers,
  IconLeaf,
  IconHome,
} from '@tabler/icons-react';
import Link from 'next/link';

export default function AboutPage() {  
  return (
  <>
    {/* Hero */}
    <Box
      style={{
        position: 'relative',
        height: '100vh',
        width: '100%',
        backgroundImage: 'url("/images/vt-mountains.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,.65) 100%)',
        }}
      />

      {/* Content */}
      <Container
        size="lg"
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack align="center" gap="xl" maw={1000}>
          <Badge
            size="lg"
            radius="lg"
            variant="filled"
          >
            Vermont Data Collaborative
          </Badge>

          <Title
            ta="center"
            c="white"
            style={{
              fontSize: 'clamp(5rem, 10vw, 7rem)',
              lineHeight: 0.95,
              fontWeight: 800,
              textShadow: '0 4px 30px rgba(0,0,0,.4)',
            }}
          >
            Data for Vermont.
            <br />
            Built with Vermont.
          </Title>

          <Text
            size="xl"
            ta="center"
            c="gray.1"
            maw={800}
            style={{
              lineHeight: 1.7,
              textShadow: '0 2px 10px rgba(0,0,0,.4)',
            }}
          >
            Turning public data into accessible tools
            that help communities understand housing, demographics,
            infrastructure, environmental conditions, and economic trends.
          </Text>

          <Group mt="md">
            <Button
              component={Link}
              href="/mapping"
              size="xl"
              radius="xl"
            >
              Explore Maps
            </Button>

            <Button
              component={Link}
              href="/data-viewer"
              variant="white"
              size="xl"
              radius="xl"
            >
              Analyze Data
            </Button>
          </Group>

          <Text
            c="gray.3"
            size="sm"
            mt={50}
          >
            Scroll to learn more ↓
          </Text>
        </Stack>
      </Container>
    </Box>
    
    {/* Statistics */}
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={75} mt={100} mb={-30}>
      <Stack align="center" gap={0}>
        <Title order={1}>247</Title>
        <Text c="dimmed">Municipalities</Text>
      </Stack>

      <Stack align="center" gap={0}>
        <Title order={1}>1,700+</Title>
        <Text c="dimmed">Zoning Districts</Text>
      </Stack>

      <Stack align="center" gap={0}>
        <Title order={1}>20+</Title>
        <Text c="dimmed">Data Sources</Text>
      </Stack>
    </SimpleGrid>
    {/* Why We Built This */}
    <Container size="lg" pt={140} pb={80}>
          <Grid gutter="xl">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Title order={2} mb="md">
                Why We Built This
              </Title>

              <Text size="lg" c="dimmed">
                Communities need reliable information to make decisions,
                but important data often exists across disconnected
                agencies, reports, and databases.
              </Text>

              <Text mt="md" size="lg" c="dimmed">
                The Vermont Data Collaborative integrates demographic,
                housing, infrastructure, environmental, and policy data
                into a single platform designed to support planning,
                research, and public decision-making.
              </Text>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper withBorder p="xl" radius="md">
                <Title order={4} mb="md">
                  Our Mission
                </Title>

                <Text>
                  Empower Vermont communities with accessible,
                  transparent, and actionable data that supports
                  evidence-based decision making.
                </Text>
              </Paper>
            </Grid.Col>
          </Grid>
        </Container>

        {/* Features */}
        <Paper bg="gray.0" py={80}>
          <Container size="lg">
            <Stack gap="xl">
              <Title order={2} ta="center">
                What You Can Explore
              </Title>

              <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }}>
                <FeatureCard
                  icon={<IconMap2 size={24} />}
                  title="Exploratory Mapping"
                  text="Interactive maps for zoning, flood risk, infrastructure, and environmental conditions."
                />

                <FeatureCard
                  icon={<IconChartBar size={24} />}
                  title="Data Analysis"
                  text="Community profiles, trends, and indicators across Vermont."
                />

                <FeatureCard
                  icon={<IconArrowsDiff size={24} />}
                  title="Comparison Tools"
                  text="Compare municipalities and regions using consistent metrics."
                />

                <FeatureCard
                  icon={<IconDatabaseExport size={24} />}
                  title="Data Export"
                  text="Download curated datasets for planning and research."
                />
              </SimpleGrid>
            </Stack>
          </Container>
        </Paper>

        {/* Use Cases */}
        <Container size="lg" py={80}>
          <Title order={2} ta="center" mb={50}>
            Built for Real Vermont Questions
          </Title>

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <QuestionCard
              title="Can my town support more housing?"
              text="Understand zoning regulations, infrastructure capacity, and housing demand."
              icon={<IconHome size={22} />}
            />

            <QuestionCard
              title="Where are development pressures increasing?"
              text="Compare growth patterns and affordability challenges across communities."
              icon={<IconBuildingCommunity size={22} />}
            />

            <QuestionCard
              title="How vulnerable are local properties to flooding?"
              text="Explore flood risk alongside development and land use patterns."
              icon={<IconLeaf size={22} />}
            />

            <QuestionCard
              title="How does my town compare?"
              text="Analyze demographics, housing, economic indicators, and infrastructure."
              icon={<IconUsers size={22} />}
            />
          </SimpleGrid>
        </Container>

        {/* Impact */}
        <Paper py={80}>
          <Container size="lg">
            <Title order={2} ta="center" mb={50}>
              Impact Across Vermont
            </Title>

            <SimpleGrid cols={{ base: 1, md: 4 }}>
              <ImpactCard
                title="Local Governments"
                text="Support planning and investment decisions."
              />

              <ImpactCard
                title="Regional Organizations"
                text="Identify trends and opportunities."
              />

              <ImpactCard
                title="Researchers"
                text="Access integrated datasets and tools."
              />

              <ImpactCard
                title="Community Members"
                text="Explore data about where they live."
              />
            </SimpleGrid>
          </Container>
        </Paper>

        {/* CTA */}
        <Container size="md" py={100}>
          <Stack align="center" gap="lg">
            <Title ta="center">
              Ready to Explore Vermont Data?
            </Title>

            <Text c="dimmed" ta="center">
              Access maps, data tools, and community insights
              built for Vermont.
            </Text>

            <Group>
              <Button
                component={Link}
                href="/mapping"
                size="lg"
              >
                Launch Maps
              </Button>

              <Button
                component={Link}
                href="/data-viewer"
                variant="light"
                size="lg"
              >
                Open Data Viewer
              </Button>
            </Group>
          </Stack>
        </Container>
      </>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Card withBorder p="xl" radius="md">
      <ThemeIcon size={50} radius="md" variant="light">
        {icon}
      </ThemeIcon>

      <Title order={4} mt="md">
        {title}
      </Title>

      <Text c="dimmed" mt="xs">
        {text}
      </Text>
    </Card>
  );
}

function QuestionCard({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <Card withBorder p="xl" radius="xl">
      <Group mb="md">
        <ThemeIcon variant="light">{icon}</ThemeIcon>
        <Title order={4}>{title}</Title>
      </Group>
      <Text c="dimmed">{text}</Text>
    </Card>
  );
}

function ImpactCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <Paper withBorder p="xl">
      <Title order={4}>{title}</Title>
      <Divider my="sm" />
      <Text c="dimmed">{text}</Text>
    </Paper>
  );
}
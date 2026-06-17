'use client';

import Link from 'next/link';
import { Badge, Button, Card, Center, Container, Grid, Group, 
         Paper, SimpleGrid, Stack, Text, ThemeIcon, Title, Box } from '@mantine/core';
import { IconMap2, IconChartBar, IconDownload, IconHeartHandshake,
         IconDatabase, IconBuildingCommunity, IconPencil } from '@tabler/icons-react';

import { useProfile } from '@/components/profile/profileStore';
import Image from 'next/image';

export default function App() {
  const {
    myLocation,
    comparison,
    interests,
    yearMin,
    yearMax,
    openProfileModal,
  } = useProfile();
  
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Hero Section */}
        <Paper
          radius="xl"
          p={50}
          style={{
            background:
              'linear-gradient(135deg, #f8fafc 0%, #eef4ff 50%, #e7f5ff 100%)',
            border: '1px solid #dee2e6',
          }}
        >
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Stack gap="md">
                <Badge size="lg" variant="light">
                  Vermont Open Data Platform
                </Badge>

                <Title
                  order={1}
                  style={{
                    fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                    lineHeight: 1.05,
                  }}
                >
                  Vermont Data Explorer
                </Title>

                <Text size="lg" c="dimmed" maw={700}>
                  Explore Vermont through interactive maps, data analysis,
                  downloadable datasets, and planning tools. Built to help
                  communities, researchers, planners, and residents better
                  understand local conditions.
                </Text>

                <Group mt="md">
                  <Button
                    component={Link}
                    href="/mapping"
                    size="lg"
                  >
                    Explore Maps
                  </Button>

                  <Button
                    component={Link}
                    href="/working-report"
                    variant="light"
                    size="lg"
                  >
                    Analyze Data
                  </Button>
                </Group>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 5 }}>
              <Paper
                radius="xl"
                p="xl"
                withBorder
                shadow="sm"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'white',
                  height: '100%',
                }}
              >
                {/* Vermont outline */}
                <img
                  src="/images/mapping-icons/vermont-outline.jpg"
                  alt="Vermont outline"
                  style={{
                    position: 'absolute',
                    right: -18,
                    bottom: 40,
                    opacity: 1,
                    pointerEvents: 'none',
                    width: 235,
                    height: 260,
                  }}
                />

                <Stack
                  gap="lg"
                  style={{
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <Group justify="space-between">
                    <Box>
                      <Title order={4}>Your Profile</Title>
                    </Box>
                    <Button
                      size="sm"
                      variant="light"
                      onClick={openProfileModal}
                      rightSection={<IconPencil size={14} />}
                    >
                      Edit
                    </Button>
                  </Group>
                  <Box>
                    <Text size="xs" c="dimmed" mb={4}>
                      LOCATION
                    </Text>

                    <Text fw={600}>{myLocation.name}</Text>
                  </Box>

                  <Box>
                    <Text size="xs" c="dimmed" mb={4}>
                      COMPARISON AREA
                    </Text>

                    <Text fw={600}>{comparison.name}</Text>
                  </Box>

                  <Box>
                    <Text size="xs" c="dimmed" mb={4}>
                      ANALYSIS PERIOD
                    </Text>

                    <Text fw={600}>
                      {yearMin}–{yearMax}
                    </Text>
                  </Box>

                  <Box>
                    <Text size="xs" c="dimmed" mb={6}>
                      INTERESTS
                    </Text>

                    <Group gap="xs">
                      {interests.length > 0 ? (
                        interests.map((interest) => (
                          <Badge
                            key={interest}
                            size="md"
                            variant="light"
                          >
                            {interest}
                          </Badge>
                        ))
                      ) : (
                        <Text size="sm" c="dimmed">
                          No interests selected
                        </Text>
                      )}
                    </Group>
                  </Box>
                </Stack>
              </Paper>
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Feature Cards */}
        <div>
          <Center mb="lg">
            <Title order={2}>Explore the Platform</Title>
          </Center>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
            <Card
              component={Link}
              href="/mapping/zoning"
              withBorder
              radius="lg"
              shadow="sm"
              padding="lg"
              style={{
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'sm';
              }}
            >
              <ThemeIcon size={50} radius="md" variant="light">
                <IconMap2 size={28} />
              </ThemeIcon>
              <Text fw={700} mt="md" >
                Exploratory Mapping
              </Text>

              <Text size="sm" c="dimmed" mt="xs">
                Explore zoning, flood risk, wastewater suitability, and other
                Vermont spatial datasets.
              </Text>
            </Card>

            <Card
              component={Link}
              href="/data-comparison"
              withBorder
              radius="lg"
              shadow="sm"
              padding="lg"
              style={{
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'sm';
              }}
            >
              <ThemeIcon size={50} radius="md" variant="light">
                <IconChartBar size={28} />
              </ThemeIcon>

              <Text fw={700} mt="md">
                Data Analysis
              </Text>

              <Text size="sm" c="dimmed" mt="xs">
                Generate charts, summaries, and comparisons from Vermont
                datasets.
              </Text>
            </Card>

            <Card
              component={Link}
              href="/data-export"
              withBorder
              radius="lg"
              shadow="sm"
              padding="lg"
              style={{
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'sm';
              }}
            >
              <ThemeIcon size={50} radius="md" variant="light">
                <IconDownload size={28} />
              </ThemeIcon>

              <Text fw={700} mt="md">
                Data Export
              </Text>

              <Text size="sm" c="dimmed" mt="xs">
                Download clean, analysis-ready datasets with readable variable
                names.
              </Text>
            </Card>

            <Card
              component={Link}
              href="/tools/benefits-estimator"
              withBorder
              radius="lg"
              shadow="sm"
              padding="lg"
              style={{
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'sm';
              }}
            >
              <ThemeIcon size={50} radius="md" variant="light">
                <IconHeartHandshake size={28} />
              </ThemeIcon>

              <Text fw={700} mt="md">
                Benefits Estimator
              </Text>

              <Text size="sm" c="dimmed" mt="xs">
                Estimate eligibility for Vermont assistance programs and
                benefits.
              </Text>
            </Card>
          </SimpleGrid>
        </div>

        {/* Featured Datasets */}
        <Paper withBorder radius="lg" p="xl">
          <Stack gap="lg">
            <Title order={2}>Featured Data Layers</Title>

            <SimpleGrid cols={{ base: 2, sm: 4 }}>
              <Badge size="lg" variant="light">
                Zoning
              </Badge>
              <Badge size="lg" variant="light">
                Flood Risk
              </Badge>
              <Badge size="lg" variant="light">
                Wastewater
              </Badge>
              <Badge size="lg" variant="light">
                Housing
              </Badge>
              <Badge size="lg" variant="light">
                Demographics
              </Badge>
              <Badge size="lg" variant="light">
                Economy
              </Badge>
              <Badge size="lg" variant="light">
                Transportation
              </Badge>
              <Badge size="lg" variant="light">
                Community Data
              </Badge>
            </SimpleGrid>
          </Stack>
        </Paper>

        {/* Platform Value */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper withBorder radius="lg" p="xl" h="100%">
              <Group mb="md">
                <ThemeIcon variant="light" size="lg">
                  <IconDatabase />
                </ThemeIcon>

                <Title order={3}>Integrated Data</Title>
              </Group>

              <Text c="dimmed">
                Census, planning, environmental, infrastructure, and community
                datasets are brought together into a single platform for
                exploration and analysis.
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper withBorder radius="lg" p="xl" h="100%">
              <Group mb="md">
                <ThemeIcon variant="light" size="lg">
                  <IconBuildingCommunity />
                </ThemeIcon>

                <Title order={3}>Built for Vermont</Title>
              </Group>

              <Text c="dimmed">
                Designed to support residents, municipalities, planners,
                researchers, and organizations working throughout Vermont.
              </Text>
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
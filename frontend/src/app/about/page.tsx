'use client';

import {
  Accordion,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';

import {
  IconArrowsDiff,
  IconChartBar,
  IconDatabaseExport,
  IconHome,
  IconLeaf,
  IconMap2,
  IconUsers,
  IconBuildingCommunity,
  IconArrowRight,
  IconRoute,
} from '@tabler/icons-react';

import {
  GavelIcon,
  BinocularsIcon,
  BuildingsIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';

import Link from 'next/link';
import * as motion from 'motion/react-client';

import { COLORS, FONTS } from '@/app/theme';
import { color } from 'd3';

// -----------------------------------------------------------------------------
// Hero
// -----------------------------------------------------------------------------

function AboutHero() {
  return (
    <Box
      style={{
        position: 'relative',
        minHeight: '88vh',
        width: '100%',
        backgroundImage: 'url("/images/vt-mountains.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Overlay */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            linear-gradient(
              180deg,
              rgba(20, 35, 27, .28) 0%,
              rgba(20, 35, 27, .78) 100%
            )
          `,
        }}
      />

      {/* Content */}
      <Container
        size="xl"
        py={100}
        style={{
          position: 'relative',
          zIndex: 2,
        }}
      >
        <Stack gap="xs" maw={900}>
          <Group gap={10}>
            <Box
              style={{
                width: 30,
                height: 1,
                backgroundColor: COLORS.amberSoft,
              }}
            />

            <Text
              style={{
                fontFamily: FONTS.mono,
                fontSize: 12,
                letterSpacing: '.14em',
                color: COLORS.birchDim,
              }}
            >
              ABOUT THE COLLABORATIVE
            </Text>
          </Group>

          <Title
            style={{
              fontFamily: FONTS.display,
              color: COLORS.birch,
              fontSize: 'clamp(3.5rem, 8vw, 7rem)',
              lineHeight: 0.96,
              letterSpacing: '-.025em',
              textShadow: '0 4px 30px rgba(0,0,0,.3)',
            }}
          >
            Data for Vermont.
            <br />
            <span style={{ color: COLORS.birch }}>Built with Vermont.</span>
          </Title>

          <Text
            size="xl"
            maw={750}
            style={{
              fontFamily: FONTS.body,
              color: 'rgba(246,245,239,.82)',
              lineHeight: 1.7,
              textShadow: '0 2px 12px rgba(0,0,0,.3)',
            }}
          >
            The Vermont Data Collaborative brings together public data,
            technology, and local knowledge to help communities understand the
            places they call home.
          </Text>

          <Group mt="md">
            <Button
              component={Link}
              href="/mapping"
              size="lg"
              radius="md"
              rightSection={<IconArrowRight size={18} />}
              styles={{
                root: {
                  backgroundColor: COLORS.amber,
                  color: COLORS.ink,
                },
              }}
            >
              Explore the maps
            </Button>

            <Button
              component={Link}
              href="/data-viewer"
              size="lg"
              radius="md"
              variant="outline"
              styles={{
                root: {
                  color: COLORS.birchDim,
                  borderColor: 'rgba(246,245,239,.5)',
                },
              }}
            >
              Explore the data
            </Button>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}

// -----------------------------------------------------------------------------
// Statistics
// -----------------------------------------------------------------------------

function Statistics() {
  return (
    <Box
      style={{
        backgroundColor: COLORS.spruceDeep,
        color: COLORS.birch,
      }}
      py={55}
    >
      <Container size="xl">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={40}>
          <Stat number="247" label="Vermont municipalities" />
          <Stat number="1,700+" label="Zoning districts" />
          <Stat number="20+" label="Integrated data sources" />
        </SimpleGrid>
      </Container>
    </Box>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <Group
      justify="center"
      align="baseline"
      gap="xs"
      style={{
        borderRight: '1px solid rgba(246,245,239,.15)',
      }}
    >
      <Text
        style={{
          fontFamily: FONTS.display,
          fontSize: 'clamp(2.5rem, 5vw, 4rem)',
          lineHeight: 1,
        }}
      >
        {number}
      </Text>

      <Text
        size="sm"
        style={{
          fontFamily: FONTS.mono,
          color: 'rgba(246,245,239,.6)',
          textTransform: 'uppercase',
          letterSpacing: '.06em',
        }}
      >
        {label}
      </Text>
    </Group>
  );
}

// -----------------------------------------------------------------------------
// Why
// -----------------------------------------------------------------------------

function WhySection() {
  return (
    <Container size="lg" py={{ base: 80, md: 130 }}>
      <Grid gap="xs" align="center">
        <Grid.Col span={{ base: 12, md: 9 }}>
          <Text
            style={{
              fontFamily: FONTS.mono,
              color: COLORS.amber,
              fontSize: 12,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
            }}
          >
            Why we built this
          </Text>

          <Title
            order={2}
            mt="sm"
            style={{
              fontFamily: FONTS.display,
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              lineHeight: 1.05,
              color: COLORS.ink,
            }}
          >
            Vermont has the data.
            <br />
            Finding it is another story.
          </Title>

          <Text
            mt="xl"
            size="lg"
            style={{
              lineHeight: 1.8,
              color: COLORS.slate,
            }}
          >
            Information about Vermont communities exists across agencies,
            reports, databases, and geographic datasets. These sources are
            valuable individually, but they can be difficult to connect and
            integrate into the same conversation.
          </Text>

          <Text
            mt="md"
            size="lg"
            style={{
              lineHeight: 1.8,
              color: COLORS.slate,
            }}
          >
            The Vermont Data Collaborative brings these pieces together into
            accessible tools that make our community information easier to
            explore, compare, and use for evidence-supported policies.
          </Text>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

// -----------------------------------------------------------------------------
// What We Do
// -----------------------------------------------------------------------------

function WhatWeDo() {
  const features = [
    {
      icon: <IconMap2 size={25} />,
      title: 'Explore Maps',
      text: 'See zoning, flood risk, infrastructure, and environmental conditions in their geographic context.',
      href: '/mapping',
    },
    {
      icon: <IconChartBar size={25} />,
      title: 'Analyze Data',
      text: 'Explore community profiles, indicators, and trends across Vermont.',
      href: '/data-viewer',
    },
    {
      icon: <IconArrowsDiff size={25} />,
      title: 'Compare Communities',
      text: 'Put municipalities side by side using consistent measures and indicators.',
      href: '/data-viewer',
    },
    {
      icon: <IconDatabaseExport size={25} />,
      title: 'Use the Data',
      text: 'Discover the datasets and variables behind the platform and use them for your own work.',
      href: '/data-sources',
    },
  ];

  return (
    <Box
      style={{
        backgroundColor: COLORS.spruceDeep,
      }}
      py={{ base: 80, md: 120 }}
    >
      <Container size="xl">
        <SectionHeading
          eyebrow="The platform"
          title="What you can do"
          description="Explore the tools designed for exploration, comparison, and discovery."
          light
        />

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mt={55}>
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} index={index} />
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}

function FeatureCard({
  icon,
  title,
  text,
  href,
  index,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  href: string;
  index: number;
}) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      style={{ height: '100%' }}
    >
      <Card
        component={Link}
        href={href}
        withBorder
        radius="lg"
        p="xl"
        h="100%"
        style={{
          textDecoration: 'none',
          color: 'inherit',
          backgroundColor: COLORS.birch,
          borderColor: COLORS.line,
        }}
      >
        <Group justify="space-between" align="flex-start">
          <ThemeIcon
            size={52}
            radius="md"
            variant="light"
            style={{
              backgroundColor: COLORS.birchDim,
              color: COLORS.spruce,
            }}
          >
            {icon}
          </ThemeIcon>

          <Text
            style={{
              fontFamily: FONTS.mono,
              fontSize: 11,
              color: COLORS.slate,
            }}
          >
            {String(index + 1).padStart(2, '0')}
          </Text>
        </Group>

        <Title
          order={3}
          mt="xl"
          style={{
            fontFamily: FONTS.display,
            color: COLORS.ink,
          }}
        >
          {title}
        </Title>

        <Text
          mt="xs"
          size="sm"
          style={{
            color: COLORS.slate,
            lineHeight: 1.65,
          }}
        >
          {text}
        </Text>

        <Group gap={5} mt="xl">
          <Text
            size="xs"
            fw={700}
            style={{
              fontFamily: FONTS.mono,
              color: COLORS.spruceDeep,
            }}
          >
            Explore
          </Text>

          <IconArrowRight size={15} style={{ color: COLORS.amber }} />
        </Group>
      </Card>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Topics
// -----------------------------------------------------------------------------

function TopicsSection() {
  const topics = [
    {
      icon: <IconHome size={24} />,
      title: 'Housing',
      text: 'Housing supply, affordability, development, and community conditions.',
    },
    {
      icon: <IconBuildingCommunity size={24} />,
      title: 'Land & Zoning',
      text: 'Zoning districts, land use, and the regulatory landscape shaping development.',
    },
    {
      icon: <IconLeaf size={24} />,
      title: 'Environment',
      text: 'Flood risk, natural resources, and environmental conditions.',
    },
    {
      icon: <IconRoute size={24} />,
      title: 'Infrastructure',
      text: 'Wastewater, transportation, and other systems supporting communities.',
    },
    {
      icon: <IconUsers size={24} />,
      title: 'Demographics',
      text: 'Population, households, education, and characteristics of Vermont communities.',
    },
    {
      icon: <IconChartBar size={24} />,
      title: 'Economy',
      text: 'Employment, income, labor force, and economic indicators.',
    },
  ];

  return (
    <Container size="xl" py={{ base: 80, md: 120 }}>
      <SectionHeading
        eyebrow="Areas of focus"
        title="A fuller picture of Vermont"
        description="Questions about your community rarely fit into a single dataset. The Vermont Data Collaborative connects information across the topics that shape Vermont communities."
      />

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={0} mt={55}>
        {topics.map((topic, index) => (
          <Box
            key={topic.title}
            p="lg"
            style={{
              borderTop: `1px solid ${COLORS.line}`,
              borderRight:
                index % 3 !== 2 ? `1px solid ${COLORS.line}` : undefined,
            }}
          >
            <ThemeIcon
              size={45}
              radius="sm"
              variant="light"
              style={{
                backgroundColor: COLORS.birchDim,
                color: COLORS.spruce,
              }}
            >
              {topic.icon}
            </ThemeIcon>

            <Title
              order={3}
              mt="lg"
              style={{
                fontFamily: FONTS.display,
                color: COLORS.spruceDeep,
              }}
            >
              {topic.title}
            </Title>

            <Text
              mt="xs"
              size="sm"
              c="dimmed"
              style={{
                lineHeight: 1.65,
              }}
            >
              {topic.text}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Container>
  );
}

// -----------------------------------------------------------------------------
// How It Works
// -----------------------------------------------------------------------------

function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Collect',
      text: 'Gather public datasets from federal, state, and local sources.',
    },
    {
      number: '02',
      title: 'Standardize',
      text: 'Clean and structure data so information from different sources can work together.',
    },
    {
      number: '03',
      title: 'Integrate',
      text: 'Connect datasets through common geographies, identifiers, and measures.',
    },
    {
      number: '04',
      title: 'Explore',
      text: 'Make the resulting information available through maps, analysis tools, and downloadable data.',
    },
  ];

  return (
    <Box
      style={{
        backgroundColor: COLORS.spruceDeep,
      }}
      py={{ base: 80, md: 120 }}
    >
      <Container size="xl">
        <SectionHeading
          eyebrow="Behind the platform"
          title="Our Data Process."
          description="Here at the VDC, we believe public data 
                       becomes more useful when it can be found, 
                       connected, and understood. That is why we ensure
                       that our data is findable, accessible, 
                       interoperable, and reusable (FAIR)."
          light
        />

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing={0} mt={65}>
          {steps.map((step, index) => (
            <Box
              key={step.number}
              p="lg"
              style={{
                borderTop: `1px solid rgba(246,245,239,.18)`,
                borderRight:
                  index < 3 ? `1px solid rgba(246,245,239,.12)` : undefined,
              }}
            >
              <Text
                style={{
                  fontFamily: FONTS.mono,
                  color: COLORS.amberSoft,
                  fontSize: 12,
                  letterSpacing: '.1em',
                }}
              >
                {step.number}
              </Text>

              <Title
                order={3}
                mt="lg"
                style={{
                  fontFamily: FONTS.display,
                  color: COLORS.birch,
                  fontSize: 28,
                }}
              >
                {step.title}
              </Title>

              <Text
                mt="xs"
                size="sm"
                style={{
                  color: 'rgba(246,245,239,.62)',
                  lineHeight: 1.7,
                }}
              >
                {step.text}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}

// -----------------------------------------------------------------------------
// Who It's For
// -----------------------------------------------------------------------------

function WhoItsFor() {
  const audiences = [
    {
      title: 'Local governments',
      text: 'Support planning, policy, and investment decisions with a clearer picture of local conditions.',
      icon: <GavelIcon size={22} />,
    },
    {
      title: 'Regional organizations',
      text: 'Identify trends, compare communities, and understand regional challenges.',
      icon: <BuildingsIcon size={22} />,
    },
    {
      title: 'Researchers',
      text: 'Find integrated public datasets and explore information across Vermont.',
      icon: <BinocularsIcon size={22} />,
    },
    {
      title: 'Community members',
      text: 'Learn more about the communities where you live, work, and participate.',
      icon: <UsersThreeIcon size={22} />,
    },
  ];

  return (
    <Container size="lg" py={{ base: 80, md: 120 }}>
      <SectionHeading
        eyebrow="Who it's for"
        title="Tailored to real Vermont questions."
        description="The platform is designed for anyone who needs to understand Vermont communities through data."
        centered
      />

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mt={55}>
        {audiences.map((audience, index, icon) => (
          <Card
            key={audience.title}
            withBorder
            radius="lg"
            p="md"
            style={{
              borderColor: COLORS.line,
              backgroundColor: index % 2 === 0 ? COLORS.birchDim : COLORS.birch,
            }}
          >
            {audience.icon}

            <Title
              order={3}
              mt="md"
              style={{
                fontFamily: FONTS.display,
              }}
            >
              {audience.title}
            </Title>

            <Text mt="xs" c="dimmed" style={{ lineHeight: 1.65 }}>
              {audience.text}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}

// -----------------------------------------------------------------------------
// FAQs
// -----------------------------------------------------------------------------

function FAQSection() {
  const faqs = [
    {
      question: 'Where does the data come from?',
      answer: (
        <>
          VDC brings together data from a range of public sources, including
          federal, state, and local agencies. You can explore the individual
          datasets and their sources on the{' '}
          <Link
            href="resources/data-sources"
            style={{ color: COLORS.spruceDeep }}
          >
            Data Sources
          </Link>{' '}
          page.
        </>
      ),
    },
    {
      question: 'What can I do with the platform?',
      answer: (
        <>
          You can explore geographic information through{' '}
          <Link href="/mapping" style={{ color: COLORS.spruceDeep }}>
            interactive maps
          </Link>
          , analyze key community indicators in the{' '}
          <Link href="/data-viewer" style={{ color: COLORS.spruceDeep }}>
            Data Viewer
          </Link>
          , compare communities, and explore the underlying datasets.
        </>
      ),
    },
    {
      question: 'Which areas are covered in Vermont?',
      answer:
        'The platform is designed around Vermont communities and currently covers all 247 Vermont municipalities. The data has been designed to be analyzed on the town, county, and statewide levels when possible',
    },
    {
      question: 'How often is the data updated?',
      answer:
        'Update schedules depend on the underlying source. Some datasets, such as the U.S. Census, are updated annually, while others are updated on different schedules. Dataset-level information is provided in the Data Sources catalog where available.',
    },
    {
      question: 'Can I download or use the data myself?',
      answer: (
        <>
          Yes. Where data can be distributed directly, the platform provides
          access to curated datasets and metadata. Visit{' '}
          <Link href="/data-sources" style={{ color: COLORS.spruceDeep }}>
            Data Sources
          </Link>{' '}
          to learn more about what's available.
        </>
      ),
    },
  ];

  return (
    <Box
      style={{
        backgroundColor: COLORS.birchDim,
      }}
      py={{ base: 80, md: 120 }}
    >
      <Container size="md">
        <SectionHeading
          eyebrow="Questions"
          title="Frequently asked questions"
          description="A few things to know before exploring the platform."
          centered
        />

        <Accordion
          variant="separated"
          radius="md"
          mt={30}
          styles={{
            item: {
              border: `1px solid ${COLORS.line}`,
              backgroundColor: COLORS.birch,
            },
            control: {
              padding: '20px 22px',
              color: COLORS.spruceDeep,
              fontFamily: FONTS.display,
              fontSize: '1.15rem',
            },
            label: {
              fontFamily: FONTS.display,
              fontWeight: 500,
            },
            panel: {
              padding: '0 22px 22px',
              color: COLORS.slate,
              lineHeight: 1.7,
            },
          }}
        >
          {faqs.map((faq, index) => (
            <Accordion.Item
              key={index}
              value={`faq-${index}`}
              style={{
                border: `1px solid ${COLORS.line}`,
                backgroundColor: COLORS.birch,
              }}
            >
              <Accordion.Control>{faq.question}</Accordion.Control>

              <Accordion.Panel>
                <Text
                  size="md"
                  style={{
                    color: COLORS.slate,
                    fontFamily: FONTS.body,
                    lineHeight: 1.75,
                    maxWidth: 750,
                  }}
                >
                  {faq.answer}
                </Text>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Container>
    </Box>
  );
}

// -----------------------------------------------------------------------------
// CTA
// -----------------------------------------------------------------------------

function ExploreCTA() {
  return (
    <Box
      py={{ base: 90, md: 130 }}
      style={{
        backgroundColor: COLORS.spruce,
      }}
    >
      <Container size="md">
        <Stack align="center" gap="xs">
          <Text
            style={{
              fontFamily: FONTS.mono,
              color: COLORS.amberSoft,
              fontSize: 12,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
            }}
          >
            Start exploring
          </Text>

          <Title
            ta="center"
            style={{
              fontFamily: FONTS.display,
              color: COLORS.birch,
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              lineHeight: 1,
            }}
          >
            See Vermont
            <br />
            through the data.
          </Title>

          <Text
            ta="center"
            maw={600}
            style={{
              color: 'rgba(246,245,239,.65)',
              lineHeight: 1.7,
            }}
          >
            Explore the maps, investigate community indicators, or discover the
            datasets behind the platform.
          </Text>

          <Group mt="sm">
            <Button
              component={Link}
              href="/mapping"
              size="lg"
              radius="md"
              rightSection={<IconArrowRight size={18} />}
              styles={{
                root: {
                  backgroundColor: COLORS.amber,
                  color: COLORS.ink,
                },
              }}
            >
              Explore maps
            </Button>

            <Button
              component={Link}
              href="/data-sources"
              size="lg"
              radius="md"
              variant="outline"
              styles={{
                root: {
                  color: COLORS.birch,
                  borderColor: 'rgba(246,245,239,.35)',
                },
              }}
            >
              Browse data sources
            </Button>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}

// -----------------------------------------------------------------------------
// Shared section heading
// -----------------------------------------------------------------------------

function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
  light = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  centered?: boolean;
  light?: boolean;
}) {
  return (
    <Stack
      gap="sm"
      align={centered ? 'center' : 'flex-start'}
      maw={800}
      mx={centered ? 'auto' : undefined}
    >
      <Text
        style={{
          fontFamily: FONTS.mono,
          fontSize: 12,
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: COLORS.amber,
        }}
      >
        {eyebrow}
      </Text>

      <Title
        order={2}
        ta={centered ? 'center' : undefined}
        style={{
          fontFamily: FONTS.display,
          fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
          lineHeight: 1.05,
          color: light ? COLORS.birch : COLORS.ink,
        }}
      >
        {title}
      </Title>

      <Text
        size="lg"
        ta={centered ? 'center' : undefined}
        style={{
          color: light ? 'rgba(246,245,239,.62)' : COLORS.slate,
          lineHeight: 1.75,
        }}
      >
        {description}
      </Text>
    </Stack>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function AboutPage() {
  return (
    <Box
      style={{
        backgroundColor: COLORS.birch,
      }}
    >
      <AboutHero />
      <Statistics />
      <WhySection />
      <WhatWeDo />
      <TopicsSection />
      <HowItWorks />
      <WhoItsFor />
      <FAQSection />
      <ExploreCTA />
    </Box>
  );
}

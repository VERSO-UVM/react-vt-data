'use client';

import Link from 'next/link';
import { useRef } from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  animate,
} from 'motion/react';
import {
  Anchor,
  Button,
  Container,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Box,
} from '@mantine/core';
import {
  MapTrifoldIcon,
  ChartBarIcon,
  DownloadSimpleIcon,
  HandHeartIcon,
  PencilSimpleIcon,
  GithubLogoIcon,
  UsersThreeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  NewspaperIcon,
} from '@phosphor-icons/react';

import { useProfile } from '@/components/profile/profileStore';

/* ---------------------------------------------------------------
   Design tokens
   Palette drawn from Vermont's own landscape rather than a generic
   SaaS gradient: deep spruce, granite slate, birch cream, and a
   maple-syrup amber for the single warm accent.
----------------------------------------------------------------*/
const COLOR = {
  spruce: '#1B3A2F',
  spruceDeep: '#122820',
  slate: '#40525A',
  birch: '#F6F5EF',
  birchDim: '#EEEBE0',
  ink: '#1B211D',
  amber: '#dd9a2f',
  amberSoft: '#E7B563',
  amberYellow: '#FFD100',
  line: 'rgba(27, 58, 47, 0.14)',
};

const FONT_DISPLAY = "'Fraunces', 'Iowan Old Style', serif";
const FONT_BODY = "'General Sans', 'Inter', sans-serif";
const FONT_MONO = "'IBM Plex Mono', ui-monospace, monospace";

/* ---------------------------------------------------------------
   Hero title typewriter timing
----------------------------------------------------------------*/
const HERO_LINE_1 = 'See Vermont,';
const HERO_LINE_2 = 'town by town.';
const TYPE_CHAR_DELAY = 0.045;
const TYPE_LINE1_START = 0.3;
const TYPE_LINE1_DURATION = HERO_LINE_1.length * TYPE_CHAR_DELAY;
const TYPE_LINE2_START = TYPE_LINE1_START + TYPE_LINE1_DURATION + 0.15;
const TYPE_LINE2_DURATION = HERO_LINE_2.length * TYPE_CHAR_DELAY;

/* ---------------------------------------------------------------
   TypewriterLine — reveals a line character by character, as if
   it were being typed live.
----------------------------------------------------------------*/
function TypewriterLine({
  text,
  startDelay,
  charDelay = TYPE_CHAR_DELAY,
}: {
  text: string;
  startDelay: number;
  charDelay?: number;
}) {
  return (
    <motion.span
      style={{ display: 'inline-block' }}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { delayChildren: startDelay, staggerChildren: charDelay },
        },
      }}
    >
      {Array.from(text).map((char, i) => (
        <motion.span
          key={i}
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          transition={{ duration: 0.01 }}
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
}

/* ---------------------------------------------------------------
   BlinkingCursor — a typed-text caret that starts blinking once
   the line above it has finished typing.
----------------------------------------------------------------*/
function BlinkingCursor({ delay }: { delay: number }) {
  return (
    <motion.span
      style={{
        display: 'inline-block',
        width: '0.07em',
        height: '0.85em',
        marginLeft: 6,
        background: COLOR.amberSoft,
        verticalAlign: '-0.08em',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{
        delay,
        duration: 0.9,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

/* ---------------------------------------------------------------
   Reveal — scroll-triggered fade/slide wrapper. Used sparingly:
   each section reveals once, as a whole, rather than every child
   animating independently (that reads as noisy/AI-generated).
----------------------------------------------------------------*/
function Reveal({
  children,
  delay = 0,
  y = 24,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ---------------------------------------------------------------
   StatNumber — counts up from 0 when it scrolls into view.
----------------------------------------------------------------*/
function StatNumber({
  value,
  suffix = '',
  prefix = '',
}: {
  value: number;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const count = useMotionValue(0);
  const rounded = useTransform(
    count,
    (v) => `${prefix}${Math.round(v).toLocaleString()}${suffix}`,
  );

  if (inView) {
    animate(count, value, { duration: 1.4, ease: [0.22, 1, 0.36, 1] });
  }

  return (
    <motion.span
      ref={ref}
      style={{
        fontFamily: FONT_DISPLAY,
        fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: COLOR.spruce,
        display: 'inline-block',
      }}
    >
      {rounded}
    </motion.span>
  );
}

/* ---------------------------------------------------------------
   Topographic contour — the page's one signature motif. Vermont
   is read through its elevation lines; a single set of contour
   paths draws itself in on load, then sits quietly as texture.
----------------------------------------------------------------*/
function ContourMark({
  width = 260,
  height = 300,
}: {
  width?: number;
  height?: number;
}) {
  const paths = [
    'M10,220 C60,180 90,240 140,200 C190,160 220,210 250,180',
    'M0,180 C50,150 80,190 130,160 C180,130 210,170 260,150',
    'M20,140 C60,115 90,145 130,120 C170,95 200,125 240,110',
    'M30,100 C60,82 90,102 120,85 C150,68 175,90 210,75',
  ];
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 260 300"
      fill="none"
      style={{
        position: 'absolute',
        right: -10,
        bottom: 20,
        pointerEvents: 'none',
      }}
    >
      {paths.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          stroke={i === 0 ? COLOR.amber : COLOR.spruce}
          strokeOpacity={i === 0 ? 0.55 : 0.16}
          strokeWidth={1.4}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: 1.6,
            delay: 0.2 + i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </svg>
  );
}

/* ---------------------------------------------------------------
   Hero
----------------------------------------------------------------*/
function HeroSection({
  myLocation,
  comparison,
  interests,
  yearMin,
  yearMax,
  openProfileModal,
}: {
  myLocation: any;
  comparison: any;
  interests: string[];
  yearMin: number;
  yearMax: number;
  openProfileModal: () => void;
}) {
  return (
    // Full-bleed: breaks out of the page's centered Container so the hero
    // touches both edges of the viewport instead of floating as a card.
    <Box
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100vw',
        left: '50%',
        marginLeft: '-50vw',
        background: `linear-gradient(160deg, ${COLOR.spruceDeep} 0%, ${COLOR.spruce} 100%)`,
        paddingTop: 96,
        paddingBottom: 88,
      }}
    >
      <ContourMark />
      <Container size="xl">
        <Grid gap="md" align="center">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <Text
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 12,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: COLOR.amberSoft,
                }}
              >
                A project of the Vermont Data Collaborative
              </Text>
            </motion.div>

            <Title
              order={1}
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 600,
                fontSize: 'clamp(2.6rem, 5.4vw, 4.2rem)',
                lineHeight: 1.04,
                color: COLOR.birch,
                marginTop: 14,
                maxWidth: 640,
              }}
            >
              <motion.span style={{ display: 'block' }}>
                <TypewriterLine
                  text={HERO_LINE_1}
                  startDelay={TYPE_LINE1_START}
                />
              </motion.span>
              <motion.span style={{ display: 'block' }}>
                <TypewriterLine
                  text={HERO_LINE_2}
                  startDelay={TYPE_LINE2_START}
                />
                <BlinkingCursor
                  delay={TYPE_LINE2_START + TYPE_LINE2_DURATION}
                />
              </motion.span>
            </Title>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 1.75,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Text
                size="lg"
                mt="md"
                maw={560}
                style={{ color: 'rgba(246,245,239,0.78)' }}
              >
                Zoning, flood risk, housing, demographics, and more
                community-level data for all 251 towns and cities. It's free to
                explore and open to all.
              </Text>

              <Group mt={32} gap="md">
                <Button
                  component={Link}
                  href="/mapping"
                  size="lg"
                  radius="md"
                  rightSection={<ArrowRightIcon size={18} />}
                  styles={{
                    root: {
                      backgroundColor: COLOR.amber,
                      color: COLOR.spruceDeep,
                      fontWeight: 600,
                      '&:hover': { backgroundColor: COLOR.amberSoft },
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
                      borderColor: 'rgba(246,245,239,0.4)',
                      color: COLOR.birch,
                      fontWeight: 500,
                    },
                  }}
                >
                  Run an analysis
                </Button>
              </Group>
            </motion.div>
          </Grid.Col>

          {/* Profile panel — sits beside the title, always on the dark
              background so the light text stays legible. */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Box
                style={{
                  background: 'rgba(246,245,239,0.07)',
                  border: '1px solid rgba(246,245,239,0.18)',
                  borderRadius: 18,
                  padding: '26px 28px',
                  backdropFilter: 'blur(6px)',
                }}
              >
                <Group justify="space-between" align="center" mb={18}>
                  <Text
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'rgba(246,245,239,0.5)',
                    }}
                  >
                    Your profile
                  </Text>
                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={openProfileModal}
                    rightSection={<PencilSimpleIcon size={14} />}
                    styles={{ root: { color: COLOR.amberSoft } }}
                  >
                    Edit
                  </Button>
                </Group>

                <Stack gap={16}>
                  <ProfileField label="Location" value={myLocation?.name} />
                  <ProfileField label="Comparing to" value={comparison?.name} />
                  <ProfileField label="Years" value={`${yearMin}–${yearMax}`} />
                  <Box>
                    <FieldLabel>Interests</FieldLabel>
                    {interests.length > 0 ? (
                      <Text style={{ color: COLOR.birch, fontWeight: 500 }}>
                        {interests.join(' · ')}
                      </Text>
                    ) : (
                      <Text style={{ color: 'rgba(246,245,239,0.55)' }}>
                        None selected
                      </Text>
                    )}
                  </Box>
                </Stack>
              </Box>
            </motion.div>
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: FONT_MONO,
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'rgba(246,245,239,0.5)',
        marginBottom: 4,
      }}
    >
      {children}
    </Text>
  );
}

function ProfileField({ label, value }: { label: string; value?: string }) {
  return (
    <Box>
      <FieldLabel>{label}</FieldLabel>
      <Text style={{ color: COLOR.birch, fontWeight: 500 }}>
        {value || '—'}
      </Text>
    </Box>
  );
}

/* ---------------------------------------------------------------
   Stat strip
----------------------------------------------------------------*/
function StatStrip() {
  const stats = [
    { value: 251, label: 'towns & cities mapped' },
    { value: 20, label: 'open datasets', suffix: '' },
    { value: 15, label: 'years of data', suffix: '+' },
    { value: 100, label: 'free to use', suffix: '%' },
  ];
  return (
    <Reveal>
      <Group justify="center" gap={72} wrap="wrap" py="xl">
        {stats.map((s) => (
          <Stack key={s.label} gap={2} align="center">
            <StatNumber value={s.value} suffix={s.suffix} />
            <Text
              style={{
                fontFamily: FONT_BODY,
                fontSize: 16,
                color: COLOR.slate,
                textAlign: 'center',
                maxWidth: 180,
              }}
            >
              {s.label}
            </Text>
          </Stack>
        ))}
      </Group>
    </Reveal>
  );
}

function CapabilityFlow() {
  const items = [
    {
      icon: MapTrifoldIcon,
      title: 'Mapping',
      body: 'Statewide zoning, flood risk, wastewater, and other spatial layers at the county and town level.',
      href: '/mapping',
    },
    {
      icon: ChartBarIcon,
      title: 'Data Analysis',
      body: 'Explore charts, tables, and comparisons across towns, counties, or the whole state.',
      href: '/data-viewer',
    },
    {
      icon: NewspaperIcon,
      title: 'Reporting',
      body: 'Gather data visualizations and tables for community decisions.',
      href: '/working-report',
    },
    {
      icon: DownloadSimpleIcon,
      title: 'Open Data Export',
      body: 'Download clean, analysis-ready datasets with readable variable names.',
      href: '/data-export',
    },
    {
      icon: HandHeartIcon,
      title: 'Benefits Estimator',
      body: 'Check eligibility for Vermont assistance programs with a few questions.',
      href: '/tools/benefits-estimator',
    },
  ];

  return (
    <Container size="lg" py={60}>
      <Reveal>
        <Title
          order={2}
          ta="center"
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 700,
            fontSize: 25,
            color: COLOR.ink,
            lineHeight: 1.5,
          }}
          mb={48}
        >
          Explore Data Your Way
        </Title>
      </Reveal>

      <Box style={{ position: 'relative' }}>
        <Box
          style={{
            position: 'absolute',
            top: 28,
            left: '12%',
            right: '12%',
            height: 1,
            background: COLOR.line,
          }}
          visibleFrom="sm"
        />
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing={40}>
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={i * 0.08}>
                <Box
                  component={Link}
                  href={item.href}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 16,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <Box
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: COLOR.spruce,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <Icon size={26} color={COLOR.birch} weight="light" />
                  </Box>

                  <Box>
                    <Text fw={700} fz="lg" style={{ color: COLOR.ink }}>
                      {item.title}
                    </Text>
                    <Text size="sm" c="dimmed" mt={4}>
                      {item.body}
                    </Text>
                  </Box>
                </Box>
              </Reveal>
            );
          })}
        </SimpleGrid>
      </Box>
    </Container>
  );
}

function FeaturedDatasets() {
  const datasets = [
    'Zoning',
    'Flood Risk',
    'Wastewater',
    'Housing',
    'Demographics',
    'Labor & Economy',
    'Transportation',
    'Community Health',
  ];

  return (
    <Box style={{ background: COLOR.birchDim, borderRadius: 28 }} py={56}>
      <Container size="lg">
        <Reveal>
          <Text
            style={{
              fontFamily: FONT_MONO,
              fontSize: 14,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: COLOR.amber,
              textAlign: 'center',
            }}
            mb={20}
          >
            Featured data
          </Text>
        </Reveal>
        <Reveal delay={0.1}>
          <Text
            ta="center"
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 'clamp(1.4rem, 2.6vw, 2rem)',
              lineHeight: 1.5,
              color: COLOR.ink,
              maxWidth: 1000,
              margin: '0 auto',
            }}
          >
            {datasets.map((d, i) => (
              <span key={d}>
                <Link
                  // NOTE: Placeholder link for each dataset for now
                  href="#"
                  style={{
                    color: 'inherit',
                    textDecoration: 'underline',
                    textDecorationStyle: 'dotted',
                    textDecorationColor: COLOR.slate,
                    textUnderlineOffset: 4,
                  }}
                >
                  {d}
                </Link>
                {i < datasets.length - 1 && (
                  <span style={{ color: COLOR.amber, margin: '0 12px' }}>
                    ·
                  </span>
                )}
              </span>
            ))}
          </Text>
        </Reveal>
      </Container>
    </Box>
  );
}

/* ---------------------------------------------------------------
   Value-adds — a direct comparison, not another card grid.
----------------------------------------------------------------*/
function ValueAdds() {
  const rows = [
    { label: 'Free, no account required', us: true, others: false },
    { label: 'Plain-language field names', us: true, others: false },
    { label: 'Vermont-specific, town-level detail', us: true, others: false },
    { label: 'Maintained with community input', us: true, others: false },
    { label: 'Updated on a public schedule', us: true, others: false },
  ];

  return (
    <Container size="lg" py={64}>
      <Reveal>
        <Title
          order={2}
          ta="center"
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 600,
            color: COLOR.ink,
          }}
          mb={8}
        >
          What's different here
        </Title>
        <Text ta="center" c="dimmed" mb={40}>
          Compared to a typical government data portal.
        </Text>
      </Reveal>

      <Reveal delay={0.1}>
        <Box>
          <Group grow mb={12} px="md">
            <Text />
            <Text ta="center" fw={700} style={{ color: COLOR.spruce }}>
              Our platform
            </Text>
            <Text ta="center" fw={600} c="dimmed">
              Typical portal
            </Text>
          </Group>

          {rows.map((row, i) => (
            <Box
              w={650}
              key={row.label}
              style={{
                borderTop: i === 0 ? 'none' : `1px solid ${COLOR.line}`,
                padding: '16px 8px',
              }}
            >
              <Group grow>
                <Text size="md">{row.label}</Text>
                <Group justify="center">
                  <CheckCircleIcon
                    size={20}
                    weight="fill"
                    color={COLOR.spruce}
                  />
                </Group>
                <Group justify="center">
                  <XCircleIcon size={20} weight="regular" color="#c2c2c2" />
                </Group>
              </Group>
            </Box>
          ))}
        </Box>
      </Reveal>
    </Container>
  );
}

/* ---------------------------------------------------------------
   Open source & community
----------------------------------------------------------------*/
function CommunitySection() {
  return (
    <Box
      style={{
        background: `linear-gradient(135deg, ${COLOR.spruce} 0%, ${COLOR.spruceDeep} 100%)`,
        borderRadius: 28,
      }}
      py={64}
    >
      <Container size="md">
        <Reveal>
          <Group justify="center" mb={20}>
            <UsersThreeIcon size={32} color={COLOR.amberSoft} weight="light" />
          </Group>
          <Title
            order={2}
            ta="center"
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 600,
              color: COLOR.birch,
            }}
            mb={12}
          >
            Built in the open, by Vermonters
          </Title>
          <Text
            ta="center"
            maw={560}
            mx="auto"
            style={{ color: 'rgba(246,245,239,0.78)' }}
          >
            The platform's code and data pipelines are open source. Towns,
            researchers, and volunteers help shape what gets added next — and
            anyone can inspect exactly how a number was calculated.
          </Text>

          <Group justify="center" mt={32} gap="md">
            <Button
              component="a"
              href="https://github.com/VERSO-UVM/react-vt-data"
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              radius="md"
              leftSection={<GithubLogoIcon size={18} />}
              styles={{
                root: {
                  borderColor: 'rgba(246,245,239,0.4)',
                  color: COLOR.birch,
                },
              }}
            >
              View the source
            </Button>
            <Anchor
              href="/about"
              style={{ color: COLOR.amberSoft, fontWeight: 500 }}
            >
              How to contribute →
            </Anchor>
          </Group>
        </Reveal>
      </Container>
    </Box>
  );
}

/* ---------------------------------------------------------------
   Page
----------------------------------------------------------------*/
function App() {
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
      <Stack gap={0}>
        <HeroSection
          myLocation={myLocation}
          comparison={comparison}
          interests={interests}
          yearMin={yearMin}
          yearMax={yearMax}
          openProfileModal={openProfileModal}
        />
        <StatStrip />
        <CapabilityFlow />
        <FeaturedDatasets />
        <ValueAdds />
        <CommunitySection />
      </Stack>
    </Container>
  );
}

export default App;

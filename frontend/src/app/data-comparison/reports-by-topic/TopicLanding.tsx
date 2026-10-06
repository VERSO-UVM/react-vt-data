'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Group,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconBriefcase,
  IconHeartbeat,
  IconHome2,
  IconMap2,
  IconArrowRight,
  IconArrowUpRight,
  IconPencil,
  IconUsers,
  type Icon,
} from '@tabler/icons-react';
import { COLORS } from '@/app/theme';
import { useProfile } from '@/components/profile/profileStore';
import {
  FORMATS,
  getValue,
  type FormatKey,
} from '@/components/Reports/shared/data';
import type { DataRow } from '@/types/cachedCharts';
import classes from './TopicLanding.module.css';
import { SECTIONS, postSection, resolveLocation } from './reportData';
import {
  COMPARISON_COLOR,
  TOPIC_ACCENTS,
} from '@/components/Reports/shared/colors';
import { DashboardSection, TOPIC_SLUGS, topicPath } from './topics';

const TOPICS: Record<
  DashboardSection,
  { icon: Icon; blurb: string; shows: string }
> = {
  Demographics: {
    icon: IconUsers,
    blurb: 'Who lives here.',
    shows: 'Population, age, sex, race and ethnicity',
  },
  Housing: {
    icon: IconHome2,
    blurb: 'The homes and what they cost.',
    shows: 'Home values, housing units, occupancy, vacancy',
  },
  'Labor & Economy': {
    icon: IconBriefcase,
    blurb: 'How people earn.',
    shows: 'Household and per capita income, unemployment',
  },
  'Land Use': {
    icon: IconMap2,
    blurb: 'How land can be used.',
    shows: 'Zoning districts, residential allowances, wastewater permits',
  },
  'Community Health': {
    icon: IconHeartbeat,
    blurb: 'How residents are doing.',
    shows: 'CDC health indicators, poverty and insurance trends',
  },
};

// The stats on each card, read from the topic's main dataset for one place.
interface Stat {
  label: string;
  format: FormatKey;
  read: (rows: DataRow[]) => number | null;
}

// ACS rows span several years; a card shows the latest.
function latest(rows: DataRow[], key: 'year' | 'Year') {
  const y = Math.max(0, ...rows.map((r) => Number(r[key]) || 0));
  return y ? rows.filter((r) => Number(r[key]) === y) : rows;
}
const acs =
  (variable: string, field = 'Value') =>
  (rows: DataRow[]) =>
    getValue(latest(rows, 'year'), variable, field);
const cdc = (measure: string) => (rows: DataRow[]) => {
  const v = latest(
    rows.filter((r) => r.Measure === measure),
    'Year',
  )[0]?.Value;
  return v == null ? null : Number(v);
};

const STATS: Record<DashboardSection, Stat[]> = {
  Demographics: [
    { label: 'Population', format: 'int', read: acs('Population (ACS)') },
    { label: 'Median age', format: 'years', read: acs('Median Age') },
  ],
  Housing: [
    {
      label: 'Median home value',
      format: 'usd',
      read: acs('Median Home Value'),
    },
    { label: 'Housing units', format: 'int', read: acs('Total Housing Units') },
  ],
  'Labor & Economy': [
    {
      label: 'Median household income',
      format: 'usd',
      read: acs('Median Household Income'),
    },
    {
      label: 'Unemployment',
      format: 'pct',
      read: acs('Unemployment Rate', 'Percent'),
    },
  ],
  'Land Use': [
    {
      label: 'Zoning districts',
      format: 'int',
      read: (rows) => rows.length || null,
    },
  ],
  'Community Health': [
    {
      label: 'Depression',
      format: 'pct',
      read: cdc('Depression among adults'),
    },
    {
      label: 'Uninsured (18–64)',
      format: 'pct',
      read: cdc(
        'Current lack of health insurance among adults aged 18-64 years',
      ),
    },
  ],
};

type TopicRows = Record<string, { primary: DataRow[]; comparison: DataRow[] }>;

// One fetch per topic per place, same endpoints and filters as the reports.
// Failed fetches come back empty, so a card just shows dashes.
function useTopicRows(primaryName: string, comparisonName: string) {
  const { myLocation, comparison } = useProfile();
  const [rows, setRows] = useState<TopicRows | null>(null);

  useEffect(() => {
    let cancelled = false;
    const topics = Object.keys(TOPIC_SLUGS) as DashboardSection[];
    const primary = resolveLocation(myLocation).location;
    const bench = resolveLocation(comparison).location;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch effect: back to the loading state for the new places
    setRows(null);
    Promise.all(
      topics.map(async (t) => {
        const cfg = SECTIONS[t];
        const [p, c] = await Promise.all([
          postSection(cfg, cfg.url, primary),
          postSection(cfg, cfg.url, bench),
        ]);
        // Land Use's `data` is acreage by district type (a few rows); its
        // `tableData` has one row per zoning district, which is what is counted.
        const key = t === 'Land Use' ? 'tableData' : 'data';
        const rowsOf = (r: typeof p) => (Array.isArray(r[key]) ? r[key] : []);
        return [t, { primary: rowsOf(p), comparison: rowsOf(c) }] as const;
      }),
    ).then((entries) => {
      if (!cancelled) setRows(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
    // The names change whenever the place does; see ReportsByTopic.
  }, [primaryName, comparisonName]); // eslint-disable-line react-hooks/exhaustive-deps

  return rows;
}

function CardStat({
  stat,
  topic,
  rows,
}: {
  stat: Stat;
  topic: DashboardSection;
  rows: TopicRows | null;
}) {
  const f = FORMATS[stat.format];
  const p = rows ? stat.read(rows[topic].primary) : null;
  const c = rows ? stat.read(rows[topic].comparison) : null;
  return (
    <Stack gap={2}>
      <Text size="xs" fw={700} tt="uppercase" lts={0.6} c={COLORS.slate}>
        {stat.label}
      </Text>
      {rows ? (
        <>
          <Text fw={800} fz={26} lh={1.1} c={TOPIC_ACCENTS[topic]}>
            {p !== null ? f.value(p) : '—'}
          </Text>
          {p !== null && c !== null && (
            <Text size="xs" c={COLORS.slate}>
              {f.diff(p - c)} vs. {f.value(c)}
            </Text>
          )}
        </>
      ) : (
        <>
          <Skeleton h={26} w="70%" />
          <Skeleton h={12} w="50%" mt={4} />
        </>
      )}
    </Stack>
  );
}

export default function TopicLanding() {
  const { myLocation, comparison, openProfileModal } = useProfile();
  const rows = useTopicRows(myLocation.name, comparison.name);

  return (
    <Box bg={COLORS.birch} style={{ minHeight: 'calc(100vh - 70px)' }}>
      <Container size="xl" pt={32} pb={48}>
        <Stack gap={6} mb="lg">
          <Text size="xs" fw={700} tt="uppercase" lts={1.2} c={COLORS.slate}>
            Reports by Topic
          </Text>
          <Title order={1} c={COLORS.spruce} fz={40}>
            Understand your community in context
          </Title>
          <Text size="lg" c={COLORS.slate}>
            Explore demographics, housing, labor, land use, and community
            health.
          </Text>
        </Stack>

        <Group gap="md" mb="lg" wrap="wrap">
          {[
            [COLORS.spruce, myLocation.name],
            [COMPARISON_COLOR, comparison.name],
          ].map(([color, name], i) => (
            <Group key={name} gap="md" wrap="nowrap">
              {i === 1 && <IconArrowRight size={16} color={COLORS.slate} />}
              <Group gap={8} wrap="nowrap">
                <Box
                  w={10}
                  h={10}
                  bg={color}
                  style={{ borderRadius: '50%', flexShrink: 0 }}
                />
                <Text fw={600} c={COLORS.ink}>
                  {name}
                </Text>
              </Group>
            </Group>
          ))}
          <Button
            variant="subtle"
            size="compact-sm"
            color={COLORS.spruce}
            leftSection={<IconPencil size={14} />}
            onClick={openProfileModal}
          >
            Change comparison
          </Button>
        </Group>

        <Grid gap="md">
          {(Object.keys(TOPIC_SLUGS) as DashboardSection[]).map((topic, i) => {
            const { icon: TopicIcon, blurb, shows } = TOPICS[topic];
            const accent = TOPIC_ACCENTS[topic];
            return (
              <Grid.Col
                key={topic}
                span={{ base: 12, sm: 6, lg: i === 0 ? 8 : 4 }}
              >
                <Link href={topicPath(topic)} className={classes.card}>
                  <Group
                    justify="space-between"
                    wrap="nowrap"
                    px="xl"
                    py="md"
                    style={{ background: accent, position: 'relative' }}
                  >
                    <Group gap="sm" c={COLORS.birch}>
                      <TopicIcon size={24} />
                      <Title order={3} c={COLORS.birch}>
                        {topic}
                      </Title>
                    </Group>
                    <TopicIcon
                      size={56}
                      stroke={1.25}
                      color={COLORS.birch}
                      style={{ opacity: 0.25 }}
                    />
                  </Group>
                  <Stack gap="md" p="xl" style={{ flex: 1 }}>
                    <Box>
                      <Text fw={500} c={COLORS.ink}>
                        {blurb}
                      </Text>
                      <Text size="sm" c={COLORS.slate}>
                        {shows}
                      </Text>
                    </Box>
                    <Group gap="xl" align="flex-start" wrap="wrap">
                      {STATS[topic].map((stat) => (
                        <CardStat
                          key={stat.label}
                          stat={stat}
                          topic={topic}
                          rows={rows}
                        />
                      ))}
                    </Group>
                    <Group justify="space-between" mt="auto" c={accent}>
                      <Text size="sm" fw={700} c={accent}>
                        Open report
                      </Text>
                      <IconArrowUpRight size={22} className={classes.arrow} />
                    </Group>
                  </Stack>
                </Link>
              </Grid.Col>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}

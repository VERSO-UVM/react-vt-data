'use client';

import {
  Box,
  Grid,
  Text,
  Title,
  Tabs,
  Container,
  Group,
  Button,
  Stack,
} from '@mantine/core';
import {
  HouseLineIcon,
  UserListIcon,
  TreeIcon,
  GraduationCapIcon,
  TrendUpIcon,
  PencilSimpleIcon,
  Icon,
} from '@phosphor-icons/react';
import { createChartItem, createTableItem } from '@/utils/itemFactory';
import { ChartStack } from '@/components/Charts';
import { useProfile, type Location } from '@/components/profile/profileStore';
import {
  useApplyFilters,
  buildFilters,
} from '@/components/FilterUI/useApplyFilters';
import { useLazyChartData } from '@/components/FilterUI/useLazyChartData';

import { motion } from 'motion/react';
import classes from './Tabs.module.css';
import { useEffect, useState } from 'react';

// within data viewer imports
import { chartDefs } from '@/components/Charts/configs/ChartDefs';
import { COLORS, FONTS } from '../theme';
import { FieldLabel } from './FieldLabel';
import { MetricsPanel } from './MetricsPanels';

// Imports needed for stat cards
import { BASE_API_URL } from '@/config';

type Row = {
  year: string;
  NAME: string;
  Value: number;
  Variable: string;
};

function StatCards() {
  const { myLocation, yearMin, yearMax } = useProfile();

  const [data, setData] = useState<Row[]>([]);
  const applyFilters = useApplyFilters();

  useEffect(() => {
    applyFilters({
      dataURL: `${BASE_API_URL}/load/acs5-db/tidy/snapshot`,
      filters: buildFilters(myLocation, {
        col: 'year',
        selected: [yearMin, yearMax],
      }),
      onData: (data) => {
        setData(data as Row[]);
      },
    });
  }, [applyFilters, myLocation, yearMin, yearMax]);

  const metrics = data.reduce<Record<string, number>>((acc, d) => {
    acc[d.Variable] = d.Value;
    return acc;
  }, {});

  return <MetricsPanel metrics={metrics} />;
}

interface Section {
  id: string;
  label: string;
  icon: Icon;
}

function ChartTabs({
  sections,
  activeTab,
  setActiveTab,
}: {
  sections: Section[];
  activeTab: string | null;
  setActiveTab: (v: string | null) => void;
}) {
  return (
    <Tabs
      value={activeTab}
      onChange={setActiveTab}
      variant="outline"
      radius="md"
      defaultValue="Land Use"
      c={'#F6F5EF'}
      classNames={{ tab: classes.tab }}
    >
      <Tabs.List>
        {sections.map((section) => (
          <Tabs.Tab
            key={section.id}
            value={section.id}
            leftSection={<section.icon size={16} />}
          >
            {section.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}

function HeroSection({
  myLocation,
  comparison,
  interests,
  yearMin,
  yearMax,
  openProfileModal,
  sections,
  activeTab,
  setActiveTab,
}: {
  myLocation: Location;
  comparison: Location;
  interests: string[];
  yearMin: number;
  yearMax: number;
  openProfileModal: () => void;
  sections: Section[];
  activeTab: string | null;
  setActiveTab: (v: string | null) => void;
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
        background: `linear-gradient(160deg, ${COLORS.spruceDeep} 0%, ${COLORS.spruce} 100%)`,
        paddingTop: 70,
        paddingBottom: 40,
      }}
    >
      <Container size="xl">
        <Grid gap="md" align="center">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <Text
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 12,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: COLORS.amberSoft,
                }}
              >
                Data Gallery
              </Text>
            </motion.div>
            <Title
              order={1}
              style={{
                fontFamily: FONTS.display,
                fontWeight: 600,
                fontSize: 'clamp(2.3rem, 5.4vw, 3.7rem)',
                lineHeight: 1.04,
                color: COLORS.birch,
                marginTop: 14,
                maxWidth: 640,
              }}
            >
              {myLocation?.name || 'No Location Selected'}
              {comparison?.name && (
                <Text
                  span
                  style={{
                    fontFamily: FONTS.display,
                    fontWeight: 400,
                    fontSize: '0.4em',
                    color: 'rgba(246,245,239,0.45)',
                    display: 'block',
                    marginTop: 8,
                  }}
                >
                  compared to {comparison.name}
                </Text>
              )}
            </Title>
          </Grid.Col>
          {/* Profile panel — sits beside the title, always on the dark
             background so the light text stays legible. Kept compact so
             it doesn't compete with the location title. */}
          <Grid.Col span={{ base: 12, md: 4 }}>
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
                  borderRadius: 14,
                  padding: '16px 18px',
                  backdropFilter: 'blur(6px)',
                }}
              >
                <Group justify="space-between" align="center" mb={10}>
                  <Text
                    style={{
                      fontFamily: FONTS.mono,
                      color: COLORS.amberSoft,
                      fontSize: 12,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Your profile
                  </Text>
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    rightSection={<PencilSimpleIcon size={16} weight="bold" />}
                    onClick={openProfileModal}
                    styles={{ root: { color: COLORS.amberSoft } }}
                  >
                    Edit
                  </Button>
                </Group>
                <Stack gap={10}>
                  <ProfileField
                    label="Location"
                    value={myLocation?.name}
                    small
                  />
                  <ProfileField
                    label="Comparing to"
                    value={comparison?.name}
                    small
                  />
                  <ProfileField
                    label="Years"
                    value={`${yearMin}–${yearMax}`}
                    small
                  />
                  <Box>
                    <FieldLabel small>Interests</FieldLabel>
                    {interests.length > 0 ? (
                      <Text
                        size="sm"
                        style={{ color: COLORS.birch, fontWeight: 500 }}
                      >
                        {interests.join(' · ')}
                      </Text>
                    ) : (
                      <Text
                        size="sm"
                        style={{ color: 'rgba(246,245,239,0.55)' }}
                      >
                        None selected
                      </Text>
                    )}
                  </Box>
                </Stack>
              </Box>
            </motion.div>
          </Grid.Col>
        </Grid>

        {/* Stat cards — quick-glance snapshot for the selected location */}
        <Box mt={40}>
          <StatCards />
        </Box>

        {/* Category tabs live in the hero so they read as part of the
           location's summary rather than a separate page section. */}
        <Box
          style={{
            borderTop: '1px solid rgba(246,245,239,0.14)',
          }}
        >
          <Container size="xl" mt={30} mb={-40}>
            <ChartTabs
              sections={sections}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </Container>
        </Box>
      </Container>
    </Box>
  );
}

function ProfileField({
  label,
  value,
  small,
}: {
  label: string;
  value?: string;
  small?: boolean;
}) {
  return (
    <Box>
      <FieldLabel small={small}>{label}</FieldLabel>
      <Text
        size={small ? 'sm' : 'md'}
        style={{ color: COLORS.birch, fontWeight: 500 }}
      >
        {value || '—'}
      </Text>
    </Box>
  );
}

const tableDefs = chartDefs.filter((c) => c.subtype.startsWith('renderTable'));
const nonTableDefs = chartDefs.filter(
  (c) => !c.subtype.startsWith('renderTable'),
);

export default function DataViewerPage() {
  const {
    myLocation,
    comparison,
    interests,
    yearMin,
    yearMax,
    openProfileModal,
  } = useProfile();
  const { chartData, compareChartData, compareTableData, request, isLoading } =
    useLazyChartData(chartDefs, { myLocation, comparison, yearMin, yearMax });

  const [focusMode] = useState<'all' | 'focus'>('all');
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const categoryIcons: Record<string, Icon> = {
    Housing: HouseLineIcon,
    Demographics: UserListIcon,
    'Land Use': TreeIcon,
    Education: GraduationCapIcon,
    'Labor & Economy': TrendUpIcon,
  };

  const sections = [
    ...new Set(chartDefs.flatMap((c) => c.categories ?? [])),
  ].map((category) => ({
    id: category.toLowerCase().replace(/\s+/g, '-'),
    label: category,
    icon: categoryIcons[category] ?? HouseLineIcon,
  }));

  // QCEW employment data is county-level only; swap to a note card for town selections
  const isSubcountyLocation = myLocation.type === 'town';
  const employmentCounty = myLocation.county;

  // item.id is a fresh uuid per render, so remember which def each item is
  const loadIdByItem = new Map<string, string>();

  const charts = nonTableDefs.map((chart) => {
    if (chart.id === 'employment' && isSubcountyLocation) {
      return createChartItem({
        title: myLocation.name,
        xField: '',
        yField: '',
        data: [],
        subtype: 'noteCard',
        categories: chart.categories,
        notes: `County-level data (${employmentCounty} County) — QCEW does not report employment at the town level.`,
      });
    }

    return createChartItem({
      title: myLocation.name,
      xField: chart.xField,
      yField: chart.yField,
      data: chartData[chart.id]?.data || [],

      tableData: chartData[chart.id]?.tableData || [],
      showCols: chart.showCols,

      metadata: chartData[chart.id]?.metadata,
      compareData: compareChartData[chart.id]?.data || [],
      compareTableData: compareChartData[chart.id]?.tableData || [],

      subtype: chart.subtype,
      chartParams: {
        ...chart.chartParams,
        legendLabels: [myLocation.name, comparison.name],
        defId: chart.id,
      },
      description: chart.title,
      notes: chart.notes,
      categories: chart.categories,
    });
  });

  const tableItems = tableDefs.map((def) =>
    createTableItem({
      title: myLocation.name,
      description: def.title,
      data: chartData[def.id]?.data || [],
      metadata: chartData[def.id]?.metadata,
      compareData: compareTableData[def.id] || [],
      chartParams: { legendLabels: [myLocation.name, comparison.name] },
      notes: def.notes,
      subtype: def.subtype,
      trendChart: def.trendChart,
      categories: def.categories,
    }),
  );

  // charts[i] / tableItems[i] come from nonTableDefs[i] / tableDefs[i]; the
  // town-level employment note card has no data to load.
  nonTableDefs.forEach((def, i) => {
    if (charts[i].subtype !== 'noteCard')
      loadIdByItem.set(charts[i].id, def.id);
  });
  tableDefs.forEach((def, i) => loadIdByItem.set(tableItems[i].id, def.id));

  const allItems = [...charts, ...tableItems];
  let filteredItems = allItems;

  if (focusMode === 'focus' && interests.length > 0) {
    filteredItems = filteredItems.filter((c) =>
      c.categories?.some((cat) => interests.includes(cat)),
    );
  }

  if (activeTab) {
    const section = sections.find((s) => s.id === activeTab);

    if (section) {
      filteredItems = filteredItems.filter((item) =>
        item.categories?.includes(section.label),
      );
    }
  }

  const visibleItems = filteredItems;

  return (
    <Box h="100vh">
      <Box px={0}>
        <HeroSection
          myLocation={myLocation}
          comparison={comparison}
          interests={interests}
          yearMin={yearMin}
          yearMax={yearMax}
          openProfileModal={openProfileModal}
          sections={sections}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        {/* Charts... */}
        <Box py="xs">
          <ChartStack
            charts={visibleItems}
            action="add"
            userInterests={interests}
            defIds={visibleItems
              .map((c) => c.chartParams?.defId)
              .filter((id): id is string => id !== undefined)}
            view="gallery"
            loadIds={visibleItems.map((c) => loadIdByItem.get(c.id))}
            onVisible={request}
            isLoading={isLoading}
          />
        </Box>
      </Box>
    </Box>
  );
}

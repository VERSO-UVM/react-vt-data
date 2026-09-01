'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Box,
  Container,
  Group,
  Grid,
  Loader,
  Paper,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useProfile } from '@/components/profile/profileStore';
import { BASE_API_URL } from '@/config';
import {
  DemographicsDashboard,
  LandUseDashboard,
  HousingDashboard,
  EducationDashboard,
  HealthDashboard,
  EconomicDashboard,
} from '@/components/Reports/dashboards';
// import { ChartStack } from '@/components/Charts';
// import { createChartItem } from '@/utils/itemFactory';
import { DataRow } from '@/types/cachedCharts';

// ---------------------------------------------------------------------------
// Section config — url and which field to use as the bar value
// ---------------------------------------------------------------------------

type YField = 'Percent' | 'Value';

interface SectionConfig {
  url: string;
  yField: YField;
  unit: string;
  yearMin: number;
  yearMax: number;
}

const SECTIONS: Record<string, SectionConfig> = {
  Demographics: {
    url: `${BASE_API_URL}/load/acs5-db/tidy/demographics`,
    yField: 'Percent',
    unit: '%',
    yearMin: 2010,
    yearMax: 2024,
  },
  Education: {
    url: `${BASE_API_URL}/load/acs5-db/tidy/education`,
    yField: 'Percent',
    unit: '%',
    yearMin: 2012,
    yearMax: 2024,
  },
  Housing: {
    url: `${BASE_API_URL}/load/acs5-db/tidy/housing`,
    yField: 'Value',
    unit: '',
    yearMin: 2010,
    yearMax: 2024,
  },
  'Labor & Economy': {
    url: `${BASE_API_URL}/load/acs5-db/tidy/economics`,
    yField: 'Value',
    unit: '',
    yearMin: 2010,
    yearMax: 2024,
  },
  'Land Use': {
    url: `${BASE_API_URL}/load/mapping/zoning/standard_new`,
    yField: 'Value',
    unit: '',
    yearMin: 2024,
    yearMax: 2024,
  },
  'Community Health': {
    url: `${BASE_API_URL}/load/mapping/cdc/places/single`,
    yField: 'Value',
    unit: '',
    yearMin: 2024,
    yearMax: 2024,
  },
};

function HeroSection({
  section,
  setSection,
  year,
  setYear,
  availableYears,
}: any) {
  return (
    <Box
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100vw',
        height: 350,
        left: '50%',
        marginLeft: '-50vw',
        background: '#1B3A2F',
        paddingTop: 30,
        paddingBottom: 64,
      }}
    >
      <Container size="xl">
        <Grid gap="xl" align="center">
          <Grid.Col span={{ base: 12, lg: 7 }}>
            <Stack gap="md" maw={760}>
              <Text
                style={{
                  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                  fontSize: 12,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#E7B563',
                }}
              >
                American Community Survey
              </Text>

              <Title
                order={1}
                style={{
                  fontFamily: "'Fraunces', 'Iowan Old Style', serif",
                  fontWeight: 600,
                  fontSize: 'clamp(2.4rem,5vw,4rem)',
                  lineHeight: 1.05,
                  color: '#F6F5EF',
                }}
              >
                Reports by Topic
              </Title>

              <Text
                size="lg"
                maw={620}
                style={{
                  color: 'rgba(246,245,239,0.78)',
                }}
              >
                Explore the complete American Community Survey with detailed
                demographic, education, housing, employment, and income tables
                for every Vermont community.
              </Text>
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, lg: 5 }}>
            <ExplorerControls
              section={section}
              setSection={setSection}
              year={year}
              setYear={setYear}
              availableYears={availableYears}
            />
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );
}

function ExplorerControls({
  section,
  setSection,
  year,
  setYear,
  availableYears,
}: {
  section: string;
  setSection: (value: string) => void;
  year: number;
  setYear: (value: number) => void;
  availableYears: number[];
}) {
  return (
    <Box
      mt={48}
      style={{
        background: 'rgba(246,245,239,0.07)',
        border: '1px solid rgba(246,245,239,0.18)',
        borderRadius: 18,
        padding: '24px 28px',
        backdropFilter: 'blur(8px)',
        maxWidth: 720,
      }}
    >
      <Stack gap="lg">
        <Stack gap={2}>
          <Text
            style={{
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              fontSize: 11,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: 'rgba(246,245,239,0.55)',
            }}
          >
            Analysis
          </Text>

          <Title
            order={3}
            style={{
              fontFamily: "'Fraunces', 'Iowan Old Style', serif",
              color: '#F6F5EF',
            }}
          >
            Choose a dataset
          </Title>

          <Text
            style={{
              color: 'rgba(246,245,239,0.72)',
            }}
          >
            Select an ACS topic and year to begin exploring detailed Census
            tables.
          </Text>
        </Stack>

        <Group align="flex-end" gap="md" wrap="wrap">
          <Select
            label="Topic"
            value={section}
            onChange={(v) => v && setSection(v)}
            data={Object.keys(SECTIONS)}
            flex={1}
            miw={260}
            styles={{
              label: {
                color: '#E7B563',
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                textTransform: 'uppercase',
                fontSize: 11,
                letterSpacing: '.08em',
              },
              input: {
                borderRadius: 12,
                height: 48,
                background: 'rgba(255,255,255,.08)',
                border: '1px solid rgba(255,255,255,.18)',
                color: '#F6F5EF',
              },
              dropdown: {
                borderRadius: 12,
              },
            }}
          />
          <Select
            label="Year"
            value={String(year)}
            onChange={(v) => v && setYear(Number(v))}
            data={availableYears.map((y) => ({
              value: String(y),
              label: String(y),
            }))}
            disabled={availableYears.length === 0}
            w={150}
            styles={{
              label: {
                color: '#E7B563',
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                textTransform: 'uppercase',
                fontSize: 11,
                letterSpacing: '.08em',
              },
              input: {
                borderRadius: 12,
                height: 48,
                background: 'rgba(255,255,255,.08)',
                border: '1px solid rgba(255,255,255,.18)',
                color: '#F6F5EF',
              },
              dropdown: {
                borderRadius: 12,
              },
            }}
          />
        </Group>
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DataComparisonPage() {
  const { myLocation, comparison, yearMax: profileYearMax } = useProfile();
  type DashboardSection =
    | 'Demographics'
    | 'Housing'
    | 'Education'
    | 'Labor & Economy'
    | 'Land Use'
    | 'Community Health';
  const [section, setSection] = useState<DashboardSection>('Demographics');
  const [primaryData, setPrimaryData] = useState<DataRow[]>([]);
  const [compareData, setCompareData] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch both locations whenever section or location names change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const cfg = SECTIONS[section];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch effect: reset status before the async request
    setLoading(true);
    setError(null);

    const fetchOne = (name: string) =>
      axios
        .post(cfg.url, {
          filters: {
            Location: [name],
            year: {
              min: cfg.yearMin,
              max: cfg.yearMax,
            },
          },
          include: [],
        })
        .then((r) => r.data);

    Promise.all([fetchOne(myLocation.name), fetchOne(comparison.name)])
      .then(([primary, comp]) => {
        console.log('PRIMARY RESPONSE', primary);
        console.log('COMPARE RESPONSE', comp);

        setPrimaryData(Array.isArray(primary.data) ? primary.data : []);
        setCompareData(Array.isArray(comp.data) ? comp.data : []);
      })
      .catch(() => setError('Failed to load data. Is the API running?'))
      .finally(() => setLoading(false));
  }, [section, myLocation.name, comparison.name]);

  // ---------------------------------------------------------------------------
  // Derive available years from fetched data; default to profile yearMax
  // ---------------------------------------------------------------------------
  const availableYears: number[] = Array.from(
    new Set(
      (Array.isArray(primaryData) ? primaryData : [])
        .map((r) => Number(r.year))
        .filter(Boolean),
    ),
  ).sort();

  const [year, setYear] = useState<number>(profileYearMax);

  // When section changes the available years may shift — clamp to closest.
  useEffect(() => {
    if (availableYears.length === 0) return;
    if (!availableYears.includes(year)) {
      const nearest = availableYears.reduce((a, b) =>
        Math.abs(b - year) < Math.abs(a - year) ? b : a,
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clamp selection when the section's year range shifts
      setYear(nearest);
    }
  }, [availableYears.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Slice to selected year
  // ---------------------------------------------------------------------------
  const yearStr = String(year);
  const cfg = SECTIONS[section];
  const primaryForYear = primaryData.filter((r) => String(r.year) === yearStr);
  const compareForYear = compareData.filter((r) => String(r.year) === yearStr);

  const dashboardData = useMemo(
    () => ({
      year,

      primary: {
        current: primaryForYear,
        history: primaryData,
        name: myLocation.name,
      },

      comparison: {
        current: compareForYear,
        history: compareData,
        name: comparison.name,
      },
    }),
    [
      year,
      primaryForYear,
      compareForYear,
      primaryData,
      compareData,
      myLocation.name,
      comparison.name,
    ],
  );

  interface DashboardData {
    year: number;
    primary: {
      name: string;
      current: DataRow[];
      history: DataRow[];
    };
    comparison: {
      name: string;
      current: DataRow[];
      history: DataRow[];
    };
  }

  interface DashboardProps {
    data: DashboardData;
  }

  const dashboards: Partial<
    Record<DashboardSection, React.ComponentType<DashboardProps>>
  > = {
    Demographics: DemographicsDashboard,
    Housing: HousingDashboard,
    Education: EducationDashboard,
    'Labor & Economy': EconomicDashboard,
    'Land Use': LandUseDashboard,
    'Community Health': HealthDashboard,
  };

  const Dashboard = dashboards[section];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      <HeroSection
        section={section}
        setSection={setSection}
        year={year}
        setYear={setYear}
        availableYears={availableYears}
      />
      <Container size="xl" mb="xl" mt="xl">
        {error && <Text c="red">{error}</Text>}
        {loading ? (
          <Paper radius="lg" p={60} withBorder>
            <Stack align="center">
              <Loader color="#dd9a2f" type="dots" />
              <Text c="dimmed">Loading Census data...</Text>
            </Stack>
          </Paper>
        ) : (
          Dashboard && <Dashboard data={dashboardData} />
        )}
      </Container>
    </>
  );
}

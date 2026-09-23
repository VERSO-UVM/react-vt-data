'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  Box,
  Button,
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
import { useProfile, Location } from '@/components/profile/profileStore';
import { BASE_API_URL } from '@/config';
import {
  DemographicsDashboard,
  LandUseDashboard,
  HousingDashboard,
  //EducationDashboard,
  HealthDashboard,
  EconomicDashboard,
} from '@/components/Reports/dashboards';
// import { ChartStack } from '@/components/Charts';
// import { createChartItem } from '@/utils/itemFactory';
import { DataRow } from '@/types/cachedCharts';
import { IconDownload } from '@tabler/icons-react';
import { exportReport } from '@/utils/exportReport';
import { DashboardSection, TOPIC_SLUGS, topicPath } from './topics';

// ---------------------------------------------------------------------------
// Section config — url and which field to use as the bar value
// ---------------------------------------------------------------------------

type YField = 'Percent' | 'Value';

// Additional named endpoints a topic can pull in alongside its primary `url`
// — e.g. dedicated time-series tables for trend charts. Fetched for both the
// primary and comparison locations and handed to the topic's Dashboard
// component as `data.timeseries[key]`.
interface TimeseriesEndpoint {
  url: string;
}

interface SectionConfig {
  url: string;
  yField: YField;
  unit: string;
  yearMin: number;
  yearMax: number;
  timeseries?: Record<string, TimeseriesEndpoint>;
  // Filter label sent as the location key (defaults to "Location", which
  // matches the ACS5 routes' NAME column). Zoning/wastewater tables have no
  // "Location" column in their filter schema — they use "Jurisdiction"
  // (the `town` column) instead, so requests sent with the default key
  // silently return unfiltered, statewide results.
  locationFilterKey?: string;
  // False for datasets with no `year` column (e.g. zoning is a current-
  // snapshot dataset) — skips the year slice below, which would otherwise
  // filter every row out since `String(undefined) !== yearStr`. Defaults to
  // true.
  hasYearDimension?: boolean;
  // True for datasets only published at county grain (e.g. CDC PLACES has
  // no town-level rows) — always filters by location.county, even for a
  // town-type selection, instead of trying (and failing) to filter by town.
  countyOnly?: boolean;
}

const SECTIONS: Record<string, SectionConfig> = {
  Demographics: {
    url: `${BASE_API_URL}/load/acs5-db/tidy/demographics`,
    yField: 'Percent',
    unit: '%',
    yearMin: 2010,
    yearMax: 2024,
    timeseries: {
      historicPopulation: {
        url: `${BASE_API_URL}/load/acs5-db/timeseries/demographics/historic-population`,
      },
      medianAge: {
        url: `${BASE_API_URL}/load/acs5-db/timeseries/demographics/median-age`,
      },
    },
  },
  // Education: {
  //   url: `${BASE_API_URL}/load/acs5-db/tidy/education`,
  //   yField: 'Percent',
  //   unit: '%',
  //   yearMin: 2012,
  //   yearMax: 2024,
  // },
  Housing: {
    url: `${BASE_API_URL}/load/acs5-db/tidy/housing`,
    yField: 'Value',
    unit: '',
    yearMin: 2010,
    yearMax: 2024,
    timeseries: {
      medianHomeValue: {
        url: `${BASE_API_URL}/load/acs5-db/timeseries/housing/median-home-value`,
      },
      totalUnits: {
        url: `${BASE_API_URL}/load/acs5-db/timeseries/housing/total-units`,
      },
    },
  },
  'Labor & Economy': {
    url: `${BASE_API_URL}/load/acs5-db/tidy/economics`,
    yField: 'Value',
    unit: '',
    yearMin: 2010,
    yearMax: 2024,
    timeseries: {
      householdIncome: {
        url: `${BASE_API_URL}/load/acs5-db/timeseries/economics/median-hh-income`,
      },
      perCapitaIncome: {
        url: `${BASE_API_URL}/load/acs5-db/timeseries/economics/per-capita-income`,
      },
    },
  },
  'Land Use': {
    url: `${BASE_API_URL}/load/data/zoning/aggregated`,
    yField: 'Value',
    unit: '',
    yearMin: 2024,
    yearMax: 2024,
    locationFilterKey: 'Jurisdiction',
    hasYearDimension: false,
    timeseries: {
      allowances: {
        url: `${BASE_API_URL}/load/data/zoning/allowances`,
      },
      wastewaterPermits: {
        url: `${BASE_API_URL}/load/mapping/wastewater/treatment_facility/permits`,
      },
    },
  },
  'Community Health': {
    url: `${BASE_API_URL}/load/data/cdc/places`,
    yField: 'Value',
    unit: '%',
    yearMin: 2024,
    yearMax: 2024,
    locationFilterKey: 'County',
    countyOnly: true,
    hasYearDimension: false,
  },
};

// county_town_names.json (the profile's town picker) stores Census-style
// subdivision names — e.g. location.town is "Burlington city" or "Addison
// town" — which is exactly what the cleaned datasets' `town` columns hold, so
// that is the primary candidate. Rows the cleaners couldn't match to a
// municipality keep their raw source spelling ("Huntington", "Barre Town"),
// so the bare and title-cased-suffix forms ride along in the IN-list too.
const TOWN_SUFFIX_RE = /\s+(town|city|gore|grant)$/i;
const bareTownName = (town: string) => town.replace(TOWN_SUFFIX_RE, '');
const titledTownName = (town: string) =>
  town.replace(
    /(town|city|gore|grant)$/i,
    (s) => s[0].toUpperCase() + s.slice(1).toLowerCase(),
  );

// Builds the location portion of a filter request for a section. ACS-style
// sections (no locationFilterKey) send the profile's full display name,
// which matches the ACS NAME column at any grain (town/county/state) — this
// is the pre-existing behavior. Zoning/wastewater sections have separate
// Town/County columns instead of one combined name string, so the display
// name (e.g. "Burlington city, Chittenden County, Vermont") never matches;
// filter by whichever grain the selected location actually is instead, and
// send no filter for state/national (no statewide-equivalent column to
// filter to — this naturally falls back to the full dataset). A town pick
// filters BOTH Jurisdiction and County — Vermont has same-named towns in
// different counties, so Jurisdiction alone can be ambiguous.
// Returns null when the section has no data for that kind of location.
function buildLocationFilters(
  cfg: SectionConfig,
  location: Location,
): Record<string, string[]> | null {
  if (!cfg.locationFilterKey) {
    return { Location: [location.name] };
  }
  if (cfg.countyOnly) {
    if (location.county) return { County: [location.county] };
    // No county filter means "all counties", which the API combines into a
    // Vermont estimate: right for a statewide pick, but an RPC or national
    // pick has no county-grain equivalent and would be mislabeled.
    return location.type === 'state' ? {} : null;
  }
  if (location.type === 'town' && location.town) {
    // `town` columns hold the Census-style name as-is ("Rockingham town");
    // the bare/titled spellings only match rows the cleaners left unmatched.
    const candidates = Array.from(
      new Set([
        location.town,
        bareTownName(location.town),
        titledTownName(location.town),
      ]),
    );
    const filters: Record<string, string[]> = {
      [cfg.locationFilterKey]: candidates,
    };
    if (location.county) filters.County = [location.county];
    return filters;
  }
  if (location.type === 'county' && location.county) {
    return { County: [location.county] };
  }
  return {};
}

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
                Curated dashboards by data topic. Select a category to get
                started.
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

// Rendered by both routes: page.tsx (the default topic) and [topic]/page.tsx.
// Picking a topic navigates to that topic's own page, so the URL always names
// the report on screen.
export default function ReportsByTopic({
  section,
}: {
  section: DashboardSection;
}) {
  const { myLocation, comparison, yearMax: profileYearMax } = useProfile();
  const router = useRouter();
  const setSection = (value: string) => {
    if (!(value in TOPIC_SLUGS) || value === section) return;
    router.push(topicPath(value as DashboardSection), { scroll: false });
  };
  const [primaryData, setPrimaryData] = useState<DataRow[]>([]);
  const [compareData, setCompareData] = useState<DataRow[]>([]);
  const [timeseriesData, setTimeseriesData] = useState<
    Record<string, { primary: DataRow[]; comparison: DataRow[] }>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch both locations whenever section or location names change — plus,
  // for every endpoint the section declares under `timeseries`, the same two
  // locations again. A single failed timeseries endpoint (e.g. no data for a
  // given town) falls back to an empty series instead of failing the whole
  // section, since it's supplementary to the primary table.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const cfg = SECTIONS[section];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch effect: reset status before the async request
    setLoading(true);
    setError(null);

    const fetchFrom = (url: string, location: Location) => {
      const locationFilters = buildLocationFilters(cfg, location);
      if (!locationFilters) return Promise.resolve({ data: [] });
      return axios
        .post(url, {
          filters: {
            ...locationFilters,
            year: {
              min: cfg.yearMin,
              max: cfg.yearMax,
            },
          },
          include: [],
        })
        .then((r) => r.data)
        .catch(() => ({ data: [] }));
    };

    const timeseriesKeys = Object.keys(cfg.timeseries ?? {});

    Promise.all([
      fetchFrom(cfg.url, myLocation),
      fetchFrom(cfg.url, comparison),
      ...timeseriesKeys.map((key) =>
        fetchFrom(cfg.timeseries![key].url, myLocation),
      ),
      ...timeseriesKeys.map((key) =>
        fetchFrom(cfg.timeseries![key].url, comparison),
      ),
    ])
      .then(([primary, comp, ...tsResults]) => {
        setPrimaryData(Array.isArray(primary.data) ? primary.data : []);
        setCompareData(Array.isArray(comp.data) ? comp.data : []);

        const nextTimeseries: Record<
          string,
          { primary: DataRow[]; comparison: DataRow[] }
        > = {};
        timeseriesKeys.forEach((key, i) => {
          const primaryRes = tsResults[i];
          const compareRes = tsResults[timeseriesKeys.length + i];
          nextTimeseries[key] = {
            primary: Array.isArray(primaryRes?.data) ? primaryRes.data : [],
            comparison: Array.isArray(compareRes?.data) ? compareRes.data : [],
          };
        });
        setTimeseriesData(nextTimeseries);
      })
      .catch(() => setError('Failed to load data. Is the API running?'))
      .finally(() => setLoading(false));
    // .name changes whenever type/county/town does (it's derived from them),
    // so it's a reliable proxy for "the location changed" without needing
    // the whole objects in the dependency array.
  }, [section, myLocation.name, comparison.name]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const primaryForYear =
    cfg.hasYearDimension === false
      ? primaryData
      : primaryData.filter((r) => String(r.year) === yearStr);
  const compareForYear =
    cfg.hasYearDimension === false
      ? compareData
      : compareData.filter((r) => String(r.year) === yearStr);

  const dashboardData = useMemo(
    () => ({
      year,

      primary: {
        current: primaryForYear,
        history: primaryData,
        name: myLocation.name,
        location: myLocation,
      },

      comparison: {
        current: compareForYear,
        history: compareData,
        name: comparison.name,
        location: comparison,
      },

      timeseries: timeseriesData,
    }),
    [
      year,
      primaryForYear,
      compareForYear,
      primaryData,
      compareData,
      timeseriesData,
      myLocation,
      comparison,
    ],
  );

  interface DashboardData {
    year: number;
    primary: {
      name: string;
      location?: Location;
      current: DataRow[];
      history: DataRow[];
    };
    comparison: {
      name: string;
      location?: Location;
      current: DataRow[];
      history: DataRow[];
    };
    timeseries?: Record<string, { primary: DataRow[]; comparison: DataRow[] }>;
  }

  interface DashboardProps {
    data: DashboardData;
  }

  const dashboards: Partial<
    Record<DashboardSection, React.ComponentType<DashboardProps>>
  > = {
    Demographics: DemographicsDashboard,
    Housing: HousingDashboard,
    //Education: EducationDashboard, //Temporarily down until more education data gathered
    'Labor & Economy': EconomicDashboard,
    'Land Use': LandUseDashboard,
    'Community Health': HealthDashboard,
  };

  const Dashboard = dashboards[section];

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await exportReport('demographics-dashboard-report', {
        title: section,
        primaryName: myLocation.name,
        comparisonName: comparison.name,
        year: year,
      });
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

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
              <Text c="dimmed">Loading data...</Text>
            </Stack>
          </Paper>
        ) : (
          Dashboard && <Dashboard data={dashboardData} />
        )}
      </Container>
    </>
  );
}

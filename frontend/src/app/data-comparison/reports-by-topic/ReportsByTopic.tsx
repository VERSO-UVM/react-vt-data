'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  Alert,
  Anchor,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
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
import {
  IconArrowLeft,
  IconDownload,
  IconInfoCircle,
} from '@tabler/icons-react';
import { COLORS } from '@/app/theme';
import { ReportProvider } from '@/components/Reports/shared';
import type { ReportData } from '@/components/Reports/shared';
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
  // Filter by the profile place's ACS name (the Location filter) instead of
  // the section's own location filter -- for ACS context on a county-only
  // section, since ACS publishes the town itself.
  byPlaceName?: boolean;
}

interface SectionConfig {
  url: string;
  yField: YField;
  unit: string;
  yearMin: number;
  yearMax: number;
  timeseries?: Record<string, TimeseriesEndpoint>;
  // Endpoints fetched once per section with no location filter, for data on
  // every area (e.g. each county's values, to rank one among the rest).
  // Handed to the topic's Dashboard component as `data.allAreas[key]`.
  allAreas?: Record<string, string>;
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
  // Source name used in the notes shown when the report can't use the
  // profile's own areas (see geographyNotes).
  sourceLabel?: string;
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
    sourceLabel: 'CDC PLACES',
    timeseries: {
      // CDC PLACES is a single snapshot; Census rates show the change.
      povertyUninsured: {
        url: `${BASE_API_URL}/load/acs5-db/timeseries/economics/poverty-uninsured`,
        byPlaceName: true,
      },
    },
    allAreas: {
      countyValues: `${BASE_API_URL}/load/data/cdc/places/by-county`,
    },
  },
};

// The county area containing a town-type location.
function countyArea(l: Location, county: string): Location {
  return {
    ...l,
    type: 'county',
    town: null,
    name: `${county} County, Vermont`,
  };
}

// A profile saved as "Town" before a town was picked (the profile form now
// requires one) has no town and the placeholder name "Unknown". Show its
// county instead, so every section can filter and label it, and say so.
function resolveLocation(l: Location): { location: Location; note?: string } {
  if (l.type !== 'town' || l.town || !l.county) return { location: l };
  return {
    location: countyArea(l, l.county),
    note: `Your profile has Town selected but no town picked, so ${l.county} County is shown instead.`,
  };
}

// The place a section's data actually describes for a profile area: a
// county-only source (CDC PLACES) shows a town's county. Other areas are
// shown as picked (Vermont is still Vermont, just a computed figure).
function dataLocation(cfg: SectionConfig, l: Location): Location {
  if (!cfg.countyOnly || l.type !== 'town' || !l.county) return l;
  return countyArea(l, l.county);
}

// Plain-language notes for each profile area this section can't show as-is
// (e.g. a town shown with its county's numbers), so the substitution is
// visible at the top of the report rather than only in chart footnotes.
function geographyNotes(
  cfg: SectionConfig,
  primary: Location,
  comparison: Location,
): string[] {
  if (!cfg.countyOnly) return [];
  const source = cfg.sourceLabel ?? 'This data';
  const noteFor = (l: Location) => {
    switch (l.type) {
      case 'county':
        return null;
      case 'town':
        return l.county
          ? `${source} doesn't publish town-level estimates, so ${l.town ?? l.name} shows ${l.county} County's numbers.`
          : `${source} doesn't publish town-level estimates for ${l.name}.`;
      case 'state':
        return `${source} doesn't publish a statewide figure, so Vermont shows the average of its county estimates, weighted by adult population.`;
      default:
        return `${source} has no estimates for ${l.name}, so it has no data on this page.`;
    }
  };
  const notes = [noteFor(primary), noteFor(comparison)];
  const countyOf = (l: Location) =>
    l.type === 'town' || l.type === 'county' ? l.county : null;
  const shared = countyOf(primary);
  if (
    shared &&
    shared === countyOf(comparison) &&
    primary.name !== comparison.name
  ) {
    notes.push(
      `Both areas use ${shared} County's numbers, so their values are the same.`,
    );
  }
  return Array.from(new Set(notes.filter((n): n is string => !!n)));
}

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

// One slim bar stuck under the site header: back to the topic chooser, the
// topic tabs, and export. The places and year live in the report's intro.
function ReportHeader({
  section,
  data,
}: {
  section: DashboardSection;
  data: ReportData;
}) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportReport('report-body', {
        title: section,
        primaryName: data.primary.name,
        comparisonName: data.comparison.name,
        year: data.year,
      });
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box
      style={{
        position: 'sticky',
        top: 'var(--header-offset)',
        zIndex: 900,
        transition: 'top 250ms ease',
        background: COLORS.spruce,
      }}
    >
      <Container size="xl" py={8}>
        <Group justify="space-between" wrap="nowrap" gap="md">
          <Group gap="lg" wrap="nowrap" style={{ minWidth: 0 }}>
            <Anchor
              component={Link}
              href="/data-comparison/reports-by-topic/"
              size="sm"
              fw={600}
              c={COLORS.birchDim}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
              }}
            >
              <IconArrowLeft size={18} />
              Reports by Topic
            </Anchor>

            {/* Plain links, so each topic stays its own static route. */}
            <Group
              gap="lg"
              wrap="nowrap"
              style={{ overflowX: 'auto', scrollbarWidth: 'none' }}
            >
              {(Object.keys(TOPIC_SLUGS) as DashboardSection[]).map((topic) => {
                const active = topic === section;
                return (
                  <Link
                    key={topic}
                    href={topicPath(topic)}
                    scroll={false}
                    aria-current={active ? 'page' : undefined}
                    style={{
                      flexShrink: 0,
                      padding: '4px 2px',
                      fontSize: 14,
                      fontWeight: active ? 700 : 500,
                      color: active ? COLORS.birch : 'rgba(238,235,224,.7)',
                      textDecoration: 'none',
                      borderBottom: `3px solid ${active ? COLORS.amber : 'transparent'}`,
                    }}
                  >
                    {topic}
                  </Link>
                );
              })}
            </Group>
          </Group>
          <Button
            size="xs"
            variant="white"
            color={COLORS.spruce}
            leftSection={<IconDownload size={14} />}
            loading={exporting}
            onClick={handleExport}
            style={{ flexShrink: 0 }}
          >
            Export PDF
          </Button>
        </Group>
      </Container>
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
  const { myLocation: profileLocation, comparison: profileComparison } =
    useProfile();
  // Everything below uses the resolved areas (see resolveLocation).
  const primaryPick = useMemo(
    () => resolveLocation(profileLocation),
    [profileLocation],
  );
  const comparisonPick = useMemo(
    () => resolveLocation(profileComparison),
    [profileComparison],
  );
  const myLocation = primaryPick.location;
  const comparison = comparisonPick.location;
  const [primaryData, setPrimaryData] = useState<DataRow[]>([]);
  const [compareData, setCompareData] = useState<DataRow[]>([]);
  const [timeseriesData, setTimeseriesData] = useState<
    Record<string, { primary: DataRow[]; comparison: DataRow[] }>
  >({});
  const [allAreasData, setAllAreasData] = useState<Record<string, DataRow[]>>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const fetchFrom = (
      url: string,
      location: Location,
      endpoint?: TimeseriesEndpoint,
    ) => {
      const locationFilters = endpoint?.byPlaceName
        ? { Location: [location.name] }
        : buildLocationFilters(cfg, location);
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
    // Ignore a response once the locations change again: the first fetch
    // (made before the saved profile loads) can otherwise land last and
    // show the default places' numbers under the profile's names.
    let cancelled = false;

    Promise.all([
      fetchFrom(cfg.url, myLocation),
      fetchFrom(cfg.url, comparison),
      ...timeseriesKeys.map((key) =>
        fetchFrom(cfg.timeseries![key].url, myLocation, cfg.timeseries![key]),
      ),
      ...timeseriesKeys.map((key) =>
        fetchFrom(cfg.timeseries![key].url, comparison, cfg.timeseries![key]),
      ),
    ])
      .then(([primary, comp, ...tsResults]) => {
        if (cancelled) return;
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
      .catch(() => {
        if (!cancelled) setError('Failed to load data. Is the API running?');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // .name changes whenever type/county/town does (it's derived from them),
    // so it's a reliable proxy for "the location changed" without needing
    // the whole objects in the dependency array.
  }, [section, myLocation.name, comparison.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Section-wide data (cfg.allAreas) doesn't depend on the locations, so it's
  // fetched once per section. Like timeseries, a failed endpoint falls back
  // to no rows, since it's supplementary.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const endpoints = SECTIONS[section].allAreas ?? {};
    const keys = Object.keys(endpoints);
    let cancelled = false;
    Promise.all(
      keys.map((key) =>
        axios
          .post(endpoints[key], { filters: {}, include: [] })
          .then((r) => (Array.isArray(r.data?.data) ? r.data.data : []))
          .catch(() => []),
      ),
    ).then((results) => {
      if (!cancelled) {
        setAllAreasData(
          Object.fromEntries(keys.map((key, i) => [key, results[i]])),
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [section]);

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

  // Always the latest year available; there's no year picker.
  const year = availableYears.length ? Math.max(...availableYears) : 0;

  // ---------------------------------------------------------------------------
  // Slice to the latest year
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

  // Charts are labeled with the place the section's data actually describes
  // (e.g. a town's county on Community Health), not the profile's choice;
  // the notes above the report explain any substitution.
  const dashboardData = useMemo<ReportData>(() => {
    const cfg = SECTIONS[section];
    const primaryPlace = dataLocation(cfg, myLocation);
    const comparisonPlace = dataLocation(cfg, comparison);
    return {
      year,

      primary: {
        current: primaryForYear,
        history: primaryData,
        name: primaryPlace.name,
        location: primaryPlace,
      },

      comparison: {
        current: compareForYear,
        history: compareData,
        name: comparisonPlace.name,
        location: comparisonPlace,
      },

      timeseries: timeseriesData,
      allAreas: allAreasData,
    };
  }, [
    section,
    year,
    primaryForYear,
    compareForYear,
    primaryData,
    compareData,
    timeseriesData,
    allAreasData,
    myLocation,
    comparison,
  ]);

  const dashboards: Partial<Record<DashboardSection, React.ComponentType>> = {
    Demographics: DemographicsDashboard,
    Housing: HousingDashboard,
    //Education: EducationDashboard, //Temporarily down until more education data gathered
    'Labor & Economy': EconomicDashboard,
    'Land Use': LandUseDashboard,
    'Community Health': HealthDashboard,
  };

  const Dashboard = dashboards[section];
  const areaNotes = Array.from(
    new Set([
      ...[primaryPick.note, comparisonPick.note].filter(
        (n): n is string => !!n,
      ),
      ...geographyNotes(SECTIONS[section], myLocation, comparison),
    ]),
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      <ReportHeader section={section} data={dashboardData} />
      <Container size="xl" mb="xl" mt="md">
        {error && <Text c="red">{error}</Text>}
        {areaNotes.length > 0 && (
          <Alert
            color="orange"
            variant="light"
            radius="md"
            mb="lg"
            icon={<IconInfoCircle />}
            title="Some areas differ from your profile"
          >
            <Stack gap={4}>
              {areaNotes.map((note) => (
                <Text size="sm" key={note}>
                  {note}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}
        {loading ? (
          <Paper radius="lg" p={60} withBorder>
            <Stack align="center">
              <Loader color="#dd9a2f" type="dots" />
              <Text c="dimmed">Loading data...</Text>
            </Stack>
          </Paper>
        ) : (
          Dashboard && (
            <ReportProvider topic={section} data={dashboardData}>
              <div id="report-body">
                <Dashboard />
              </div>
            </ReportProvider>
          )
        )}
      </Container>
    </>
  );
}

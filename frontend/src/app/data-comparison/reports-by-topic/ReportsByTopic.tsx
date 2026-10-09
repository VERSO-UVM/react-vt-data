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
import {
  useProfile,
  useProfileHydrated,
  Location,
} from '@/components/profile/profileStore';
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
import {
  SECTIONS,
  TimeseriesEndpoint,
  dataLocation,
  geographyNotes,
  postSection,
  resolveLocation,
} from './reportData';
import { DashboardSection, TOPIC_SLUGS, topicPath } from './topics';

// One slim bar stuck under the site header: back to the topic chooser, the
// topic tabs, and export. The places and year live in the report's intro.
function ReportHeader({
  section,
  data,
  exporting,
  setExporting,
}: {
  section: DashboardSection;
  data: ReportData;
  exporting: boolean;
  setExporting: (v: boolean) => void;
}) {
  const handleExport = async () => {
    setExporting(true);
    try {
      // Let the charts re-render without animation (see ReportContext's
      // `exporting`) so the capture isn't a half-drawn frame.
      await new Promise((resolve) => setTimeout(resolve, 400));
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
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Skip the hydration render's default locations (see useProfileHydrated).
  const hydrated = useProfileHydrated();

  // ---------------------------------------------------------------------------
  // Fetch both locations whenever section or location names change — plus,
  // for every endpoint the section declares under `timeseries`, the same two
  // locations again. A single failed timeseries endpoint (e.g. no data for a
  // given town) falls back to an empty series instead of failing the whole
  // section, since it's supplementary to the primary table.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!hydrated) return;
    const cfg = SECTIONS[section];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch effect: reset status before the async request
    setLoading(true);
    setError(null);

    const fetchFrom = (
      url: string,
      location: Location,
      endpoint?: TimeseriesEndpoint,
    ) => postSection(cfg, url, location, endpoint);

    const timeseriesKeys = Object.keys(cfg.timeseries ?? {});
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
  }, [hydrated, section, myLocation.name, comparison.name]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <ReportHeader
        section={section}
        data={dashboardData}
        exporting={exporting}
        setExporting={setExporting}
      />
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
            <ReportProvider
              topic={section}
              data={dashboardData}
              exporting={exporting}
            >
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

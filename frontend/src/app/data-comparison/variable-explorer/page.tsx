'use client';
import {
  Select,
  Center,
  Paper,
  Text,
  SegmentedControl,
  Loader,
  Box,
  ActionIcon,
  Tooltip as MantineTooltip,
  Group,
  Stack,
  Title,
  Collapse,
  Button,
  SimpleGrid,
  useMantineTheme,
} from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronDown,
  IconChevronUp,
  IconChartScatter,
  IconAdjustments,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import type { FeatureCollection } from 'geojson';
import { BASE_API_URL } from '@/config';
import { COLORS, FONTS } from '@/app/theme';
import VTMap from '@/components/mapping';
import VariableScatter from '@/components/Charts/MapCorrespondentScatter';
import { CascadeFilter } from '@/components/FilterRedux/CascadeUI';
import { assemble } from '@/components/FilterRedux/apiHelpers';
import { postRequest } from '@/components/FilterRedux/filterRequest';
import { FilterSpec, FilterValue } from '@/components/FilterRedux/filterTypes';
import { ChartItem, DataRow } from '@/types/cachedCharts';
import { SamePerXBarChart } from '@/components/Charts';

type Legend = {
  grid: number[][][];
  measures: [string, string];
  edges_x: number[];
  edges_y: number[];
};

type DatasetInfo = {
  label: string;
  filter_table: string;
  levels: string[];
  // Usually the same table for every level; CDC is the exception, since its
  // Variable/Prevalence Measure catalog differs between county and tract
  // (tracts never get an age-adjusted estimate). Prefer this over the flat
  // `filter_table` above when a level is already known.
  level_filter_tables: Record<string, string>;
};

type DatasetRegistry = Record<string, DatasetInfo>;

const LEVEL_LABELS: Record<string, string> = {
  county: 'County',
  town: 'Town',
  tract: 'Census Tract',
};

// Matches the ValueErrors query/comparison.py raises (surfaced by FastAPI as
// {detail: "..."}), so a known data-availability gap -- e.g. a measure with
// no rows at the selected geography level -- gets a specific message instead
// of the generic fallback below.
const NO_DATA_RE = /^no data for [^/]+\/([^:]+): '(.+)'$/;
const NO_OVERLAP_RE =
  /^no shared geographies between [^/]+\/'(.+?)' and [^/]+\/'(.+?)' at the (\S+) level$/;

function describeApplyError(e: unknown): string {
  const detail =
    axios.isAxiosError(e) && typeof e.response?.data?.detail === 'string'
      ? e.response.data.detail
      : null;

  const noData = detail ? NO_DATA_RE.exec(detail) : null;
  if (noData) {
    const [, lvl, variable] = noData;
    const levelLabel = LEVEL_LABELS[lvl] ?? lvl;
    return `"${variable}" isn't available at the ${levelLabel} level — try a different variable or geography level.`;
  }

  const noOverlap = detail ? NO_OVERLAP_RE.exec(detail) : null;
  if (noOverlap) {
    const [, var1, var2, lvl] = noOverlap;
    const levelLabel = LEVEL_LABELS[lvl] ?? lvl;
    return `"${var1}" and "${var2}" don't share any geographies at the ${levelLabel} level — try a different pair or geography level.`;
  }

  return 'Could not compare those variables — try a different pair.';
}

const CELL = 34;
const GAP = 2;
const SIZE = 3 * CELL + 2 * GAP;
const CUTS = [1, 2].map((i) => i * CELL + (i - 0.5) * GAP);

const CROWDED_ROW_THRESHOLD = 10;

const rgba = (c: number[]) => `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 255})`;
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

type Point = { x: number; y: number };

function computePairStats(points: Point[]) {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (const p of points) {
    const dx = p.x - mx;
    const dy = p.y - my;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const denom = Math.sqrt(denX * denY);
  const r = denom === 0 ? 0 : num / denom;
  return { n, r, r2: r * r };
}

function computeDistribution(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const median =
    n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[(n - 1) / 2];
  return { mean, median, min: sorted[0], max: sorted[n - 1] };
}

function StatCard({
  label,
  rows,
}: {
  label: string;
  rows: { k: string; v: string }[];
}) {
  return (
    <Paper
      withBorder
      p="md"
      radius="sm"
      style={{ backgroundColor: COLORS.birch, borderColor: COLORS.line }}
    >
      <Center>
        <Text size="sm" fw={700} c="dimmed" tt="uppercase" mb={4} lineClamp={1}>
          {label}
        </Text>
      </Center>
      <Stack gap={2} mt={10}>
        {rows.map((r) => (
          <Group key={r.k} justify="space-between" gap={4} wrap="nowrap">
            <Text size="sm" c="dimmed">
              {r.k}
            </Text>
            <Text size="md" fw={600}>
              {r.v}
            </Text>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}

function BigStat({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Paper
      withBorder
      p="md"
      radius="sm"
      style={{
        backgroundColor: COLORS.birch,
        borderColor: COLORS.line,
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <MantineTooltip label={description} multiline w={240}>
        <ActionIcon
          variant="transparent"
          size="md"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: COLORS.slate,
          }}
        >
          <IconInfoCircle size={20} stroke={1.5} />
        </ActionIcon>
      </MantineTooltip>
      <Text size="sm" fw={700} c="dimmed" tt="uppercase" mb={4}>
        {label}
      </Text>
      <Text
        size="28px"
        fw={700}
        style={{ color: COLORS.spruce, fontFamily: FONTS.mono }}
      >
        {value}
      </Text>
    </Paper>
  );
}

// 3 X 3 bivariate legend.
function BivariateLegend({ legend }: { legend: Legend }) {
  const { grid, measures, edges_x, edges_y } = legend;
  const cutX = edges_x.slice(1, -1);
  const cutY = edges_y.slice(1, -1);

  return (
    <Paper
      withBorder
      p="sm"
      radius="md"
      mt="md"
      style={{ borderColor: COLORS.line, backgroundColor: COLORS.birch }}
    >
      <Text size="xs" c="dimmed" mb={8}>
        Regions are shaded by both variables at once — darker means higher on
        both.
      </Text>
      <Text size="xs" fw={500} title={measures[1]} lineClamp={2} mb={4}>
        ↑ {measures[1]}
      </Text>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', width: 26, height: SIZE }}>
          {cutY.map((v, i) => (
            <Text
              key={i}
              size="10px"
              c="dimmed"
              style={{
                position: 'absolute',
                right: 0,
                top: SIZE - CUTS[i],
                transform: 'translateY(-50%)',
              }}
            >
              {fmt(v)}
            </Text>
          ))}
        </div>

        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(3, ${CELL}px)`,
              gap: GAP,
              borderRadius: 4,
              overflow: 'hidden',
              width: SIZE,
            }}
          >
            {[2, 1, 0].map((y) =>
              [0, 1, 2].map((x) => (
                <div
                  key={`${x}-${y}`}
                  style={{
                    width: CELL,
                    height: CELL,
                    backgroundColor: rgba(grid[y][x]),
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                  }}
                />
              )),
            )}
          </div>

          <div style={{ position: 'relative', height: 14, width: SIZE }}>
            {cutX.map((v, i) => (
              <Text
                key={i}
                size="10px"
                c="dimmed"
                style={{
                  position: 'absolute',
                  left: CUTS[i],
                  transform: 'translateX(-50%)',
                }}
              >
                {fmt(v)}
              </Text>
            ))}
          </div>

          <Text
            size="xs"
            fw={500}
            ta="center"
            title={measures[0]}
            style={{ maxWidth: SIZE }}
            lineClamp={2}
          >
            {measures[0]} →
          </Text>
        </div>
      </div>
    </Paper>
  );
}

const selectStyles = {
  label: {
    fontFamily: FONTS.body,
    marginBottom: 6,
    color: COLORS.slate,
    fontWeight: 600,
  },
  input: { borderRadius: 8 },
};

// One variable's whole pick, source dataset through cascade, together in one
// card -- so choosing a source doesn't require leaving this card to a
// separate, shared dataset picker before its own Category/Measure controls
// even appear.
function VariableCard({
  title,
  dataset,
  datasetOptions,
  onDatasetChange,
  filterTable,
  filters,
  setFilters,
}: {
  title: string;
  dataset: string | null;
  datasetOptions: { value: string; label: string }[];
  onDatasetChange: (value: string | null) => void;
  filterTable: string | null;
  filters: Record<string, FilterValue>;
  setFilters: (f: Record<string, FilterValue>) => void;
}) {
  return (
    <Paper
      withBorder
      radius="md"
      p="sm"
      style={{ borderColor: COLORS.line, backgroundColor: COLORS.birch }}
    >
      <Text
        size="sm"
        fw={700}
        mb="sm"
        style={{ fontFamily: FONTS.body, color: COLORS.ink }}
      >
        {title}
      </Text>
      <Select
        label="Topic"
        data={datasetOptions}
        value={dataset}
        onChange={onDatasetChange}
        allowDeselect={false}
        mb="sm"
        styles={selectStyles}
      />
      {filterTable && (
        <CascadeFilter
          spec={{ filter_table: filterTable, filters }}
          setValue={setFilters}
        />
      )}
    </Paper>
  );
}

export default function VariableExplorer() {
  const theme = useMantineTheme();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);

  const [registry, setRegistry] = useState<DatasetRegistry | null>(null);
  const [dataset1, setDataset1] = useState<string | null>(null);
  const [dataset2, setDataset2] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [filters1, setFilters1] = useState<Record<string, FilterValue>>({});
  const [filters2, setFilters2] = useState<Record<string, FilterValue>>({});

  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [legend, setLegend] = useState<Legend | null>(null);
  const [indexChart, setIndexChart] = useState<ChartItem | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const bothCDC = dataset1 === 'cdc' && dataset2 === 'cdc';

  // Load the dataset registry once
  useEffect(() => {
    axios
      .get(`${BASE_API_URL}/load/mapping/compare/datasets`)
      .then((r) => {
        const data: DatasetRegistry = r.data;
        setRegistry(data);
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          setDataset1(firstKey);
          setDataset2(firstKey);
          setLevel(data[firstKey].levels[0]);
        }
      })
      .catch((e) => console.error('dataset registry fetch failed', e));
  }, []);

  // The composite index is a CDC-only, whole-dataset summary, independent of
  // which two measures are picked — refetch whenever the level changes,
  // while both sides remain CDC. (Resets happen in the select handlers, not
  // here, so this effect never sets state synchronously in its body.)
  useEffect(() => {
    if (!bothCDC || !level) return;
    let cancelled = false;
    const url = `${BASE_API_URL}/load/mapping/compare/cdc/${level}/composite_index`;
    axios
      .post(url, [])
      .then((r) => {
        if (cancelled) return;
        const rows: DataRow[] = r.data.data;
        const sorted = [...rows].sort(
          (a, b) => Number(b['Composite Index']) - Number(a['Composite Index']),
        );
        const wasSliced = sorted.length > CROWDED_ROW_THRESHOLD;
        const data = wasSliced
          ? [...sorted.slice(0, 5), ...sorted.slice(-5)]
          : sorted;
        const direction =
          'A higher score means a higher health burden (worse outcomes ' +
          'on most measures); a lower or negative score means a lower ' +
          'burden (better outcomes).';
        setIndexChart({
          id: `cdc-${level}-composite`,
          title:
            'Community Health Composite Index (Higher = Higher Health Burden)',
          type: 'chart',
          subtype: 'bar',
          xField: 'Name',
          yField: 'Composite Index',
          chartParams: { datakeys: [['Composite Index', '#3b7dd8']] },
          data,
          description: wasSliced
            ? `The Composite Index summarizes every CDC Places measure into a single score using Principal Component Analysis (PCA), standardized against the Vermont average for this geography level. ${direction} Showing only the 5 highest- and 5 lowest-burden regions.`
            : `The Composite Index summarizes every CDC Places measure into a single score using Principal Component Analysis (PCA), standardized against the Vermont average for this geography level. ${direction}`,
        });
        setIndexError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setIndexChart(null);
        setIndexError(
          'Not enough shared data to compute a composite index for this selection.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [bothCDC, level]);

  const resetComparison = () => {
    setGeojson(null);
    setLegend(null);
    setApplyError(null);
    setIndexChart(null);
    setIndexError(null);
    setHoveredId(null);
  };

  // Level options are the geography levels BOTH chosen datasets support —
  // e.g. CDC (county/tract) paired with Demographics (county/town) can only
  // ever compare at the county level.
  const sharedLevels = (ds1: string, ds2: string, reg: DatasetRegistry) =>
    reg[ds1].levels.filter((lvl) => reg[ds2].levels.includes(lvl));

  const handleSelectDataset1 = (value: string | null) => {
    if (!value || !registry || !dataset2) return;
    setDataset1(value);
    setFilters1({}); // old Category/Measure picks don't exist in the new dataset
    const shared = sharedLevels(value, dataset2, registry);
    setLevel((prev) => (prev && shared.includes(prev) ? prev : shared[0]));
    resetComparison();
  };

  const handleSelectDataset2 = (value: string | null) => {
    if (!value || !registry || !dataset1) return;
    setDataset2(value);
    setFilters2({});
    const shared = sharedLevels(dataset1, value, registry);
    setLevel((prev) => (prev && shared.includes(prev) ? prev : shared[0]));
    resetComparison();
  };

  const handleSelectLevel = (value: string) => {
    setLevel(value);
    // Category/Measure picks stay put -- CascadeFilter itself drops only the
    // level(s) that don't exist in the new table (e.g. tract has no
    // "Age-adjusted prevalence") and re-defaults just that one, so switching
    // county <-> tract doesn't throw away an otherwise-still-valid pick.
    resetComparison();
  };

  const handleApply = async (specs: FilterSpec[]) => {
    if (!level) return;
    const payload = assemble(specs);
    if (payload.length !== 2) {
      setApplyError('Choose both Variable 1 and Variable 2 to compare.');
      return;
    }
    setApplyError(null);
    try {
      const url = `${BASE_API_URL}/load/mapping/compare/${level}`;
      const res = await postRequest({ dataURL: url, payload });
      setGeojson(res.data);
      setLegend(res.metadata?.legend ?? null);
    } catch (e) {
      setGeojson(null);
      setLegend(null);
      setApplyError(describeApplyError(e));
    }
  };

  const handleApplyClick = () => {
    if (!filterTable1 || !filterTable2) return;
    handleApply([
      { filter_table: filterTable1, filters: filters1 },
      { filter_table: filterTable2, filters: filters2 },
    ]);
  };

  const handleResetClick = () => {
    setFilters1({});
    setFilters2({});
    resetComparison();
  };

  const datasetOptions = registry
    ? Object.entries(registry).map(([value, info]) => ({
        value,
        label: info.label,
      }))
    : [];

  const levelOptions =
    (registry &&
      dataset1 &&
      dataset2 &&
      sharedLevels(dataset1, dataset2, registry)) ||
    [];

  // Each variable's cascade reads from its own dataset's filter table for the
  // currently selected level -- CDC's differs between county and tract (see
  // DatasetInfo.level_filter_tables), everything else uses one table for both.
  const filterTable1 =
    registry && dataset1 && level
      ? (registry[dataset1].level_filter_tables[level] ??
        registry[dataset1].filter_table)
      : null;
  const filterTable2 =
    registry && dataset2 && level
      ? (registry[dataset2].level_filter_tables[level] ??
        registry[dataset2].filter_table)
      : null;

  // Shared {x, y} extraction for the relationship/distribution stat cards —
  // mirrors what VariableScatter derives internally from the same geojson.
  const points: Point[] = useMemo(() => {
    if (!geojson || !legend) return [];
    const [mx, my] = legend.measures;
    return geojson.features
      .map((f) => {
        const t = (f.properties?.tooltip ?? {}) as Record<string, unknown>;
        return { x: Number(t[mx]), y: Number(t[my]) };
      })
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  }, [geojson, legend]);

  const pairStats = useMemo(
    () => (points.length > 1 ? computePairStats(points) : null),
    [points],
  );
  const xStats = useMemo(
    () => (points.length ? computeDistribution(points.map((p) => p.x)) : null),
    [points],
  );
  const yStats = useMemo(
    () => (points.length ? computeDistribution(points.map((p) => p.y)) : null),
    [points],
  );

  const scatterTile = geojson && (
    <VariableScatter
      geojson={geojson}
      legend={legend}
      activeId={hoveredId}
      onPointHover={setHoveredId}
    />
  );
  const indexTile = bothCDC && indexChart && (
    <div style={{ height: 320 }}>
      <SamePerXBarChart chart={indexChart} />
    </div>
  );
  const indexErrorTile = bothCDC && !indexChart && indexError && (
    <Text size="sm" c="dimmed" ta="center" mt="xl">
      {indexError}
    </Text>
  );

  return (
    <Box
      style={{
        position: 'relative',
        width: '100vw',
        height: 'calc(100vh - 80px)',
        overflow: 'hidden',
        backgroundColor: 'var(--mantine-color-body)',
        fontFamily: theme.fontFamily,
      }}
    >
      <Box style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <VTMap
          geojson={geojson}
          showCountyLines={false}
          initialZoom={8}
          onFeatureHover={setHoveredId}
          highlightId={hoveredId}
        />
      </Box>

      {/* Geography level -- lives outside the collapsible sidebar since it
          applies to both variables and should stay visible either way. */}
      {levelOptions.length > 1 && (
        <Paper
          shadow="md"
          radius="md"
          p="xs"
          withBorder
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6} ta="center">
            Geography Level
          </Text>
          <SegmentedControl
            autoContrast
            color={COLORS.spruce}
            radius="md"
            data={levelOptions.map((lvl) => ({
              label: LEVEL_LABELS[lvl] ?? lvl,
              value: lvl,
            }))}
            value={level ?? levelOptions[0]}
            onChange={handleSelectLevel}
            style={{ fontFamily: FONTS.mono }}
          />
        </Paper>
      )}

      {/* Floating sidebar */}
      <Box
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 0,
        }}
      >
        <Paper
          shadow="md"
          radius="md"
          p="md"
          withBorder
          style={{
            width: sidebarOpen ? 340 : 0,
            opacity: sidebarOpen ? 1 : 0,
            overflow: 'hidden',
            pointerEvents: sidebarOpen ? 'all' : 'none',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            maxHeight: 'calc(100vh - 160px)',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Title
            order={3}
            mb="xs"
            style={{ fontFamily: theme.headings?.fontFamily, fontSize: 18 }}
          >
            Variable Relationship Map
          </Title>

          <Box style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
            {!registry ? (
              <Loader size="sm" my="md" color="green" />
            ) : (
              <>
                <Stack gap="md">
                  <VariableCard
                    title="Variable 1"
                    dataset={dataset1}
                    datasetOptions={datasetOptions}
                    onDatasetChange={handleSelectDataset1}
                    filterTable={filterTable1}
                    filters={filters1}
                    setFilters={setFilters1}
                  />
                  <VariableCard
                    title="Variable 2"
                    dataset={dataset2}
                    datasetOptions={datasetOptions}
                    onDatasetChange={handleSelectDataset2}
                    filterTable={filterTable2}
                    filters={filters2}
                    setFilters={setFilters2}
                  />
                </Stack>

                <Group grow mt="md">
                  <Button variant="default" onClick={handleResetClick}>
                    Reset
                  </Button>
                  <Button color={COLORS.spruce} onClick={handleApplyClick}>
                    Apply
                  </Button>
                </Group>

                {applyError && (
                  <Text size="xs" c="red" mt="sm">
                    {applyError}
                  </Text>
                )}

                {legend && <BivariateLegend legend={legend} />}
              </>
            )}
          </Box>
        </Paper>

        <Paper
          shadow="md"
          radius="md"
          style={{
            borderTopLeftRadius: sidebarOpen ? 0 : undefined,
            borderBottomLeftRadius: sidebarOpen ? 0 : undefined,
            marginLeft: sidebarOpen ? -1 : 0,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            size="xl"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
            px={sidebarOpen ? 'xs' : 'md'}
            style={{
              minWidth: sidebarOpen ? 40 : 110,
              transition: 'all 0.2s ease',
            }}
          >
            {sidebarOpen ? (
              <IconChevronLeft size={18} />
            ) : (
              <Group gap={6} align="center" wrap="nowrap">
                <Text size="sm" fw={600}>
                  Filters
                </Text>
                <IconAdjustments size={22} stroke={1.5} />
              </Group>
            )}
          </ActionIcon>
        </Paper>
      </Box>

      {/* Floating analytics panel */}
      <Paper
        shadow="lg"
        withBorder
        style={{
          position: 'absolute',
          bottom: 0,
          left: sidebarOpen ? 370 : 16,
          right: 16,
          zIndex: 10,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          transition: 'left 0.3s ease',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Group
          justify="space-between"
          px="md"
          py="xs"
          onClick={() => setAnalyticsOpen(!analyticsOpen)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <Group gap="xs">
            <IconChartScatter size={16} color={COLORS.spruce} />
            <Text
              size="xs"
              fw={700}
              style={{ fontFamily: theme.headings?.fontFamily }}
            >
              RELATIONSHIP ANALYTICS
            </Text>
            {pairStats && (
              <Group gap="xs">
                <Text size="md" c="dimmed" ml="sm">
                  N={pairStats.n}
                </Text>
                <Text size="md" c="dimmed" ml="sm">
                  |
                </Text>
                <Text size="md" c="dimmed" ml="sm">
                  R={pairStats.r.toFixed(2)}
                </Text>
              </Group>
            )}
          </Group>

          <Button
            variant="subtle"
            size="compact-xs"
            color="gray"
            rightSection={
              analyticsOpen ? (
                <IconChevronDown size={14} />
              ) : (
                <IconChevronUp size={14} />
              )
            }
          >
            {analyticsOpen ? 'Collapse' : 'Expand Insights'}
          </Button>
        </Group>

        <Collapse expanded={analyticsOpen}>
          <Box p="md" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
            {!geojson ? (
              <Text size="sm" c="dimmed" ta="center" my="xl">
                Apply Variable 1 and Variable 2 in the sidebar to see the
                relationship analysis.
              </Text>
            ) : (
              <Stack gap="md">
                <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                  <Paper
                    withBorder
                    p="sm"
                    radius="sm"
                    style={{ borderColor: COLORS.line }}
                  >
                    {scatterTile}
                  </Paper>

                  <Stack gap="md">
                    {pairStats && (
                      <SimpleGrid cols={2} spacing="md">
                        <BigStat
                          label="Pearson's R"
                          value={pairStats.r.toFixed(2)}
                          description="The strength and direction of the relationship, from -1 to 1. R = 0.8 is a strong positive relationship (both rise together); R = -0.8 is a strong negative one; R near 0 means little to no relationship."
                        />
                        <BigStat
                          label="R²"
                          value={pairStats.r2.toFixed(2)}
                          description="The share of one variable's variation that is associated with the other, from 0 to 1. R² = 0.64 means 64% of the variation aligns between the two variables."
                        />
                      </SimpleGrid>
                    )}

                    {legend && (xStats || yStats) && (
                      <SimpleGrid cols={2} spacing="md">
                        {xStats && (
                          <StatCard
                            label={legend.measures[0]}
                            rows={[
                              { k: 'Mean', v: fmt(xStats.mean) },
                              { k: 'Median', v: fmt(xStats.median) },
                              { k: 'Min', v: fmt(xStats.min) },
                              { k: 'Max', v: fmt(xStats.max) },
                            ]}
                          />
                        )}
                        {yStats && (
                          <StatCard
                            label={legend.measures[1]}
                            rows={[
                              { k: 'Mean', v: fmt(yStats.mean) },
                              { k: 'Median', v: fmt(yStats.median) },
                              { k: 'Min', v: fmt(yStats.min) },
                              { k: 'Max', v: fmt(yStats.max) },
                            ]}
                          />
                        )}
                      </SimpleGrid>
                    )}
                  </Stack>
                </SimpleGrid>

                {indexTile}
                {indexErrorTile}
              </Stack>
            )}
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
}

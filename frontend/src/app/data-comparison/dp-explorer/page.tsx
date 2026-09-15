'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Container,
  Grid,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Stepper,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChartLineIcon,
  CheckIcon,
  InfoIcon,
  MapPinIcon,
  MinusIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import { useProfile } from '@/components/profile/profileStore';
import { BASE_API_URL } from '@/config';
import { ChartStack } from '@/components/Charts';
import { createChartItem } from '@/utils/itemFactory';
import county_town_names from '@/data/county_town_names.json';
import { DataRow } from '@/types/cachedCharts';
import { COLORS, FONTS } from '@/app/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CountyKey = keyof typeof county_town_names;

interface TreeRow {
  table: string;
  Category: string;
  Subcategory: string;
  Variable: string;
  Measure: string;
}

interface SideState {
  geoType: 'county' | 'town';
  county: string;
  town: string | null;
  year: number;
}

// ---------------------------------------------------------------------------
// DP table friendly names
// ---------------------------------------------------------------------------

const TABLE_LABELS: Record<string, string> = {
  DP02: 'DP02 — Social Characteristics',
  DP03: 'DP03 — Economic Characteristics',
  DP04: 'DP04 — Housing Characteristics',
  DP05: 'DP05 — Demographic Profile',
};

// ---------------------------------------------------------------------------
// Shared styling
// ---------------------------------------------------------------------------

const panelStyle = {
  borderColor: COLORS.line,
  backgroundColor: '#fff',
};

const selectStyles = {
  label: {
    fontFamily: FONTS.body,
    marginBottom: 6,
    color: COLORS.slate,
    fontWeight: 600,
  },
  input: { borderRadius: 8 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const unique = (rows: TreeRow[], key: keyof TreeRow) =>
  Array.from(new Set(rows.map((r) => r[key]))).sort();

const makeName = (side: SideState) =>
  side.geoType === 'county'
    ? `${side.county} County, Vermont`
    : `${side.town}, ${side.county} County, Vermont`;

const makeLabel = (side: SideState) =>
  side.geoType === 'county'
    ? `${side.county} County (${side.year})`
    : `${side.town} (${side.year})`;

// ---------------------------------------------------------------------------
// Sub-component: per-side location + year selector
// ---------------------------------------------------------------------------

const SideSelector = ({
  title,
  accent,
  side,
  setSide,
  availableYears,
}: {
  title: string;
  accent: string;
  side: SideState;
  setSide: (s: SideState) => void;
  availableYears: number[];
}) => {
  const counties = Object.keys(county_town_names) as CountyKey[];
  const towns = county_town_names[side.county as CountyKey] ?? [];

  return (
    <Stack gap="xs">
      <Text
        size="xs"
        fw={700}
        tt="uppercase"
        style={{
          fontFamily: FONTS.mono,
          letterSpacing: '0.08em',
          color: accent,
        }}
      >
        {title}
      </Text>
      <Select
        label="County"
        value={side.county}
        onChange={(v) =>
          v && setSide({ ...side, county: v, town: null, geoType: 'county' })
        }
        data={counties.map((c) => ({ value: c, label: c }))}
        searchable
        size="sm"
        styles={selectStyles}
      />
      <Select
        label="Town (optional)"
        value={side.town ?? ''}
        onChange={(v) =>
          setSide({
            ...side,
            town: v || null,
            geoType: v ? 'town' : 'county',
          })
        }
        data={[
          { value: '', label: '— County level —' },
          ...towns.map((t) => ({ value: t, label: t })),
        ]}
        searchable
        clearable
        size="sm"
        styles={selectStyles}
      />
      <Select
        label="Year"
        value={String(side.year)}
        onChange={(v) => v && setSide({ ...side, year: Number(v) })}
        data={availableYears.map((y) => ({
          value: String(y),
          label: String(y),
        }))}
        size="sm"
        disabled={availableYears.length === 0}
        styles={selectStyles}
      />
      <Text size="xs" c="dimmed" mt={2} style={{ fontFamily: FONTS.mono }}>
        {makeName(side)}
      </Text>
    </Stack>
  );
};

// ---------------------------------------------------------------------------
// Sub-component: point-in-time value card
// ---------------------------------------------------------------------------

function ValueCard({
  label,
  location,
  value,
  accent,
}: {
  label: string;
  location: string;
  value: string;
  accent: string;
}) {
  return (
    <Paper
      withBorder
      radius="lg"
      p="lg"
      style={{ ...panelStyle, height: '100%' }}
    >
      <Text
        size="xs"
        fw={700}
        tt="uppercase"
        style={{
          fontFamily: FONTS.mono,
          letterSpacing: '0.08em',
          color: accent,
        }}
      >
        {label}
      </Text>
      <Text size="sm" c="dimmed" mt={2} mb={12} lineClamp={1}>
        {location}
      </Text>
      <Text
        style={{
          fontFamily: FONTS.display,
          fontSize: 34,
          fontWeight: 700,
          color: COLORS.ink,
          lineHeight: 1,
        }}
      >
        {value}
      </Text>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: A vs B difference indicator
// ---------------------------------------------------------------------------

function DeltaBadge({
  diff,
  isPercent,
}: {
  diff: number | null;
  isPercent: boolean;
}) {
  if (diff == null || Number.isNaN(diff)) {
    return (
      <Text size="xs" c="dimmed" ta="center">
        —
      </Text>
    );
  }

  const Icon = diff > 0 ? ArrowUpIcon : diff < 0 ? ArrowDownIcon : MinusIcon;
  const magnitude = Math.abs(diff);
  const display = isPercent
    ? `${magnitude.toFixed(1)} pts`
    : magnitude.toLocaleString(undefined, { maximumFractionDigits: 1 });

  return (
    <Stack align="center" gap={4}>
      <ThemeIcon size={40} radius="xl" variant="light" color={COLORS.spruce}>
        <Icon size={18} weight="bold" />
      </ThemeIcon>
      <Text fw={700} size="sm" style={{ color: COLORS.spruce }}>
        {display}
      </Text>
      <Text
        c="dimmed"
        tt="uppercase"
        style={{
          fontFamily: FONTS.mono,
          fontSize: 10,
          letterSpacing: '0.06em',
        }}
      >
        difference
      </Text>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: centered placeholder / status panel
// ---------------------------------------------------------------------------

function StatusPanel({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Paper withBorder radius="lg" p="xl" style={panelStyle}>
      <Stack align="center" gap={8}>
        <ThemeIcon size={44} radius="xl" variant="light" color="gray">
          {icon}
        </ThemeIcon>
        <Text c="dimmed" size="sm" ta="center" maw={420}>
          {children}
        </Text>
      </Stack>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DPExplorerPage() {
  const { myLocation, comparison, yearMax } = useProfile();

  // ---------------------------------------------------------------------------
  // Side A defaults from profile myLocation
  // ---------------------------------------------------------------------------
  const defaultSideA = (): SideState => {
    if (myLocation.type === 'town' && myLocation.county && myLocation.town) {
      return {
        geoType: 'town',
        county: myLocation.county,
        town: myLocation.town,
        year: yearMax,
      };
    }
    if (myLocation.type === 'county' && myLocation.county) {
      return {
        geoType: 'county',
        county: myLocation.county,
        town: null,
        year: yearMax,
      };
    }
    // state → fallback to Chittenden county (no state data in DP tables)
    return {
      geoType: 'county',
      county: 'Chittenden',
      town: null,
      year: yearMax,
    };
  };

  const defaultSideB = (): SideState => {
    if (comparison.type === 'town' && comparison.county && comparison.town) {
      return {
        geoType: 'town',
        county: comparison.county,
        town: comparison.town,
        year: yearMax,
      };
    }
    if (comparison.type === 'county' && comparison.county) {
      return {
        geoType: 'county',
        county: comparison.county,
        town: null,
        year: yearMax,
      };
    }
    return { geoType: 'county', county: 'Addison', town: null, year: yearMax };
  };

  const [sideA, setSideA] = useState<SideState>(defaultSideA);
  const [sideB, setSideB] = useState<SideState>(defaultSideB);

  // ---------------------------------------------------------------------------
  // Global cascade tree (location-independent)
  // ---------------------------------------------------------------------------
  const [tree, setTree] = useState<TreeRow[]>([]);
  useEffect(() => {
    axios
      .get(`${BASE_API_URL}/load/acs5-db/dp-combined/tree`)
      .then((r) => setTree(r.data.data ?? []));
  }, []);

  // ---------------------------------------------------------------------------
  // Cascade state — reset downstream when upstream changes
  // ---------------------------------------------------------------------------
  const [table, setTable] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [variable, setVariable] = useState<string | null>(null);
  const [measure, setMeasure] = useState<string | null>(null);

  // Which step the stepper is showing — null means "follow the cascade
  // automatically"; set explicitly when the user clicks back to a completed
  // step to revise an earlier choice.
  const [manualStep, setManualStep] = useState<number | null>(null);

  const handleTable = (v: string | null) => {
    setTable(v);
    setCategory(null);
    setSubcategory(null);
    setVariable(null);
    setMeasure(null);
    setManualStep(null);
  };
  const handleCategory = (v: string | null) => {
    setCategory(v);
    setSubcategory(null);
    setVariable(null);
    setMeasure(null);
    setManualStep(null);
  };
  const handleSubcategory = (v: string | null) => {
    setSubcategory(v);
    setVariable(null);
    setMeasure(null);
    setManualStep(null);
  };
  const handleVariable = (v: string | null) => {
    setVariable(v);
    setMeasure(null);
    setManualStep(null);
  };
  const handleMeasure = (v: string | null) => {
    setMeasure(v);
    setManualStep(null);
  };

  // Derived options — each level filtered by all selections above it
  const filtered = useMemo(
    () =>
      tree
        .filter((r) => !table || r.table === table)
        .filter((r) => !category || r.Category === category)
        .filter((r) => !subcategory || r.Subcategory === subcategory)
        .filter((r) => !variable || r.Variable === variable),
    [tree, table, category, subcategory, variable],
  );

  const tables = useMemo(() => unique(tree, 'table'), [tree]);
  const categories = useMemo(
    () =>
      table
        ? unique(
            tree.filter((r) => r.table === table),
            'Category',
          )
        : [],
    [tree, table],
  );
  const subcategories = useMemo(
    () =>
      category
        ? unique(
            tree.filter((r) => r.table === table && r.Category === category),
            'Subcategory',
          )
        : [],
    [tree, table, category],
  );
  const variables = useMemo(
    () =>
      subcategory
        ? unique(
            tree.filter(
              (r) =>
                r.table === table &&
                r.Category === category &&
                r.Subcategory === subcategory,
            ),
            'Variable',
          )
        : [],
    [tree, table, category, subcategory],
  );
  const measures = useMemo(
    () => (variable ? unique(filtered, 'Measure') : []),
    [filtered, variable],
  );

  // Step the cascade has actually completed up to — drives the stepper's
  // active step whenever the user isn't manually revisiting an earlier one.
  const computedStep = !table
    ? 0
    : !category
      ? 1
      : !subcategory
        ? 2
        : !variable
          ? 3
          : !measure
            ? 4
            : 5;
  const activeStep = manualStep ?? computedStep;

  // ---------------------------------------------------------------------------
  // Series fetch — triggered when cascade is complete
  // ---------------------------------------------------------------------------
  const isComplete = !!(
    table &&
    category &&
    subcategory &&
    variable &&
    measure
  );

  const [sideAData, setSideAData] = useState<DataRow[]>([]);
  const [sideBData, setSideBData] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available years derived from fetched data
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const YEAR_MAX_OVERALL = new Date().getFullYear() - 2;

  useEffect(() => {
    if (!isComplete) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale results when the selection becomes incomplete
      setSideAData([]);
      setSideBData([]);
      setAvailableYears([]);
      return;
    }
    setLoading(true);
    setError(null);

    const post = (name: string) =>
      axios
        .post(`${BASE_API_URL}/load/acs5-db/dp-combined/series`, {
          name,
          table,
          category,
          subcategory,
          variable,
          measure,
          year_min: 2009,
          year_max: YEAR_MAX_OVERALL,
        })
        .then((r) => r.data);

    Promise.all([post(makeName(sideA)), post(makeName(sideB))])
      .then(([aRes, bRes]) => {
        const aData = aRes.data ?? [];
        const bData = bRes.data ?? [];
        setSideAData(aData);
        setSideBData(bData);
        const yrs = Array.from(
          new Set([...aData, ...bData].map((r: DataRow) => r.year)),
        ).sort((a, b) => Number(a) - Number(b)) as number[];
        setAvailableYears(yrs);
        // Clamp selected years to available
        if (yrs.length > 0) {
          const clamp = (y: number) =>
            yrs.includes(y)
              ? y
              : yrs.reduce((a, b) =>
                  Math.abs(b - y) < Math.abs(a - y) ? b : a,
                );
          setSideA((s) => ({ ...s, year: clamp(s.year) }));
          setSideB((s) => ({ ...s, year: clamp(s.year) }));
        }
      })
      .catch(() => setError('Failed to load. Is the API running?'))
      .finally(() => setLoading(false));
  }, [
    isComplete,
    table,
    category,
    subcategory,
    variable,
    measure,
    // stringify name to avoid object ref changes
    makeName(sideA),
    makeName(sideB),
  ]);

  // ---------------------------------------------------------------------------
  // Chart item (built from full trends for "Add to Report")
  // ---------------------------------------------------------------------------
  const chartItem = createChartItem({
    title: `${variable ?? '—'} (${measure ?? '—'})`,
    xField: 'year',
    yField: 'Value',
    subtype: 'DPTrendChart',
    data: sideAData,
    compareData: sideBData,
    categories: ['Demographics'],
    chartParams: {
      legendLabels: [makeLabel(sideA), makeLabel(sideB)],
      measure,
    },
  });

  // Selected-year point values
  const pointA = sideAData.find((r) => r.year === sideA.year);
  const pointB = sideBData.find((r) => r.year === sideB.year);
  const isPercent = !!measure?.toLowerCase().includes('percent');
  const fmtVal = (v: number | null) =>
    v != null ? (isPercent ? `${v}%` : Number(v).toLocaleString()) : '—';

  const valueA = (pointA?.Value as number | undefined) ?? null;
  const valueB = (pointB?.Value as number | undefined) ?? null;
  const diff = valueA != null && valueB != null ? valueA - valueB : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Box style={{ backgroundColor: COLORS.birch, minHeight: '100vh' }}>
      {/* Compact themed header */}
      <Box
        pt={{ base: 44, sm: 56 }}
        pb={{ base: 28, sm: 36 }}
        style={{ borderBottom: `1px solid ${COLORS.line}` }}
      >
        <Container size="md">
          <Stack gap={8} align="center">
            <Text
              style={{
                fontFamily: FONTS.mono,
                fontSize: 12,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: COLORS.slate,
              }}
            >
              Compare · Census Data Profiles
            </Text>
            <Group gap="sm" justify="center">
              <Title
                order={2}
                style={{
                  fontFamily: FONTS.display,
                  fontWeight: 600,
                  color: COLORS.spruce,
                }}
              >
                Census Variable Comparison
              </Title>
              <Badge
                style={{
                  color: COLORS.birch,
                  background: COLORS.amber,
                  fontFamily: FONTS.mono,
                }}
              >
                Beta
              </Badge>
            </Group>
            <Text c="dimmed" size="sm" maw={560} ta="center">
              Pick any American Community Survey Data Profile variable, then
              compare it side by side between two Vermont locations across the
              years it&apos;s been tracked.
            </Text>
          </Stack>
        </Container>
      </Box>

      <Container size="lg" py={{ base: 32, sm: 44 }}>
        <Stack gap="xl">
          {/* Guided variable picker */}
          <Paper withBorder radius="lg" p="lg" style={panelStyle}>
            <Group justify="space-between" align="center" mb="md">
              <Text
                fw={700}
                style={{ fontFamily: FONTS.display, color: COLORS.spruce }}
              >
                Choose a Variable
              </Text>
              {manualStep !== null && (
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  onClick={() => setManualStep(null)}
                >
                  Back to current selection
                </Button>
              )}
            </Group>

            <Stepper
              active={activeStep}
              onStepClick={(step) => {
                if (step < computedStep) setManualStep(step);
              }}
              allowNextStepsSelect={false}
              color={COLORS.spruce}
              size="sm"
            >
              <Stepper.Step
                label="Table"
                description={
                  table ? (TABLE_LABELS[table] ?? table) : 'Data Profile'
                }
              >
                <Select
                  label="Table"
                  value={table}
                  onChange={handleTable}
                  data={tables.map((t) => ({
                    value: t,
                    label: TABLE_LABELS[t] ?? t,
                  }))}
                  placeholder="Pick table…"
                  searchable
                  size="md"
                  styles={selectStyles}
                  mt="sm"
                />
              </Stepper.Step>
              <Stepper.Step
                label="Category"
                description={category ?? 'Broad topic'}
              >
                <Select
                  label="Category"
                  value={category}
                  onChange={handleCategory}
                  data={categories}
                  placeholder="Pick category…"
                  searchable
                  size="md"
                  styles={selectStyles}
                  mt="sm"
                />
              </Stepper.Step>
              <Stepper.Step
                label="Subcategory"
                description={subcategory ?? 'Narrower grouping'}
              >
                <Select
                  label="Subcategory"
                  value={subcategory}
                  onChange={handleSubcategory}
                  data={subcategories}
                  placeholder="Pick subcategory…"
                  searchable
                  size="md"
                  styles={selectStyles}
                  mt="sm"
                />
              </Stepper.Step>
              <Stepper.Step
                label="Variable"
                description={variable ?? 'Specific measure'}
              >
                <Select
                  label="Variable"
                  value={variable}
                  onChange={handleVariable}
                  data={variables}
                  placeholder="Pick variable…"
                  searchable
                  size="md"
                  styles={selectStyles}
                  mt="sm"
                />
              </Stepper.Step>
              <Stepper.Step
                label="Measure"
                description={measure ?? 'Count, percent, etc.'}
              >
                <Select
                  label="Measure"
                  value={measure}
                  onChange={handleMeasure}
                  data={measures}
                  placeholder="Pick measure…"
                  size="md"
                  styles={selectStyles}
                  mt="sm"
                />
              </Stepper.Step>
              <Stepper.Completed>
                <Stack align="center" gap={6} py="md">
                  <ThemeIcon
                    size={44}
                    radius="xl"
                    variant="light"
                    color={COLORS.amberSoft}
                  >
                    <CheckIcon
                      size={22}
                      weight="bold"
                      color={COLORS.amberSoft}
                    />
                  </ThemeIcon>
                  <Text size="sm" c="dimmed" ta="center" maw={420}>
                    Comparing{' '}
                    <Text span fw={700} c={COLORS.spruce}>
                      {variable}
                    </Text>{' '}
                    ({measure}) from{' '}
                    <Text span fw={600} c={COLORS.slate}>
                      {table ? (TABLE_LABELS[table] ?? table) : ''}
                    </Text>
                  </Text>
                  <Button
                    variant="subtle"
                    color="gray"
                    size="xs"
                    onClick={() => handleTable(null)}
                  >
                    Start over
                  </Button>
                </Stack>
              </Stepper.Completed>
            </Stepper>
          </Paper>

          {/* Census vintage note */}
          <Alert
            variant="light"
            color="yellow"
            radius="md"
            icon={<InfoIcon size={18} weight="fill" />}
            title="Note on year coverage"
            styles={{
              title: { fontFamily: FONTS.display, color: COLORS.ink },
            }}
          >
            <Text size="xs" c={COLORS.slate}>
              Census Data Profile variable labels (categories, subcategories,
              variable names) change between ACS vintages. A selection may only
              cover a subset of years if its label was introduced, renamed, or
              restructured in a particular release. Variables with broad year
              coverage (e.g. racial composition totals, median age) are{' '}
              <em>generally</em> labeled consistently; highly specific
              sub-groups may only appear in one or two vintages.
            </Text>
          </Alert>

          {/* Side selectors */}
          <Paper withBorder radius="lg" p="lg" style={panelStyle}>
            <Group gap={8} mb="md">
              <MapPinIcon size={18} color={COLORS.spruce} weight="duotone" />
              <Text
                fw={700}
                style={{ fontFamily: FONTS.display, color: COLORS.spruce }}
              >
                Locations to Compare
              </Text>
            </Group>
            <Grid align="start" gap="lg">
              <Grid.Col span={{ base: 12, sm: 5 }}>
                <SideSelector
                  title="Location A"
                  accent={COLORS.spruce}
                  side={sideA}
                  setSide={setSideA}
                  availableYears={availableYears}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 2 }}>
                <Center h="100%" py={{ base: 4, sm: 0 }}>
                  <Badge
                    variant="light"
                    color={COLORS.amberSoft}
                    radius="xl"
                    size="lg"
                    style={{ fontFamily: FONTS.mono }}
                  >
                    VS
                  </Badge>
                </Center>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 5 }}>
                <SideSelector
                  title="Location B"
                  accent={COLORS.amber}
                  side={sideB}
                  setSide={setSideB}
                  availableYears={availableYears}
                />
              </Grid.Col>
            </Grid>
          </Paper>

          {error && (
            <Alert variant="light" color="red" radius="md">
              {error}
            </Alert>
          )}

          {!isComplete && !error && (
            <StatusPanel icon={<ChartLineIcon size={22} />}>
              Select a table, category, subcategory, variable, and measure above
              to load data.
            </StatusPanel>
          )}

          {isComplete && loading && (
            <Center py="xl">
              <Stack align="center" gap={8}>
                <Loader size="sm" color={COLORS.spruce} />
                <Text c="dimmed" size="sm">
                  Loading…
                </Text>
              </Stack>
            </Center>
          )}

          {isComplete && !loading && sideAData.length === 0 && !error && (
            <StatusPanel icon={<WarningIcon size={22} />}>
              No data found for {makeName(sideA)} — try a county instead of a
              town, or check the API.
            </StatusPanel>
          )}

          {isComplete && !loading && sideAData.length > 0 && (
            <>
              {/* Point-in-time comparison */}
              <Grid align="center" gap="md">
                <Grid.Col span={{ base: 12, sm: 5 }}>
                  <ValueCard
                    label="Location A"
                    location={makeLabel(sideA)}
                    value={fmtVal(valueA)}
                    accent={COLORS.spruce}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 2 }}>
                  <Center>
                    <DeltaBadge diff={diff} isPercent={isPercent} />
                  </Center>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 5 }}>
                  <ValueCard
                    label="Location B"
                    location={makeLabel(sideB)}
                    value={fmtVal(valueB)}
                    accent={COLORS.amber}
                  />
                </Grid.Col>
              </Grid>

              <Stack gap={4} align="center">
                <Text
                  size="xs"
                  c="dimmed"
                  ta="center"
                  style={{ fontFamily: FONTS.mono }}
                >
                  {table} › {category} › {subcategory} › {variable} › {measure}
                </Text>
                {availableYears.length > 0 && availableYears.length < 10 && (
                  <Text size="xs" c="orange.7" ta="center">
                    Data available for {availableYears.length} year
                    {availableYears.length === 1 ? '' : 's'} only (
                    {availableYears[0]}
                    {availableYears.length > 1
                      ? `–${availableYears[availableYears.length - 1]}`
                      : ''}
                    ). This variable&apos;s label changed in other ACS vintages.
                  </Text>
                )}
              </Stack>

              {/* Trend chart via ChartStack (includes Add to Report) */}
              <Paper withBorder radius="lg" p="lg" style={panelStyle}>
                <Group gap={8} mb="sm">
                  <ChartLineIcon
                    size={18}
                    color={COLORS.spruce}
                    weight="duotone"
                  />
                  <Text
                    fw={700}
                    style={{ fontFamily: FONTS.display, color: COLORS.spruce }}
                  >
                    Trend Over Time
                  </Text>
                </Group>
                <ChartStack charts={[chartItem]} action="add" />
              </Paper>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
}

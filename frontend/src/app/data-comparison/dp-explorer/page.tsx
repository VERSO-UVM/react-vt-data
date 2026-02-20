'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Center,
  Container,
  Divider,
  Grid,
  Paper,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useProfile } from '@/components/profile/profileStore';
import { BASE_API_URL } from '@/config';
import { ChartStack } from '@/components/Charts';
import { createChartItem } from '@/utils/itemFactory';
import county_town_names from '@/Data/county_town_names.json';

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
  side,
  setSide,
  availableYears,
}: {
  title: string;
  side: SideState;
  setSide: (s: SideState) => void;
  availableYears: number[];
}) => {
  const counties = Object.keys(county_town_names) as CountyKey[];
  const towns = county_town_names[side.county as CountyKey] ?? [];

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">
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
        size="xs"
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
        size="xs"
      />
      <Select
        label="Year"
        value={String(side.year)}
        onChange={(v) => v && setSide({ ...side, year: Number(v) })}
        data={availableYears.map((y) => ({
          value: String(y),
          label: String(y),
        }))}
        size="xs"
        disabled={availableYears.length === 0}
      />
    </Stack>
  );
};

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
    fetch(`${BASE_API_URL}/load/acs5-db/dp-combined/tree`)
      .then((r) => r.json())
      .then((res) => setTree(res.data ?? []));
  }, []);

  // ---------------------------------------------------------------------------
  // Cascade state — reset downstream when upstream changes
  // ---------------------------------------------------------------------------
  const [table, setTable] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [variable, setVariable] = useState<string | null>(null);
  const [measure, setMeasure] = useState<string | null>(null);

  const handleTable = (v: string | null) => {
    setTable(v);
    setCategory(null);
    setSubcategory(null);
    setVariable(null);
    setMeasure(null);
  };
  const handleCategory = (v: string | null) => {
    setCategory(v);
    setSubcategory(null);
    setVariable(null);
    setMeasure(null);
  };
  const handleSubcategory = (v: string | null) => {
    setSubcategory(v);
    setVariable(null);
    setMeasure(null);
  };
  const handleVariable = (v: string | null) => {
    setVariable(v);
    setMeasure(null);
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

  const [sideAData, setSideAData] = useState<any[]>([]);
  const [sideBData, setSideBData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available years derived from fetched data
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    if (!isComplete) {
      setSideAData([]);
      setSideBData([]);
      setAvailableYears([]);
      return;
    }
    setLoading(true);
    setError(null);

    const body = (name: string) =>
      JSON.stringify({
        name,
        table,
        category,
        subcategory,
        variable,
        measure,
        year_min: 2009,
        year_max: 2024,
      });

    const post = (name: string) =>
      fetch(`${BASE_API_URL}/load/acs5-db/dp-combined/series`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body(name),
      }).then((r) => r.json());

    Promise.all([post(makeName(sideA)), post(makeName(sideB))])
      .then(([aRes, bRes]) => {
        const aData = aRes.data ?? [];
        const bData = bRes.data ?? [];
        setSideAData(aData);
        setSideBData(bData);
        const yrs = Array.from(
          new Set([...aData, ...bData].map((r: any) => r.year)),
        ).sort((a: any, b: any) => a - b) as number[];
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
  const isPercent = measure?.toLowerCase().includes('percent');
  const fmtVal = (v: number | null) =>
    v != null ? (isPercent ? `${v}%` : Number(v).toLocaleString()) : '—';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      <Center pt="xl" mb="md">
        <Title order={2}>DP Tables Explorer</Title>
      </Center>

      <Container size="lg">
        <Stack>
          {/* Cascade filter */}
          <Paper withBorder p="md" radius="md">
            <Grid gutter="sm">
              <Grid.Col span={{ base: 12, sm: 'auto' }}>
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
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 'auto' }}>
                <Select
                  label="Category"
                  value={category}
                  onChange={handleCategory}
                  data={categories}
                  placeholder="Pick category…"
                  disabled={!table}
                  searchable
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 'auto' }}>
                <Select
                  label="Subcategory"
                  value={subcategory}
                  onChange={handleSubcategory}
                  data={subcategories}
                  placeholder="Pick subcategory…"
                  disabled={!category}
                  searchable
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 'auto' }}>
                <Select
                  label="Variable"
                  value={variable}
                  onChange={handleVariable}
                  data={variables}
                  placeholder="Pick variable…"
                  disabled={!subcategory}
                  searchable
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 'auto' }}>
                <Select
                  label="Measure"
                  value={measure}
                  onChange={setMeasure}
                  data={measures}
                  placeholder="Pick measure…"
                  disabled={!variable}
                />
              </Grid.Col>
            </Grid>
          </Paper>

          {/* Side selectors */}
          <Paper withBorder p="md" radius="md">
            <Grid>
              <Grid.Col span={6}>
                <SideSelector
                  title="Side A"
                  side={sideA}
                  setSide={setSideA}
                  availableYears={availableYears}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <SideSelector
                  title="Side B"
                  side={sideB}
                  setSide={setSideB}
                  availableYears={availableYears}
                />
              </Grid.Col>
            </Grid>
          </Paper>

          {error && <Text c="red">{error}</Text>}

          {!isComplete && (
            <Text c="dimmed" ta="center" py="xl">
              Select a table, category, subcategory, variable, and measure above
              to load data.
            </Text>
          )}

          {isComplete && loading && (
            <Text c="dimmed" ta="center" py="xl">
              Loading…
            </Text>
          )}

          {isComplete && !loading && sideAData.length === 0 && !error && (
            <Text c="dimmed" ta="center" py="xl">
              No data found for {makeName(sideA)} — try a county instead of a
              town, or check the API.
            </Text>
          )}

          {isComplete && !loading && sideAData.length > 0 && (
            <>
              {/* Point-in-time summary */}
              <Paper withBorder p="md" radius="md">
                <Grid>
                  <Grid.Col span={6}>
                    <Text size="xs" c="dimmed">
                      {makeLabel(sideA)}
                    </Text>
                    <Text fw={700} size="xl">
                      {fmtVal(pointA?.Value ?? null)}
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="xs" c="dimmed">
                      {makeLabel(sideB)}
                    </Text>
                    <Text fw={700} size="xl">
                      {fmtVal(pointB?.Value ?? null)}
                    </Text>
                  </Grid.Col>
                </Grid>
                <Divider my="xs" />
                <Text size="xs" c="dimmed">
                  {table} › {category} › {subcategory} › {variable} › {measure}
                </Text>
              </Paper>

              {/* Trend chart via ChartStack (includes Add to Report) */}
              <ChartStack charts={[chartItem]} action="add" />
            </>
          )}
        </Stack>
      </Container>
    </>
  );
}

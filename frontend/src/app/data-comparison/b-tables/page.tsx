'use client';

import { useState, useEffect } from 'react';
import {
  Center,
  Container,
  Group,
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
    yearMax: 2023,
  },
  Education: {
    url: `${BASE_API_URL}/load/acs5-db/tidy/education`,
    yField: 'Percent',
    unit: '%',
    yearMin: 2012,
    yearMax: 2023,
  },
  Housing: {
    url: `${BASE_API_URL}/load/acs5-db/tidy/housing`,
    yField: 'Value',
    unit: '',
    yearMin: 2010,
    yearMax: 2023,
  },
  'Labor Force': {
    url: `${BASE_API_URL}/load/acs5-db/tidy/labor-force`,
    yField: 'Percent',
    unit: '%',
    yearMin: 2010,
    yearMax: 2023,
  },
  Income: {
    url: `${BASE_API_URL}/load/acs5-db/tidy/income`,
    yField: 'Value',
    unit: '',
    yearMin: 2010,
    yearMax: 2023,
  },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DataComparisonPage() {
  const { myLocation, comparison, yearMax: profileYearMax } = useProfile();

  const [section, setSection] = useState<string>('Demographics');
  const [primaryData, setPrimaryData] = useState<any[]>([]);
  const [compareData, setCompareData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch both locations whenever section or location names change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const cfg = SECTIONS[section];
    setLoading(true);
    setError(null);

    const fetchOne = (name: string) =>
      fetch(cfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          year_min: cfg.yearMin,
          year_max: cfg.yearMax,
        }),
      }).then((r) => r.json());

    Promise.all([fetchOne(myLocation.name), fetchOne(comparison.name)])
      .then(([primary, comp]) => {
        setPrimaryData(primary.data ?? []);
        setCompareData(comp.data ?? []);
      })
      .catch(() => setError('Failed to load data. Is the API running?'))
      .finally(() => setLoading(false));
  }, [section, myLocation.name, comparison.name]);

  // ---------------------------------------------------------------------------
  // Derive available years from fetched data; default to profile yearMax
  // ---------------------------------------------------------------------------
  const availableYears: number[] = Array.from(
    new Set(primaryData.map((r) => Number(r.year))),
  ).sort();

  const [year, setYear] = useState<number>(profileYearMax);

  // When section changes the available years may shift — clamp to closest.
  useEffect(() => {
    if (availableYears.length === 0) return;
    if (!availableYears.includes(year)) {
      const nearest = availableYears.reduce((a, b) =>
        Math.abs(b - year) < Math.abs(a - year) ? b : a,
      );
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

  const chartItem = createChartItem({
    title: `${section} Comparison — ${year}`,
    xField: 'Variable',
    yField: cfg.yField,
    subtype: 'CompareHBarChart',
    data: primaryForYear,
    compareData: compareForYear,
    categories: [section === 'Labor Force' ? 'Labor & Economy' : section],
    chartParams: {
      legendLabels: [myLocation.name, comparison.name],
      unit: cfg.unit,
    },
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      <Center pt="xl" mb="md">
        <Title order={2}>Detailed Table Comparison</Title>
      </Center>

      <Container size="lg">
        <Stack>
          <Paper withBorder p="md" radius="md">
            <Group gap="md" align="flex-end">
              <Select
                label="Section"
                value={section}
                onChange={(v) => v && setSection(v)}
                data={Object.keys(SECTIONS)}
                w={180}
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
                w={100}
              />
            </Group>
          </Paper>

          {error && <Text c="red">{error}</Text>}

          {loading ? (
            <Text c="dimmed" py="xl" ta="center">
              Loading…
            </Text>
          ) : (
            <ChartStack charts={[chartItem]} action="add" />
          )}
        </Stack>
      </Container>
    </>
  );
}

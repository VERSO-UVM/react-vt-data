'use client';

import { Box, Grid, Text, Title, Tabs } from '@mantine/core';
import {
  HouseLineIcon,
  UserListIcon,
  TreeIcon,
  GraduationCapIcon,
  TrendUpIcon,
  Icon,
} from '@phosphor-icons/react';
import { createChartItem, createTableItem } from '@/utils/itemFactory';
import { ChartStack } from '@/components/Charts';
import { useProfile } from '@/components/profile/profileStore';
import {
  useApplyFilters,
  buildFilters,
} from '@/components/FilterUI/useApplyFilters';
import { useEffect, useState } from 'react';
import { ChartDef, chartDefs } from '@/components/Charts/configs/ChartDefs';
import { ChartMetadata, DataRow } from '@/types/cachedCharts';

// one chart's backend payload, keyed by chart def id in state below
type ChartPayload = {
  data: DataRow[];
  metadata?: ChartMetadata;
  tableData?: DataRow[];
};

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
  }, [myLocation, yearMin, yearMax]);

  const metrics = data.reduce<Record<string, number>>((acc, d) => {
    acc[d.Variable] = d.Value;
    return acc;
  }, {});

  const formatNumber = (v?: number) =>
    v === undefined || v === null ? '—' : v.toLocaleString();

  return (
    <Grid gap={40} py="xl">
      <Grid.Col span={{ base: 6, md: 2 }}>
        <Text size="2rem" fw={700} lh={1} mb={10}>
          {formatNumber(metrics['Population (ACS)'])}
        </Text>
        <Text size="sm" c="dimmed" tt="uppercase" fw={500}>
          Population
        </Text>
      </Grid.Col>

      <Grid.Col span={{ base: 6, md: 2 }}>
        <Text size="2rem" fw={700} lh={1} mb={10}>
          ${formatNumber(metrics['Median Household Income'])}
        </Text>
        <Text size="sm" c="dimmed" tt="uppercase" fw={500}>
          Household Income
        </Text>
      </Grid.Col>

      <Grid.Col span={{ base: 6, md: 2 }}>
        <Text size="2rem" fw={700} lh={1} mb={10}>
          {formatNumber(metrics['Median Age'])}
        </Text>
        <Text size="sm" c="dimmed" tt="uppercase" fw={500}>
          Median Age
        </Text>
      </Grid.Col>

      <Grid.Col span={{ base: 6, md: 2 }}>
        <Text size="2rem" fw={700} lh={1} mb={10}>
          {formatNumber(metrics['Labor Force Participation Rate (16+)'])}
        </Text>
        <Text size="sm" c="dimmed" tt="uppercase" fw={500}>
          In Labor Force (16+)
        </Text>
      </Grid.Col>

      <Grid.Col span={{ base: 6, md: 2 }}>
        <Text size="2rem" fw={700} lh={1} mb={10}>
          ${formatNumber(metrics['Median Home Value'])}
        </Text>
        <Text size="sm" c="dimmed" tt="uppercase" fw={500}>
          Median Home Value
        </Text>
      </Grid.Col>
    </Grid>
  );
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
      mt={20}
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

export default function DataViewerPage() {
  const { myLocation, comparison, interests, yearMin, yearMax } = useProfile();
  const [chartData, setChartData] = useState<Record<string, ChartPayload>>({});
  const [compareChartData, setCompareChartData] = useState<
    Record<string, ChartPayload>
  >({});
  const [compareTableData, setCompareTableData] = useState<
    Record<string, DataRow[]>
  >({});

  const [focusMode] = useState<'all' | 'focus'>('all');

  const applyFilters = useApplyFilters();
  const tableDefs = chartDefs.filter((c) =>
    c.subtype.startsWith('renderTable'),
  );
  const nonTableDefs = chartDefs.filter(
    (c) => !c.subtype.startsWith('renderTable'),
  );

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

  useEffect(() => {
    nonTableDefs.forEach((chart: ChartDef) => {
      const url = chart.url;
      const filters = buildFilters(myLocation, {
        col: 'year',
        selected: [yearMin, yearMax],
      });
      const compFilters = buildFilters(comparison, {
        col: 'year',
        selected: [yearMin, yearMax],
      });

      applyFilters({
        dataURL: url,
        filters: filters,
        onData: (data, metadata, tableData) =>
          setChartData((prev) => ({
            ...prev,
            [chart.id]: {
              data: data as DataRow[],
              metadata: metadata as ChartMetadata,
              tableData: tableData as DataRow[] | undefined,
            },
          })),
      });

      applyFilters({
        dataURL: url,
        filters: compFilters,
        onData: (data, metadata, tableData) =>
          setCompareChartData((prev) => ({
            ...prev,
            [chart.id]: {
              data: data as DataRow[],
              metadata: metadata as ChartMetadata,
              tableData: tableData as DataRow[] | undefined,
            },
          })),
      });
    });
  }, [myLocation, comparison, yearMin, yearMax]);

  useEffect(() => {
    const seen = new Set<string>();
    tableDefs.forEach((def) => {
      // Merge profile year range into extraParams, overriding any hardcoded defaults
      const effectiveExtra = def.tableConfig?.extraParams
        ? {
            ...def.tableConfig.extraParams,
            year_min: yearMin,
            year_max: yearMax,
          }
        : { year_min: yearMin, year_max: yearMax };
      const key = `${def.url}::${JSON.stringify(effectiveExtra)}`;
      if (seen.has(key)) return;
      seen.add(key);
      const siblings = tableDefs.filter((d) => {
        const extra = d.tableConfig?.extraParams
          ? {
              ...d.tableConfig.extraParams,
              year_min: yearMin,
              year_max: yearMax,
            }
          : { year_min: yearMin, year_max: yearMax };
        return `${d.url}::${JSON.stringify(extra)}` === key;
      });
      // Primary location fetch
      applyFilters({
        dataURL: def.url,
        filters: buildFilters(myLocation, {
          col: 'year',
          selected: [yearMin, yearMax],
        }),
        onData: (data) =>
          siblings.forEach((d) =>
            setChartData((prev) => ({
              ...prev,
              [d.id]: { data: data as DataRow[] },
            })),
          ),
      });
      // Comparison location fetch
      if (comparison.name) {
        applyFilters({
          dataURL: def.url,
          filters: buildFilters(comparison, {
            col: 'year',
            selected: [yearMin, yearMax],
          }),
          onData: (data) =>
            siblings.forEach((d) =>
              setCompareTableData((prev) => ({
                ...prev,
                [d.id]: data as DataRow[],
              })),
            ),
        });
      }
    });
  }, [myLocation, comparison, yearMin, yearMax]);

  // QCEW employment data is county-level only; swap to a note card for town selections
  const isSubcountyLocation = myLocation.type === 'town';
  const employmentCounty = myLocation.county;

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

  const allItems = [...charts, ...tableItems];

  let filteredItems = allItems;

  if (focusMode === 'focus' && interests.length > 0) {
    filteredItems = filteredItems.filter((c) =>
      c.categories?.some((cat) => interests.includes(cat)),
    );
  }

  const [activeTab, setActiveTab] = useState<string | null>(null);

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
        {/* Hero */}
        <Box pt={32} pb={24} h={250}>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={8}>
            Data Viewer
          </Text>

          <Title fw={600}>{myLocation.name}</Title>

          <Text size="lg" c="dimmed" mt={4}>
            Compared with {comparison.name}
          </Text>

          <StatCards />
        </Box>

        <ChartTabs
          sections={sections}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        {/* Charts */}
        <Box py="xl">
          <ChartStack
            charts={visibleItems}
            action="add"
            userInterests={interests}
            defIds={visibleItems.map((c) => c.chartParams?.defId)}
          />
        </Box>
      </Box>
    </Box>
  );
}

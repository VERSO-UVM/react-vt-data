import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconMap2 } from '@tabler/icons-react';
import { BASE_API_URL } from '@/config';
import { DataRow } from '@/types/cachedCharts';

// Statewide dataset coverage, independent of the primary/comparison location
// selection — how many zoning districts and towns this dataset covers, not a
// per-location comparison. Fetched once (unfiltered) rather than through the
// location-scoped SECTIONS.timeseries mechanism in reports-by-topic/page.tsx.
export default function ZoningCoverageStatCard() {
  const [rows, setRows] = useState<DataRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    axios
      .post(`${BASE_API_URL}/load/data/zoning/aggregated`, {
        filters: {},
        include: [],
      })
      .then((r) => {
        if (!cancelled)
          setRows(Array.isArray(r.data?.tableData) ? r.data.tableData : []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const districtCount = rows?.length ?? null;
  const townCount =
    rows != null
      ? new Set(rows.map((r) => r.Jurisdiction).filter(Boolean)).size
      : null;

  return (
    <Card
      radius="xl"
      padding="lg"
      withBorder
      style={{
        height: '100%',
        transition: 'all 180ms ease',
        cursor: 'default',
      }}
    >
      <Group justify="space-between" mb="md">
        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
          Statewide Zoning Coverage
        </Text>
        <ThemeIcon size={48} radius="xl" variant="light" color="green">
          <IconMap2 size={24} />
        </ThemeIcon>
      </Group>

      <Group grow>
        <Stack gap={2}>
          <Title order={3}>
            {districtCount !== null ? districtCount.toLocaleString() : '—'}
          </Title>
          <Text size="sm" c="dimmed">
            Zoning Districts
          </Text>
        </Stack>
        <Stack gap={2}>
          <Title order={3}>
            {townCount !== null ? townCount.toLocaleString() : '—'}
          </Title>
          <Text size="sm" c="dimmed">
            Towns with Zoning Data
          </Text>
        </Stack>
      </Group>
    </Card>
  );
}

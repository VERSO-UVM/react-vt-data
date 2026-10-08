import { useEffect, useState } from 'react';
import axios from 'axios';
import { Text } from '@mantine/core';
import { IconMap2 } from '@tabler/icons-react';
import { BASE_API_URL } from '@/config';
import { DataRow } from '@/types/cachedCharts';
import { StatCell } from '@/components/Reports/shared';

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
    <StatCell
      label="Statewide Zoning Coverage"
      icon={<IconMap2 size={18} />}
      value={districtCount !== null ? districtCount.toLocaleString() : '—'}
    >
      <Text size="sm" c="dimmed">
        Zoning districts across{' '}
        {townCount !== null ? townCount.toLocaleString() : '—'} towns
      </Text>
    </StatCell>
  );
}

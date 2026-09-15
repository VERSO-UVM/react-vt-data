import { Card, Text, Title } from '@mantine/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DataRow } from '@/types/cachedCharts';

interface ZoningAllowanceChartProps {
  primary: DataRow[];
  comparison: DataRow[];
  primaryName: string;
  comparisonName: string;
}

// Mirrors the categorization in components/Charts/Bar.tsx's
// ZoningAllowanceStackedBarChart (the working-report version of this chart),
// so the two reports agree on labels and colors.
const VAL_GROUPS: Record<string, string> = {
  True: 'Allowed',
  False: 'Prohibited',
  'Public Hearing': 'May be Allowed',
  'Allowed/Conditional': 'May be Allowed',
  Overlay: 'May be Allowed',
  'Not Mentioned': 'Not Mentioned',
};
const VAL_ORDER = ['Allowed', 'May be Allowed', 'Prohibited', 'Not Mentioned'];
const VAL_GROUP_COLORS: Record<string, string> = {
  Allowed: '#274c77',
  'May be Allowed': '#6096ba',
  Prohibited: '#e07a5f',
  'Not Mentioned': '#c8d3d5',
};
const USE_TYPE_ORDER = ['1 Family', '2 Family', '3 Family', '4 Family'];
const INCLUDED_USE_TYPES = new Set([
  '1_Family',
  '2_Family',
  '3_Family',
  '4_Family',
]);

const cleanUseType = (useType: string) => useType.replace(/_/g, ' ');
const groupVal = (val: string) => VAL_GROUPS[val] ?? val;

function pivot(rows: DataRow[]) {
  const map: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const useType = String(r.use_type ?? '');
    if (!INCLUDED_USE_TYPES.has(useType)) continue;
    const cleaned = cleanUseType(useType);
    const group = groupVal(String(r.val ?? ''));
    if (!map[cleaned]) map[cleaned] = {};
    map[cleaned][group] = (map[cleaned][group] ?? 0) + (Number(r.Acres) || 0);
  }
  return map;
}

function buildData(primary: DataRow[], comparison: DataRow[]) {
  const mainPivot = pivot(primary);
  const comparePivot = pivot(comparison);
  const useTypes = USE_TYPE_ORDER.filter(
    (t) => mainPivot[t] || comparePivot[t],
  );

  return useTypes.map((useType) => {
    const row: Record<string, string | number> = { use_type: useType };
    VAL_ORDER.forEach((group) => {
      row[group] = mainPivot[useType]?.[group] ?? 0;
      row[`${group} (cmp)`] = comparePivot[useType]?.[group] ?? 0;
    });
    return row;
  });
}

export default function ZoningAllowanceChart({
  primary,
  comparison,
  primaryName,
  comparisonName,
}: ZoningAllowanceChartProps) {
  const data = buildData(primary, comparison);
  const hasComparison = comparison.length > 0;

  if (data.length === 0) return null;

  return (
    <Card
      radius="xl"
      padding="lg"
      withBorder
      style={{ height: '100%', transition: 'all 180ms ease' }}
    >
      <Title order={4} mb={hasComparison ? 4 : 'md'}>
        Residential Zoning Allowance by Unit Type
      </Title>
      {hasComparison && (
        <Text size="xs" c="dimmed" mb="md">
          Solid = {primaryName} · Lighter = {comparisonName}
        </Text>
      )}

      <ResponsiveContainer width="100%" height={380}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="use_type" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(v) => Number(v).toLocaleString()}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(v: unknown) =>
              v != null ? `${Number(v).toLocaleString()} acres` : '—'
            }
          />
          <Legend />
          {VAL_ORDER.map((group) => (
            <Bar
              key={group}
              dataKey={group}
              name={group}
              stackId="primary"
              fill={VAL_GROUP_COLORS[group]}
            />
          ))}
          {hasComparison &&
            VAL_ORDER.map((group) => (
              <Bar
                key={`${group}-cmp`}
                dataKey={`${group} (cmp)`}
                name={group}
                legendType="none"
                stackId="comparison"
                fill={VAL_GROUP_COLORS[group]}
                fillOpacity={0.45}
              />
            ))}
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

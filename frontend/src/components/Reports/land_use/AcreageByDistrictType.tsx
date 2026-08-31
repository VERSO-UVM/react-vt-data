import { Card, Title } from '@mantine/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { DataRow } from '@/types/cachedCharts';

interface DistrictTypeChartProps {
  primary: DataRow[];
  comparison: DataRow[];
  primaryName: string;
  comparisonName: string;
}

const DISTRICT_TYPES = [
  'Nonresidential',
  'Mixed with Residential',
  'Overlay not Affecting Use',
  'Primarily Residential',
  'No Data',
];

function getValue(data: DataRow[], variable: string): number {
  const row = data.find((d) => d.Variable === variable);
  return row ? Number(row.Percent) : 0;
}

function buildDistrictTypeData(
  primary: DataRow[],
  comparison: DataRow[],
  primaryName: string,
  comparisonName: string,
) {
  return DISTRICT_TYPES.map((type) => ({
    type,
    [primaryName]: getValue(primary, type),
    [comparisonName]: getValue(comparison, type),
  }));
}

export default function RaceDistributionChart({
  primary,
  comparison,
  primaryName,
  comparisonName,
}: DistrictTypeChartProps) {
  const data = buildDistrictTypeData(
    primary,
    comparison,
    primaryName,
    comparisonName,
  );

  return (
    <Card
      radius="xl"
      padding="lg"
      withBorder
      style={{
        height: '100%',
        transition: 'all 180ms ease',
      }}
    >
      <Title order={4} mb="md">
        Acreage by District Type
      </Title>

      <ResponsiveContainer width="100%" height={420}>
        <BarChart data={data} layout="vertical" responsive>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={(v) => `${v}%`} />
          <YAxis
            type="category"
            dataKey="District_Type"
            width={180}
            tick={{ fontSize: 12 }}
          />
          <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
          <Legend />
          <Bar dataKey={primaryName} fill="#4F8EF7" radius={[0, 6, 6, 0]} />
          <Bar dataKey={comparisonName} fill="#A78BFA" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

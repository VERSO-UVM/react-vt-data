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

const DISTRICT_TYPES = ['Nonresidential', 'Mixed', 'Overlay', 'Residential'];

function getRow(data: DataRow[], districtType: string): DataRow | undefined {
  return data.find((d) => d['District Type'] === districtType);
}

function buildDistrictTypeData(
  primary: DataRow[],
  comparison: DataRow[],
  primaryName: string,
  comparisonName: string,
) {
  return DISTRICT_TYPES.map((type) => {
    const primaryRow = getRow(primary, type);
    const comparisonRow = getRow(comparison, type);

    return {
      category: type,
      [primaryName]: Number(primaryRow?.Acres ?? 0),
      [comparisonName]: Number(comparisonRow?.Acres ?? 0),
      primaryColor: primaryRow?.hex_color || '#a73c00',
    };
  });
}

export default function DistrictTypeChart({
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
      style={{ transition: 'all 180ms ease' }}
    >
      <Title order={4} mb="md">
        Acreage by District Type
      </Title>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />

          <XAxis
            type="number"
            tickFormatter={(value) => Number(value).toLocaleString()}
          />

          <YAxis
            type="category"
            dataKey="category"
            width={180}
            tick={{ fontSize: 12 }}
          />

          <Tooltip
            formatter={(value) =>
              `${Number(value).toLocaleString(undefined, {
                maximumFractionDigits: 1,
              })} acres`
            }
          />

          <Legend />

          <Bar dataKey={primaryName} radius={[0, 4, 4, 0]} fill="#a73c00" />

          <Bar dataKey={comparisonName} fill="#c0c5cf" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

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

interface EducationalAttainmentProps {
  primary: DataRow[];
  comparison: DataRow[];
  primaryName: string;
  comparisonName: string;
}

const EDUCATION_CATEGORIES = [
  'No High School',
  'High School Diploma',
  "Bachelor's Degree",
  'Post-Graduate Degree',
];

function getValue(data: DataRow[], variable: string): number {
  const row = data.find((d) => d.Variable === variable);
  return row ? Number(row.Percent) : 0;
}

function buildEducationalAttainmentData(
  primary: DataRow[],
  comparison: DataRow[],
  primaryName: string,
  comparisonName: string,
) {
  return EDUCATION_CATEGORIES.map((educ) => ({
    educ,
    [primaryName]: getValue(primary, educ),
    [comparisonName]: getValue(comparison, educ),
  }));
}

export default function EducationalAttainmentChart({
  primary,
  comparison,
  primaryName,
  comparisonName,
}: EducationalAttainmentProps) {
  const data = buildEducationalAttainmentData(
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
        Educational Attainment Distribution (%)
      </Title>
      <ResponsiveContainer width="100%" height={420}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{
            left: 20,
            right: 20,
          }}
          responsive
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={(v) => `${v}%`} />
          <YAxis
            type="category"
            dataKey="education"
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

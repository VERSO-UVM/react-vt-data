import { Grid } from '@mantine/core';
import { IconCalendarStats, IconUsers } from '@tabler/icons-react';
import {
  ComparisonBarChart,
  HistoryLineChart,
  ReportSection,
  StatCard,
  StatStrip,
  takeaway,
  useReport,
} from '@/components/Reports/shared';
import { SexDistributionChart } from '@/components/Reports/demographics';

const AGE_GROUPS = [
  'Under 18',
  '18 to 24',
  '25 to 34',
  '35 to 44',
  '45 to 54',
  '55 to 64',
  '65 to 74',
  '75 Plus',
];

const RACE_CATEGORIES = [
  'White',
  'Black or African American',
  'American Indian and Alaska Native',
  'Asian',
  'Native Hawaiian and Other Pacific Islander',
  'Some other race',
  'Two or more races',
  'Hispanic or Latino (of any race)',
];

export default function DemographicsDashboard() {
  const ctx = useReport();
  return (
    <>
      <ReportSection
        intro
        eyebrow="Population"
        title="Who lives here"
        takeaway={takeaway(ctx, 'Median Age', 'median age', 'years')}
      >
        <StatStrip>
          <StatCard
            label="Population"
            icon={<IconUsers size={18} />}
            variable="Population (ACS)"
            format="int"
            percentDiff
          />
          <StatCard
            label="Median Age"
            icon={<IconCalendarStats size={18} />}
            variable="Median Age"
            format="years"
          />
        </StatStrip>
        <Grid gap="xl">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <HistoryLineChart
              source="historicPopulation"
              field="Population"
              title="Population Over Time"
              format="int"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <HistoryLineChart
              source="medianAge"
              field="Median_Age"
              title="Median Age Over Time"
              format="years"
            />
          </Grid.Col>
        </Grid>
      </ReportSection>

      <ReportSection eyebrow="Age & Sex" title="Age and sex makeup">
        <Grid gap="xl">
          <Grid.Col span={{ base: 12, md: 5 }}>
            <SexDistributionChart />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 7 }}>
            <ComparisonBarChart
              title="Age Distribution"
              categories={AGE_GROUPS}
              height={340}
            />
          </Grid.Col>
        </Grid>
      </ReportSection>

      <ReportSection eyebrow="Race & Ethnicity" title="Race and ethnicity">
        <ComparisonBarChart
          title="Race Distribution (%)"
          categories={RACE_CATEGORIES}
          horizontal
          height={420}
          labelWidth={180}
        />
      </ReportSection>
    </>
  );
}

import { Grid } from '@mantine/core';
import { IconBuildingCommunity, IconHomeDollar } from '@tabler/icons-react';
import {
  ComparisonBarChart,
  HistoryLineChart,
  ReportSection,
  StatCard,
  StatStrip,
  takeaway,
  useReport,
} from '@/components/Reports/shared';

export default function HousingDashboard() {
  const ctx = useReport();
  return (
    <>
      <ReportSection
        intro
        eyebrow="Housing Stock"
        title="Homes and what they cost"
        takeaway={takeaway(
          ctx,
          'Median Home Value',
          'median home value',
          'usd',
        )}
      >
        <StatStrip>
          <StatCard
            label="Median Home Value"
            icon={<IconHomeDollar size={18} />}
            variable="Median Home Value"
            format="usd"
          />
          <StatCard
            label="Total Housing Units"
            icon={<IconBuildingCommunity size={18} />}
            variable="Total Housing Units"
            format="int"
          />
        </StatStrip>
        <Grid gap="xl">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <HistoryLineChart
              source="medianHomeValue"
              field="Median_Home_Value"
              title="Median Home Value Over Time"
              format="usd"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <HistoryLineChart
              source="totalUnits"
              field="Total_Housing_Units"
              title="Total Housing Units Over Time"
              format="int"
            />
          </Grid.Col>
        </Grid>
      </ReportSection>

      <ReportSection
        eyebrow="Occupancy"
        title="Who lives in them, and what sits empty"
      >
        <Grid gap="xl">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <ComparisonBarChart
              title="Occupancy Distribution"
              categories={[
                { key: 'Owner-Occupied Units', label: 'Owner-Occupied' },
                { key: 'Renter-Occupied Units', label: 'Renter-Occupied' },
              ]}
              horizontal
              domain={[0, 100]}
              height={300}
              labelWidth={120}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <ComparisonBarChart
              title="Vacancy Rates"
              categories={[
                { key: 'Homeowner Vacancy Rate', label: 'Own' },
                { key: 'Rental Vacancy Rate', label: 'Rent' },
              ]}
              domain={[0, 6]}
              height={300}
            />
          </Grid.Col>
        </Grid>
      </ReportSection>
    </>
  );
}

import { Grid } from '@mantine/core';
import {
  IconBriefcase,
  IconPigMoney,
  IconUserDollar,
} from '@tabler/icons-react';
import {
  HistoryLineChart,
  ReportSection,
  StatCard,
  StatStrip,
  takeaway,
  useReport,
} from '@/components/Reports/shared';

export default function EconomicDashboard() {
  const ctx = useReport();
  return (
    <ReportSection
      eyebrow="Income & Employment"
      title="How people earn and spend"
      takeaway={takeaway(
        ctx,
        'Median Household Income',
        'median household income',
        'usd',
      )}
    >
      <StatStrip>
        <StatCard
          label="Median Household Income"
          icon={<IconPigMoney size={18} />}
          variable="Median Household Income"
          format="usd"
        />
        <StatCard
          label="Per Capita Income"
          icon={<IconUserDollar size={18} />}
          variable="Per Capita Income"
          format="usd"
        />
        <StatCard
          label="Unemployment Rate"
          icon={<IconBriefcase size={18} />}
          variable="Unemployment Rate"
          field="Percent"
          format="pct"
        />
      </StatStrip>
      <Grid gap="xl">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <HistoryLineChart
            source="householdIncome"
            field="Median_Household_Income"
            title="Median Household Income Over Time"
            format="usd"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <HistoryLineChart
            source="perCapitaIncome"
            field="Per_Capita_Income"
            title="Per Capita Income Over Time"
            format="usd"
          />
        </Grid.Col>
      </Grid>
    </ReportSection>
  );
}

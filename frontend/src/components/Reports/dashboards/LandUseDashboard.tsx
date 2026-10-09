import { Grid } from '@mantine/core';
import { DataRow } from '@/types/cachedCharts';
import {
  ComparisonBarChart,
  ReportSection,
  StatStrip,
} from '@/components/Reports/shared';
import {
  WastewaterPermitsTable,
  ZoningAllowanceChart,
  ZoningCoverageStatCard,
} from '@/components/Reports/land_use';

const DISTRICT_TYPES = ['Nonresidential', 'Mixed', 'Overlay', 'Residential'];

const acresOf = (rows: DataRow[], type: string) =>
  Number(rows.find((d) => d['District Type'] === type)?.Acres ?? 0);

export default function LandUseDashboard() {
  return (
    <>
      <ReportSection intro eyebrow="Zoning" title="How land can be used">
        <StatStrip>
          <ZoningCoverageStatCard />
        </StatStrip>
        <Grid gap="xl">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <ComparisonBarChart
              title="Acreage by District Type"
              categories={DISTRICT_TYPES}
              readValue={acresOf}
              horizontal
              height={300}
              labelWidth={130}
              tick={(v) => v.toLocaleString()}
              tip={(v) =>
                `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })} acres`
              }
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <ZoningAllowanceChart />
          </Grid.Col>
        </Grid>
      </ReportSection>

      <ReportSection eyebrow="Wastewater" title="Wastewater infrastructure">
        <WastewaterPermitsTable />
      </ReportSection>
    </>
  );
}

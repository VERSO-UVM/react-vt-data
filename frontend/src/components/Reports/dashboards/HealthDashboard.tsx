import { Text } from '@mantine/core';
import type { Location } from '@/components/profile/profileStore';
import { ReportSection, useReport } from '@/components/Reports/shared';
import {
  IndicatorTable,
  KeyIndicatorTiles,
  PovertyUninsuredTrends,
} from '@/components/Reports/health';
import {
  AT_A_GLANCE_ICONS,
  AT_A_GLANCE_MEASURES,
  HEALTH_CATEGORY_ORDER,
  buildIndicatorRows,
  indicatorPlace,
} from '@/components/Reports/health/indicatorRows';

export default function HealthDashboard() {
  const { primary, comparison, allAreas } = useReport();
  const rows = buildIndicatorRows(primary.current, comparison.current);
  const dataYear = Math.max(
    0,
    ...[...primary.current, ...comparison.current].map(
      (r) => Number(r.Year) || 0,
    ),
  );

  // A county, or a town shown as its county; Vermont itself has no rank.
  const countyOf = (l?: Location) =>
    l?.type === 'county' || l?.type === 'town' ? l.county : null;
  const rankCounty = countyOf(primary.location);
  const comparisonCounty = countyOf(comparison.location);

  return (
    <>
      <ReportSection eyebrow="At a Glance" title="Key health indicators">
        <KeyIndicatorTiles
          rows={rows}
          measures={AT_A_GLANCE_MEASURES}
          icons={AT_A_GLANCE_ICONS}
          primaryName={primary.name}
          comparisonName={comparison.name}
          countyValues={allAreas?.countyValues}
          rankCounty={rankCounty}
          comparisonCounty={comparisonCounty}
        />
      </ReportSection>

      <ReportSection eyebrow="Trends" title="Poverty and insurance coverage">
        <PovertyUninsuredTrends />
      </ReportSection>

      <ReportSection eyebrow="Details" title="All indicators">
        <IndicatorTable
          primary={
            primary.location
              ? indicatorPlace(primary.location, primary.name)
              : { name: primary.name }
          }
          comparison={
            comparison.location
              ? indicatorPlace(comparison.location, comparison.name)
              : { name: comparison.name }
          }
          rows={rows}
          categoryOrder={HEALTH_CATEGORY_ORDER}
        />
        <Text size="xs" c="dimmed">
          Source: CDC PLACES
          {dataYear ? ` estimates for ${dataYear}` : ''}, age-adjusted. These
          are model-based estimates from CDC&apos;s Behavioral Risk Factor
          Surveillance System survey, not direct counts. CDC does not publish a
          statewide figure, so Vermont values are the county estimates averaged
          by each county&apos;s adult population.
        </Text>
      </ReportSection>
    </>
  );
}

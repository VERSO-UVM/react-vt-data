/**
 * @description
 *   Turns the Community Health report's CDC PLACES rows (from
 *   /load/data/cdc/places) and the profile's locations into IndicatorTable
 *   props. All the CDC- and geography-specific knowledge lives here so the
 *   table itself stays presentational.
 *
 *   CDC PLACES only publishes county estimates; the report hands this the
 *   place the data describes (a town arrives as its county) and explains the
 *   substitution above the report. Vermont is the API's population-weighted
 *   average of all counties.
 */

import type { Location } from '@/components/profile/profileStore';
import type { DataRow } from '@/types/cachedCharts';
import type {
  IndicatorEstimate,
  IndicatorPlace,
  IndicatorRow,
} from './IndicatorTable';

export const HEALTH_CATEGORY_ORDER = [
  'Health Outcomes',
  'Health Risk Behaviors',
  'Health Status',
  'Prevention',
  'Disability',
];

// Shown as tiles at the top of the report: measures a community health needs
// assessment typically leads with, spanning outcomes, behavior and access.
export const AT_A_GLANCE_MEASURES = [
  'Depression among adults',
  'Obesity among adults',
  'Visits to doctor for routine checkup within the past year among adults',
  'Current lack of health insurance among adults aged 18-64 years',
];

// Shorter labels where dropping "among adults" isn't enough.
const SHORT_LABELS: Record<string, string> = {
  'Current lack of health insurance among adults aged 18-64 years':
    'No health insurance (ages 18–64)',
  'Taking medicine to control high blood pressure among adults with high blood pressure':
    'Taking blood pressure medicine',
  'Visits to doctor for routine checkup within the past year among adults':
    'Routine checkup in past year',
  'Visited dentist or dental clinic in the past year among adults':
    'Dental visit in past year',
  'Chronic obstructive pulmonary disease among adults': 'COPD',
  'High cholesterol among adults who have ever been screened':
    'High cholesterol',
  'Fair or poor self-rated health status among adults':
    'Fair or poor self-rated health',
  'All teeth lost among adults aged >=65 years': 'All teeth lost (ages 65+)',
  'Colorectal cancer screening among adults aged 45–75 years':
    'Colorectal cancer screening (ages 45–75)',
  'Mammography use among women aged 50-74 years':
    'Mammography (women ages 50–74)',
};

function shortLabel(measure: string) {
  return SHORT_LABELS[measure] ?? measure.replace(/ among adults$/, '');
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function estimate(row: DataRow | undefined): IndicatorEstimate {
  return { value: num(row?.Value), low: num(row?.Low), high: num(row?.High) };
}

/** One row per measure, from each side's most recent year for it. Measures
 *  CDC only published for an earlier year are labeled with that year. */
export function buildIndicatorRows(
  primary: DataRow[],
  comparison: DataRow[],
): IndicatorRow[] {
  const all = [...primary, ...comparison];
  const latestYear = Math.max(...all.map((r) => Number(r.Year) || 0));
  const yearOf = new Map<string, number>();
  for (const r of all) {
    const m = String(r.Measure);
    yearOf.set(m, Math.max(yearOf.get(m) ?? 0, Number(r.Year) || 0));
  }
  const pick = (rows: DataRow[], measure: string, year: number) =>
    rows.find((r) => r.Measure === measure && Number(r.Year) === year);

  return [...yearOf.entries()].map(([measure, year]) => {
    const source = pick(all, measure, year);
    return {
      measure,
      label:
        year < latestYear
          ? `${shortLabel(measure)} (${year})`
          : shortLabel(measure),
      category: String(source?.Category ?? 'Other'),
      unit: String(source?.Unit ?? '%'),
      keyIndicator: Boolean(source?.Key_Indicator),
      primary: estimate(pick(primary, measure, year)),
      comparison: estimate(pick(comparison, measure, year)),
    };
  });
}

/** The table header for a location, noting where its numbers come from.
 *  The report passes the place the data describes (a town arrives as its
 *  county), and says so above the report. */
export function indicatorPlace(
  location: Location,
  name: string,
): IndicatorPlace {
  switch (location.type) {
    case 'state':
      return {
        name,
        note: 'Average of county estimates, weighted by adult population',
      };
    case 'county':
    case 'town':
      return { name };
    default:
      return { name, note: 'CDC PLACES has no estimates for this area' };
  }
}

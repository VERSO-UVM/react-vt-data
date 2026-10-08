/**
 * @description
 *   Where each Reports by Topic section gets its data, and how a profile
 *   place becomes that section's location filter. Plain TS (no React) so both
 *   the report page and the topic landing page can fetch the same way.
 */

import axios from 'axios';
import type { Location } from '@/components/profile/profileStore';
import { BASE_API_URL } from '@/config';
import type { DataRow } from '@/types/cachedCharts';

// ---------------------------------------------------------------------------
// Section config — url and which field to use as the bar value
// ---------------------------------------------------------------------------

type YField = 'Percent' | 'Value';

// Additional named endpoints a topic can pull in alongside its primary `url`
// — e.g. dedicated time-series tables for trend charts. Fetched for both the
// primary and comparison locations and handed to the topic's Dashboard
// component as `data.timeseries[key]`.
export interface TimeseriesEndpoint {
  url: string;
  // Filter by the profile place's ACS name (the Location filter) instead of
  // the section's own location filter -- for ACS context on a county-only
  // section, since ACS publishes the town itself.
  byPlaceName?: boolean;
}

export interface SectionConfig {
  url: string;
  yField: YField;
  unit: string;
  yearMin: number;
  yearMax: number;
  timeseries?: Record<string, TimeseriesEndpoint>;
  // Endpoints fetched once per section with no location filter, for data on
  // every area (e.g. each county's values, to rank one among the rest).
  // Handed to the topic's Dashboard component as `data.allAreas[key]`.
  allAreas?: Record<string, string>;
  // Filter label sent as the location key (defaults to "Location", which
  // matches the ACS5 routes' NAME column). Zoning/wastewater tables have no
  // "Location" column in their filter schema — they use "Jurisdiction"
  // (the `town` column) instead, so requests sent with the default key
  // silently return unfiltered, statewide results.
  locationFilterKey?: string;
  // False for datasets with no `year` column (e.g. zoning is a current-
  // snapshot dataset) — skips the year slice below, which would otherwise
  // filter every row out since `String(undefined) !== yearStr`. Defaults to
  // true.
  hasYearDimension?: boolean;
  // True for datasets only published at county grain (e.g. CDC PLACES has
  // no town-level rows) — always filters by location.county, even for a
  // town-type selection, instead of trying (and failing) to filter by town.
  countyOnly?: boolean;
  // Source name used in the notes shown when the report can't use the
  // profile's own areas (see geographyNotes).
  sourceLabel?: string;
}

export const SECTIONS: Record<string, SectionConfig> = {
  Demographics: {
    url: `${BASE_API_URL}/load/acs5-db/tidy/demographics`,
    yField: 'Percent',
    unit: '%',
    yearMin: 2010,
    yearMax: 2024,
    timeseries: {
      historicPopulation: {
        url: `${BASE_API_URL}/load/acs5-db/timeseries/demographics/historic-population`,
      },
      medianAge: {
        url: `${BASE_API_URL}/load/acs5-db/timeseries/demographics/median-age`,
      },
    },
  },
  // Education: {
  //   url: `${BASE_API_URL}/load/acs5-db/tidy/education`,
  //   yField: 'Percent',
  //   unit: '%',
  //   yearMin: 2012,
  //   yearMax: 2024,
  // },
  Housing: {
    url: `${BASE_API_URL}/load/acs5-db/tidy/housing`,
    yField: 'Value',
    unit: '',
    yearMin: 2010,
    yearMax: 2024,
    timeseries: {
      medianHomeValue: {
        url: `${BASE_API_URL}/load/acs5-db/timeseries/housing/median-home-value`,
      },
      totalUnits: {
        url: `${BASE_API_URL}/load/acs5-db/timeseries/housing/total-units`,
      },
    },
  },
  'Labor & Economy': {
    url: `${BASE_API_URL}/load/acs5-db/tidy/economics`,
    yField: 'Value',
    unit: '',
    yearMin: 2010,
    yearMax: 2024,
    timeseries: {
      householdIncome: {
        url: `${BASE_API_URL}/load/acs5-db/timeseries/economics/median-hh-income`,
      },
      perCapitaIncome: {
        url: `${BASE_API_URL}/load/acs5-db/timeseries/economics/per-capita-income`,
      },
    },
  },
  'Land Use': {
    url: `${BASE_API_URL}/load/data/zoning/aggregated`,
    yField: 'Value',
    unit: '',
    yearMin: 2024,
    yearMax: 2024,
    locationFilterKey: 'Jurisdiction',
    hasYearDimension: false,
    timeseries: {
      allowances: {
        url: `${BASE_API_URL}/load/data/zoning/allowances`,
      },
      wastewaterPermits: {
        url: `${BASE_API_URL}/load/mapping/wastewater/treatment_facility/permits`,
      },
    },
  },
  'Community Health': {
    url: `${BASE_API_URL}/load/data/cdc/places`,
    yField: 'Value',
    unit: '%',
    yearMin: 2024,
    yearMax: 2024,
    locationFilterKey: 'County',
    countyOnly: true,
    hasYearDimension: false,
    sourceLabel: 'CDC PLACES',
    timeseries: {
      // CDC PLACES is a single snapshot; Census rates show the change.
      povertyUninsured: {
        url: `${BASE_API_URL}/load/acs5-db/timeseries/economics/poverty-uninsured`,
        byPlaceName: true,
      },
    },
    allAreas: {
      countyValues: `${BASE_API_URL}/load/data/cdc/places/by-county`,
    },
  },
};

// The county area containing a town-type location.
export function countyArea(l: Location, county: string): Location {
  return {
    ...l,
    type: 'county',
    town: null,
    name: `${county} County, Vermont`,
  };
}

// A profile saved as "Town" before a town was picked (the profile form now
// requires one) has no town and the placeholder name "Unknown". Show its
// county instead, so every section can filter and label it, and say so.
export function resolveLocation(l: Location): {
  location: Location;
  note?: string;
} {
  if (l.type !== 'town' || l.town || !l.county) return { location: l };
  return {
    location: countyArea(l, l.county),
    note: `Your profile has Town selected but no town picked, so ${l.county} County is shown instead.`,
  };
}

// The place a section's data actually describes for a profile area: a
// county-only source (CDC PLACES) shows a town's county. Other areas are
// shown as picked (Vermont is still Vermont, just a computed figure).
export function dataLocation(cfg: SectionConfig, l: Location): Location {
  if (!cfg.countyOnly || l.type !== 'town' || !l.county) return l;
  return countyArea(l, l.county);
}

// Plain-language notes for each profile area this section can't show as-is
// (e.g. a town shown with its county's numbers), so the substitution is
// visible at the top of the report rather than only in chart footnotes.
export function geographyNotes(
  cfg: SectionConfig,
  primary: Location,
  comparison: Location,
): string[] {
  if (!cfg.countyOnly) return [];
  const source = cfg.sourceLabel ?? 'This data';
  const noteFor = (l: Location) => {
    switch (l.type) {
      case 'county':
        return null;
      case 'town':
        return l.county
          ? `${source} doesn't publish town-level estimates, so ${l.town ?? l.name} shows ${l.county} County's numbers.`
          : `${source} doesn't publish town-level estimates for ${l.name}.`;
      case 'state':
        return `${source} doesn't publish a statewide figure, so Vermont shows the average of its county estimates, weighted by adult population.`;
      default:
        return `${source} has no estimates for ${l.name}, so it has no data on this page.`;
    }
  };
  const notes = [noteFor(primary), noteFor(comparison)];
  const countyOf = (l: Location) =>
    l.type === 'town' || l.type === 'county' ? l.county : null;
  const shared = countyOf(primary);
  if (
    shared &&
    shared === countyOf(comparison) &&
    primary.name !== comparison.name
  ) {
    notes.push(
      `Both areas use ${shared} County's numbers, so their values are the same.`,
    );
  }
  return Array.from(new Set(notes.filter((n): n is string => !!n)));
}

// county_town_names.json (the profile's town picker) stores Census-style
// subdivision names — e.g. location.town is "Burlington city" or "Addison
// town" — which is exactly what the cleaned datasets' `town` columns hold, so
// that is the primary candidate. Rows the cleaners couldn't match to a
// municipality keep their raw source spelling ("Huntington", "Barre Town"),
// so the bare and title-cased-suffix forms ride along in the IN-list too.
const TOWN_SUFFIX_RE = /\s+(town|city|gore|grant)$/i;
const bareTownName = (town: string) => town.replace(TOWN_SUFFIX_RE, '');
const titledTownName = (town: string) =>
  town.replace(
    /(town|city|gore|grant)$/i,
    (s) => s[0].toUpperCase() + s.slice(1).toLowerCase(),
  );

// Builds the location portion of a filter request for a section. ACS-style
// sections (no locationFilterKey) send the profile's full display name,
// which matches the ACS NAME column at any grain (town/county/state) — this
// is the pre-existing behavior. Zoning/wastewater sections have separate
// Town/County columns instead of one combined name string, so the display
// name (e.g. "Burlington city, Chittenden County, Vermont") never matches;
// filter by whichever grain the selected location actually is instead, and
// send no filter for state/national (no statewide-equivalent column to
// filter to — this naturally falls back to the full dataset). A town pick
// filters BOTH Jurisdiction and County — Vermont has same-named towns in
// different counties, so Jurisdiction alone can be ambiguous.
// Returns null when the section has no data for that kind of location.
export function buildLocationFilters(
  cfg: SectionConfig,
  location: Location,
): Record<string, string[]> | null {
  if (!cfg.locationFilterKey) {
    return { Location: [location.name] };
  }
  if (cfg.countyOnly) {
    if (location.county) return { County: [location.county] };
    // No county filter means "all counties", which the API combines into a
    // Vermont estimate: right for a statewide pick, but an RPC or national
    // pick has no county-grain equivalent and would be mislabeled.
    return location.type === 'state' ? {} : null;
  }
  if (location.type === 'town' && location.town) {
    // `town` columns hold the Census-style name as-is ("Rockingham town");
    // the bare/titled spellings only match rows the cleaners left unmatched.
    const candidates = Array.from(
      new Set([
        location.town,
        bareTownName(location.town),
        titledTownName(location.town),
      ]),
    );
    const filters: Record<string, string[]> = {
      [cfg.locationFilterKey]: candidates,
    };
    if (location.county) filters.County = [location.county];
    return filters;
  }
  if (location.type === 'county' && location.county) {
    return { County: [location.county] };
  }
  return {};
}

/** POSTs one endpoint for one place, scoped to the section's year range.
 *  Failures and places the section has no data for come back as empty rows. */
export function postSection(
  cfg: SectionConfig,
  url: string,
  location: Location,
  endpoint?: TimeseriesEndpoint,
): Promise<{ data: DataRow[]; tableData?: DataRow[] }> {
  const locationFilters = endpoint?.byPlaceName
    ? { Location: [location.name] }
    : buildLocationFilters(cfg, location);
  if (!locationFilters) return Promise.resolve({ data: [] });
  return axios
    .post(url, {
      filters: {
        ...locationFilters,
        year: { min: cfg.yearMin, max: cfg.yearMax },
      },
      include: [],
    })
    .then((r) => r.data)
    .catch(() => ({ data: [] }));
}

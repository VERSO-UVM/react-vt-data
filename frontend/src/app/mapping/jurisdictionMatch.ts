/**
 * @description
 *   Best-effort mapping from a municipality's TIGER/Census display name (as
 *   used by the town search, e.g. "St. Johnsbury town, Caledonia County,
 *   Vermont") to the plausible spellings of that town's name as stored in
 *   the zoning/wastewater datasets (e.g. "Saint Johnsbury"). Those datasets
 *   were digitized independently and don't share a canonical name column, so
 *   this produces a handful of candidate spellings to pass as an IN-list
 *   filter rather than a single guess.
 */

import type { FilterSpec } from '@/components/FilterRedux/filterTypes';
import type { JurisdictionScope, MapLayerConfig } from './MapLayers';

function titleCase(s: string): string {
  return s.replace(
    /\w\S*/g,
    (w) => w[0].toUpperCase() + w.slice(1).toLowerCase(),
  );
}

// Vermont's only town/city name collisions: these datasets keep "City"/
// "Town" specifically to tell the pair apart, so a bare "Barre" candidate
// must not be added for either — it would silently pull in the sibling
// municipality's data. Every other "city" in these datasets (Burlington,
// Montpelier, Vergennes, Winooski, ...) has no such sibling and is stored
// *without* the suffix, so for those the suffix must be stripped to match.
const AMBIGUOUS_CITY_TOWN_PAIRS = new Set([
  'barre',
  'newport',
  'rutland',
  'saint albans',
]);

/** Given a town's full TIGER display name, return candidate Jurisdiction/
 *  Municipal_Name spellings to filter on. */
export function jurisdictionCandidates(fullMuniName: string): string[] {
  const first = fullMuniName.split(',')[0].trim();
  // "town" is the generic default and is always dropped from these
  // datasets. "city" / "gore" / "grant" / "location" are inconsistent:
  // dropped for most towns, but kept for Barre/Newport/Rutland/St. Albans
  // specifically to disambiguate their City from their Town.
  const stripped = first
    .replace(/\b(town|city|gore|grant|location)\b/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const bareBase = titleCase(stripped);
  const suffixedBase = titleCase(first);
  const isAmbiguousPair = AMBIGUOUS_CITY_TOWN_PAIRS.has(
    bareBase.toLowerCase().replace(/^st\.?\s/i, 'saint '),
  );

  const bases = isAmbiguousPair ? [suffixedBase] : [suffixedBase, bareBase];

  const candidates = new Set<string>();
  for (const base of bases) {
    const noApostrophe = base.replace(/'/g, '');
    candidates.add(base);
    candidates.add(noApostrophe);
    candidates.add(noApostrophe.replace(/\s+/g, ''));
  }

  for (const c of Array.from(candidates)) {
    if (/^st\.?\s/i.test(c)) {
      candidates.add(c.replace(/^st\.?\s/i, 'Saint '));
    } else if (/^saint\s/i.test(c)) {
      candidates.add(c.replace(/^saint\s/i, 'St '));
    }
  }

  return Array.from(candidates).filter(Boolean);
}

/** Merge a town-name scope into a layer's outgoing filter specs: into the
 *  matching spec if the layer's own filterList already targets that table
 *  (soil suitability, treatment facilities, service areas), otherwise as an
 *  extra spec (zoning, whose Allowance filters live on a different table
 *  than its Jurisdiction column). No-op for layers without a jurisdiction
 *  scope (e.g. flood) or when no town is selected. */
export function applyJurisdictionScope(
  config: Pick<MapLayerConfig, 'jurisdiction'>,
  specs: FilterSpec[],
  townCandidates: string[] | null,
): FilterSpec[] {
  const scope: JurisdictionScope | undefined = config.jurisdiction;
  if (!scope || !townCandidates || townCandidates.length === 0) return specs;

  const idx = specs.findIndex((s) => s.filter_table === scope.filterTable);
  if (idx === -1) {
    return [
      ...specs,
      {
        filter_table: scope.filterTable,
        filters: { [scope.label]: townCandidates },
      },
    ];
  }

  const merged = [...specs];
  merged[idx] = {
    ...merged[idx],
    filters: { ...merged[idx].filters, [scope.label]: townCandidates },
  };
  return merged;
}

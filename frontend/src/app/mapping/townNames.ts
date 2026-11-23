/**
 * @description
 *   Turns a municipality's TIGER/Census display name ("Montpelier city,
 *   Washington County, Vermont") into the pieces the explorer shows.
 */

const KINDS = /^(.*)\s(town|city|gore|grant|location)$/i;

export type TownName = {
  /** What to call it in a heading or sentence: "Montpelier", "Barre City". */
  name: string;
  /** "Town", "City", "Gore", ... */
  kind: string;
  /** "Washington County" */
  county: string;
  /** The search box's entry: "Montpelier City (Washington County)". */
  option: string;
};

function split(fullName: string) {
  const [first = '', county = ''] = fullName.split(',').map((s) => s.trim());
  const match = first.match(KINDS);
  const kind = match ? match[2][0].toUpperCase() + match[2].slice(1) : '';
  return { base: match ? match[1] : first, kind, county };
}

/** Names for every municipality at once, because whether "City"/"Town" can
 *  be dropped depends on the others: Vermont has a Barre City and a Barre
 *  Town (likewise Newport, Rutland and St. Albans), and those must keep it. */
export function townNames(fullNames: string[]): Map<string, TownName> {
  const parts = fullNames.map(split);
  const uses = new Map<string, number>();
  for (const { base } of parts) uses.set(base, (uses.get(base) ?? 0) + 1);

  return new Map(
    parts.map(({ base, kind, county }, i) => {
      const plain =
        (kind === 'Town' || kind === 'City') && uses.get(base) === 1;
      const withKind = kind ? `${base} ${kind}` : base;
      return [
        fullNames[i],
        {
          name: plain ? base : withKind,
          kind,
          county,
          option: `${withKind} (${county || 'VT'})`,
        },
      ];
    }),
  );
}

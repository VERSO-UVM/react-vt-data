// Trend charts used to draw one line per series by taking the first row for
// each year, which silently hid data whenever a series had several rows in a
// year: e.g. Burlington's 2011 median monthly owner costs with and without a
// mortgage share one Census label path (issue #106), and the chart showed
// whichever came back first. These helpers split such rows into one line
// each, so every row is drawn and an unexpected flood of rows is visible.

type Row = Record<string, unknown>;

export interface SeriesLine<T> {
  /** What sets this line apart from the series' other lines, e.g. "Housing
   *  units with a mortgage"; null when the rows carry nothing to tell them
   *  apart (the caller numbers them instead). */
  label: string | null;
  rows: T[];
}

export interface SeriesLines<T> {
  lines: SeriesLine<T>[];
  /** The most rows any single x value had; above 1 means the series split. */
  maxPerX: number;
  /** Rows that exactly repeat another row (every field equal). Unlike two
   *  different values under one label, a copy is never real data: it points
   *  to a pipeline bug such as a join fan-out. */
  duplicates: number;
}

// Row fields that identify a Census observation, most readable first.
// source_label and variable_code come from the DP profile tables. The label
// doesn't always tell rows apart: in 2011-2012 the owner costs with and
// without a mortgage (DP04_0100E, DP04_0107E) share one label word for word.
const IDENTITY_FIELDS = ['source_label', 'variable_code'];

/** The most readable identity field that every row has and that tells apart
 *  the rows sharing each x value, or null if none does. */
export function identityField(rows: Row[], x = 'year'): string | null {
  return (
    IDENTITY_FIELDS.find((f) => {
      if (!rows.every((r) => r[f] != null && r[f] !== '')) return false;
      const seen = new Set<string>();
      return rows.every((r) => {
        const key = `${r[x]}|${r[f]}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }) ?? null
  );
}

/** Readable names for identity values: the differing part of each Census
 *  label, or the variable code itself. */
export function identityNames(ids: string[], field: string | null): string[] {
  return field === 'source_label' ? distinguishingParts(ids) : ids;
}

/** One line per distinct row at each x value, instead of the first row. */
export function splitIntoLines<T extends Row>(
  rows: T[],
  x = 'year',
): SeriesLines<T> {
  const perX = new Map<string, number>();
  for (const r of rows) {
    const k = String(r[x]);
    perX.set(k, (perX.get(k) ?? 0) + 1);
  }
  const maxPerX = Math.max(0, ...perX.values());
  if (maxPerX <= 1) {
    return { lines: [{ label: null, rows }], maxPerX, duplicates: 0 };
  }
  const duplicates = countDuplicates(rows);

  // Group by an identity field that tells the rows apart, so a line keeps
  // the same observation across years; without one, rows sharing an x are
  // split by order of arrival (the API returns them in a stable order).
  const idField = identityField(rows, x);
  const groups = new Map<string, T[]>();
  const seen = new Map<string, number>();
  for (const r of rows) {
    const id = idField ? String(r[idField]) : '';
    const nth = seen.get(`${id}|${r[x]}`) ?? 0;
    seen.set(`${id}|${r[x]}`, nth + 1);
    const key = `${id}#${nth}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  const keys = [...groups.keys()];
  const ids = keys.map((k) => k.slice(0, k.lastIndexOf('#')));
  const names = identityNames(ids, idField);
  const lines = keys.map((key, i) => {
    const nth = Number(key.slice(key.lastIndexOf('#') + 1));
    const name = names[i] || null;
    return {
      label: name && nth > 0 ? `${name} (${nth + 1})` : name,
      rows: groups.get(key)!,
    };
  });
  return { lines, maxPerX, duplicates };
}

function countDuplicates(rows: Row[]): number {
  const seen = new Set<string>();
  let copies = 0;
  for (const r of rows) {
    const key = JSON.stringify(
      Object.keys(r)
        .sort()
        .map((k) => [k, r[k]]),
    );
    if (seen.has(key)) copies += 1;
    else seen.add(key);
  }
  return copies;
}

/** For Census labels like "Estimate!!SELECTED MONTHLY OWNER COSTS
 *  (SMOC)!!Housing units with a mortgage!!Median (dollars)", the parts not
 *  shared by every label, e.g. "Housing units with a mortgage". */
export function distinguishingParts(labels: string[]): string[] {
  const parts = labels.map((l) => l.split('!!'));
  const shared = parts
    .map((p) => new Set(p))
    .reduce((a, b) => new Set([...a].filter((s) => b.has(s))));
  return parts.map((p, i) => {
    const own = p.filter((s) => !shared.has(s));
    return own.length ? own.join(' › ') : labels[i];
  });
}

/** A line's legend name: the series name, plus what sets the line apart
 *  when the series split. */
export function lineName<T>(
  seriesName: string,
  result: SeriesLines<T>,
  index: number,
): string {
  if (result.lines.length === 1) return seriesName;
  const label = result.lines[index].label ?? `value ${index + 1}`;
  return `${seriesName} — ${label}`;
}

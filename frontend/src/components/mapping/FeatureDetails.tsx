'use client';

/**
 * @description
 *   How one map feature's fields are formatted and grouped for reading —
 *   shared by the map's built-in detail card and the explorer's spot card.
 */

import { Badge, Group, Stack, Text } from '@mantine/core';
import { COLORS, FONTS } from '@/app/theme';

const CURRENCY_FIELDS = new Set(['Assessed Value', 'Value Per Acre']);
const BOOLEAN_FIELDS = new Set(['Vacant Land', 'Out-of-State Owner']);
// Units for fields whose label doesn't already name one.
const UNITS: Record<string, string> = {
  Acres: 'ac',
  'Design Hydraulic Capacity': 'million gallons/day',
};
const YES_NO: Record<string, string> = { Y: 'Yes', N: 'No' };

export const isBlank = (value: unknown) =>
  value === null || value === undefined || value === '';

export function formatDetailValue(key: string, value: unknown): string {
  if (isBlank(value)) {
    return '—'; // e.g. no tax record on file for this parcel
  }
  if (CURRENCY_FIELDS.has(key) && typeof value === 'number') {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  }
  if (BOOLEAN_FIELDS.has(key) || typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (key === 'Septage Received At Facility') {
    return YES_NO[String(value)] ?? String(value);
  }
  if (key in UNITS) {
    const amount = typeof value === 'number' ? value.toLocaleString() : value;
    return `${amount} ${UNITS[key]}`;
  }
  return String(value);
}

/** Groups the flat tooltip fields into the labeled sections a parcel's
 *  detail card is organized into — Location, Valuation, Owner — with
 *  anything left over (and every non-parcel layer, which won't match any of
 *  these field names) falling into a plain "Details" catch-all so the same
 *  card still works generically. `tab` is the tab a section sits under where
 *  the card is tabbed. `stat` and `accent` are kept so existing callers
 *  still type-check; the card no longer renders them. */
const DETAIL_GROUPS: {
  title: string;
  fields: string[];
  stat?: boolean;
  accent: string;
  tab: string;
}[] = [
  {
    title: 'Location',
    fields: ['Address', 'Jurisdiction', 'County'],
    accent: COLORS.spruce,
    tab: 'Property',
  },
  {
    title: 'Valuation',
    fields: ['Assessed Value', 'Value Per Acre', 'Acres', 'Buildable'],
    stat: true,
    accent: COLORS.amber,
    tab: 'Property',
  },
  {
    title: 'Owner',
    fields: [
      'Primary Owner',
      'Secondary Owner',
      'Mailing City',
      'Mailing State',
      'Out-of-State Owner',
    ],
    accent: COLORS.slate,
    tab: 'Owner',
  },
];

export type DetailSection = {
  title: string;
  stat?: boolean;
  accent: string;
  tab: string;
  entries: [string, unknown][];
};

export function detailSections(
  tooltip: Record<string, unknown>,
): DetailSection[] {
  const fields = Object.entries(tooltip).filter(([k]) => k !== '__title__');
  const claimed = new Set<string>();

  const sections: DetailSection[] = DETAIL_GROUPS.map((group) => {
    const entries = fields.filter(([k]) => group.fields.includes(k));
    entries.forEach(([k]) => claimed.add(k));
    return { ...group, entries };
  }).filter((g) => g.entries.length > 0);

  // Anything the layer's tooltip carries that isn't one of the named parcel
  // fields above — the only path non-parcel layers take.
  const leftover = fields.filter(([k]) => !claimed.has(k));
  if (leftover.length > 0) {
    sections.push({
      title: 'Details',
      entries: leftover,
      accent: COLORS.slate,
      tab: 'Details',
    });
  }
  return sections;
}

/** Section headings: plain sentence case, no decoration. */
export const SECTION_LABEL_STYLE = {
  fontFamily: FONTS.body,
  fontSize: 14,
  fontWeight: 600,
  color: COLORS.ink,
};

export function DetailRow({ label, value }: { label: string; value: unknown }) {
  if (isBlank(value)) {
    return null; // missing source data (e.g. no owner on file) — skip, not "null"
  }
  if (BOOLEAN_FIELDS.has(label) && value === false) {
    // "Out-of-State Owner: No" / "Vacant Land: No" is noise on a compact
    // card — only surface these when they're actually true.
    return null;
  }
  if (label === 'Out-of-State Owner') {
    return value ? (
      <Badge color="orange" variant="light" size="md" radius="sm">
        Out-of-state owner
      </Badge>
    ) : null;
  }
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
      <Text size="sm" c={COLORS.slate}>
        {label}
      </Text>
      <Text size="sm" fw={500} ta="right" c={COLORS.ink}>
        {formatDetailValue(label, value)}
      </Text>
    </Group>
  );
}

/** One titled group of rows. No box, border or accent color — the
 *  container separates sections. */
export function DetailSectionCard({ section }: { section: DetailSection }) {
  return (
    <div>
      <Text style={SECTION_LABEL_STYLE} mb={8}>
        {section.title}
      </Text>
      <Stack gap={8}>
        {section.entries.map(([k, v]) => (
          <DetailRow key={k} label={k} value={v} />
        ))}
      </Stack>
    </div>
  );
}

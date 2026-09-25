import { Box, Group, Stack, Text, Tooltip } from '@mantine/core';
import { COLORS } from '@/app/theme';
import { COMPARISON_COLOR, PRIMARY_COLOR, formatValue } from './IndicatorTable';

// Presentational: one measure's value in every county as a row of small
// dots, with the county (blue) and optionally the comparison county (gray)
// marked, and their ranks in words, each led by its color. Ranks are neutral
// ("highest", never "best"): for some measures higher is better, for others
// worse. The dots show how bunched the counties are, since a rank alone
// can't say whether 4th and 7th really differ.

export interface CountyValue {
  county: string;
  value: number;
}

interface CountyRankStripProps {
  values: CountyValue[];
  /** The county to mark and rank, as named in `values`. */
  county: string;
  /** A second county to mark in gray, e.g. the one it's compared with. */
  comparisonCounty?: string | null;
  unit?: string;
}

const LINE_COLOR = '#adb5bd';
// Odd sizes throughout, so the dots and the 1px line share a whole-pixel
// center instead of sitting half a pixel apart.
const DOT = 11;
const PEER_DOT = 5;
const STRIP_HEIGHT = DOT + 4;
const PEER_COLOR = '#8d908e'; // COLORS.ink at half strength, but solid

function ordinal(n: number) {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? 'th'
      : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th');
  return `${n}${suffix}`;
}

/** "3rd highest", counted from whichever end is nearer. */
export function rankLabel(values: number[], value: number) {
  const fromTop = values.filter((v) => v > value).length + 1;
  const fromBottom = values.filter((v) => v < value).length + 1;
  if (fromTop === 1) return 'Highest';
  if (fromBottom === 1) return 'Lowest';
  return fromTop <= fromBottom
    ? `${ordinal(fromTop)} highest`
    : `${ordinal(fromBottom)} lowest`;
}

export default function CountyRankStrip({
  values,
  county,
  comparisonCounty,
  unit = '%',
}: CountyRankStripProps) {
  const own = values.find((v) => v.county === county);
  if (!own || values.length < 2) return null;
  const other =
    comparisonCounty !== county
      ? values.find((v) => v.county === comparisonCounty)
      : undefined;

  const all = values.map((v) => v.value);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pct = (v: number) =>
    max > min ? `${((v - min) / (max - min)) * 100}%` : '50%';

  const marked = [
    { place: own, color: PRIMARY_COLOR },
    ...(other ? [{ place: other, color: COMPARISON_COLOR }] : []),
  ];

  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c={COLORS.slate} mb={4}>
        Among Vermont&apos;s {values.length} counties
      </Text>
      <Box pos="relative" h={STRIP_HEIGHT} mx={Math.ceil(DOT / 2)}>
        <Box
          pos="absolute"
          left={0}
          right={0}
          top={(STRIP_HEIGHT - 1) / 2}
          h={1}
          bg={LINE_COLOR}
          style={{ opacity: 0.5 }}
        />
        {values
          .filter((v) => v !== own && v !== other)
          .map((v) => (
            <Marker
              key={v.county}
              label={`${v.county}: ${formatValue(v.value, unit)}`}
              left={pct(v.value)}
              color={PEER_COLOR}
              size={PEER_DOT}
            />
          ))}
        {/* Drawn last, so the primary dot sits over the rest. */}
        {[...marked].reverse().map(({ place, color }) => (
          <Marker
            key={place.county}
            label={`${place.county}: ${formatValue(place.value, unit)}`}
            left={pct(place.value)}
            color={color}
            size={DOT}
          />
        ))}
      </Box>
      <Group justify="space-between" wrap="nowrap">
        <Text size="xs" c="dimmed">
          {formatValue(min, unit)}
        </Text>
        <Text size="xs" c="dimmed">
          {formatValue(max, unit)}
        </Text>
      </Group>
      <Group gap={10} mt={2} style={{ rowGap: 2 }}>
        {marked.map(({ place, color }) => (
          <Group key={place.county} gap={5} wrap="nowrap">
            <Box
              w={8}
              h={8}
              bg={color}
              style={{ borderRadius: '50%', flexShrink: 0 }}
            />
            <Text size="xs" c={COLORS.slate} fw={500}>
              {rankLabel(all, place.value)}
            </Text>
          </Group>
        ))}
      </Group>
    </Stack>
  );
}

/** A dot on the strip, inside a wider hit area so small dots still show
 *  their tooltip. */
function Marker({
  label,
  left,
  color,
  size,
}: {
  label: string;
  left: string;
  color: string;
  size: number;
}) {
  return (
    <Tooltip label={label} fz="xs">
      <Box
        pos="absolute"
        top={0}
        bottom={0}
        w={Math.max(size, 8)}
        style={{
          left,
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          w={size}
          h={size}
          bg={color}
          style={{
            borderRadius: '50%',
            flexShrink: 0,
            boxShadow: `0 0 0 ${size >= DOT ? 2 : 1}px white`,
          }}
        />
      </Box>
    </Tooltip>
  );
}

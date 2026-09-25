import { Box, Group, Stack, Text, Tooltip } from '@mantine/core';
import { COMPARISON_COLOR, PRIMARY_COLOR, formatValue } from './IndicatorTable';

// Presentational: one measure's value in every county as a row of ticks,
// with one county marked (and optionally the comparison county, in gray),
// and the marked county's rank in words. Ranks are neutral
// ("highest", never "best"): for some measures higher is better, for others
// worse. The ticks show how bunched the counties are, since a rank alone
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

const TICK_COLOR = '#adb5bd';
const DOT = 10;

function ordinal(n: number) {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? 'th'
      : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th');
  return `${n}${suffix}`;
}

/** "3rd highest of 14 counties", counted from whichever end is nearer. */
export function rankLabel(values: number[], value: number) {
  const n = values.length;
  const fromTop = values.filter((v) => v > value).length + 1;
  const fromBottom = values.filter((v) => v < value).length + 1;
  if (fromTop === 1) return `Highest of ${n} counties`;
  if (fromBottom === 1) return `Lowest of ${n} counties`;
  return fromTop <= fromBottom
    ? `${ordinal(fromTop)} highest of ${n} counties`
    : `${ordinal(fromBottom)} lowest of ${n} counties`;
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

  return (
    <Stack gap={4}>
      <Box pos="relative" h={DOT + 4} mx={DOT / 2}>
        <Box
          pos="absolute"
          left={0}
          right={0}
          top="50%"
          h={1}
          bg={TICK_COLOR}
          style={{ opacity: 0.5 }}
        />
        {values
          .filter((v) => v !== own && v !== other)
          .map((v) => (
            <Tooltip
              key={v.county}
              label={`${v.county}: ${formatValue(v.value, unit)}`}
              fz="xs"
            >
              {/* A wider transparent hit area around the 2px tick. */}
              <Box
                pos="absolute"
                top={0}
                bottom={0}
                w={8}
                style={{
                  left: pct(v.value),
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <Box w={2} h="100%" bg={TICK_COLOR} />
              </Box>
            </Tooltip>
          ))}
        {/* The comparison first, so the primary dot draws over it. */}
        {other && (
          <Marker
            label={`${other.county}: ${formatValue(other.value, unit)}`}
            left={pct(other.value)}
            color={COMPARISON_COLOR}
          />
        )}
        <Marker
          label={`${own.county}: ${formatValue(own.value, unit)}`}
          left={pct(own.value)}
          color={PRIMARY_COLOR}
        />
      </Box>
      <Group justify="space-between" wrap="nowrap">
        <Text size="xs" c="dimmed">
          {formatValue(min, unit)}
        </Text>
        <Text size="xs" c="dimmed" ta="center">
          {rankLabel(all, own.value)}
        </Text>
        <Text size="xs" c="dimmed">
          {formatValue(max, unit)}
        </Text>
      </Group>
    </Stack>
  );
}

function Marker({
  label,
  left,
  color,
}: {
  label: string;
  left: string;
  color: string;
}) {
  return (
    <Tooltip label={label} fz="xs">
      <Box
        pos="absolute"
        w={DOT}
        h={DOT}
        bg={color}
        style={{
          left,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          boxShadow: '0 0 0 2px white',
        }}
      />
    </Tooltip>
  );
}

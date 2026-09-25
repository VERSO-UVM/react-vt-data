import { Box, Group, Stack, Text, Tooltip } from '@mantine/core';
import { PRIMARY_COLOR, formatValue } from './IndicatorTable';

// Presentational: one measure's value in every county as a row of ticks,
// with one county marked, and its rank in words. Ranks are neutral
// ("highest", never "best"): for some measures higher is better, for others
// worse. The ticks show how bunched the counties are, since a rank alone
// can't say whether 4th and 7th really differ.

export interface CountyValue {
  county: string;
  value: number;
}

interface CountyRankStripProps {
  values: CountyValue[];
  /** The county to mark, as named in `values`. */
  county: string;
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
  unit = '%',
}: CountyRankStripProps) {
  const own = values.find((v) => v.county === county);
  if (!own || values.length < 2) return null;

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
          .filter((v) => v !== own)
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
        <Tooltip
          label={`${own.county}: ${formatValue(own.value, unit)}`}
          fz="xs"
        >
          <Box
            pos="absolute"
            w={DOT}
            h={DOT}
            bg={PRIMARY_COLOR}
            style={{
              left: pct(own.value),
              top: '50%',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              boxShadow: '0 0 0 2px white',
            }}
          />
        </Tooltip>
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

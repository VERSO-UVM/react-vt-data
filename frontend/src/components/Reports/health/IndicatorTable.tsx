'use client';

import { useState } from 'react';
import {
  Badge,
  Box,
  Card,
  Group,
  SegmentedControl,
  Stack,
  Switch,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { COLORS } from '@/app/theme';

// Presentational only: knows nothing about geography levels or the API.
// Callers decide which estimates each place gets (e.g. a town shown with its
// county's CDC PLACES estimates) and say so through `IndicatorPlace.note`, so
// town/town, town/county, county/Vermont, etc. all render the same way.

/** One side of a comparison for a single measure. `low`/`high` are its 95%
 *  confidence interval when there is one. */
export interface IndicatorEstimate {
  value: number | null;
  low?: number | null;
  high?: number | null;
}

export interface IndicatorRow {
  /** Stable key, typically the source's measure name. */
  measure: string;
  label: string;
  category: string;
  unit?: string;
  keyIndicator?: boolean;
  primary: IndicatorEstimate;
  comparison: IndicatorEstimate;
}

/** A place being compared. `note` explains where its numbers come from when
 *  that isn't obvious, e.g. "Uses Addison County estimates" for a town. */
export interface IndicatorPlace {
  name: string;
  note?: string;
}

interface IndicatorTableProps {
  title?: string;
  primary: IndicatorPlace;
  comparison: IndicatorPlace;
  rows: IndicatorRow[];
  /** Shown above the table, e.g. when both places share one estimate. */
  notice?: string;
  /** Shown below the table, e.g. how an interval was derived. */
  footnote?: string;
  /** Category display order; unlisted categories follow alphabetically. */
  categoryOrder?: string[];
}

// Same pair as the report's other comparison charts.
const PRIMARY_COLOR = '#5474B4';
const COMPARISON_COLOR = '#868e96';

export type Verdict = 'different' | 'similar' | 'unknown';

function hasInterval(
  e: IndicatorEstimate,
): e is IndicatorEstimate & { low: number; high: number } {
  return e.low != null && e.high != null;
}

/** Standard error implied by a 95% confidence interval. */
const standardError = (e: { low: number; high: number }) =>
  (e.high - e.low) / (2 * 1.96);

/** Whether the gap is larger than the estimates' uncertainty. With both
 *  intervals, a two-sided z-test on the difference (checking for overlapping
 *  intervals instead would miss real differences); with one, whether the
 *  other value falls outside it. Without any interval there's no basis. */
export function compareEstimates(
  a: IndicatorEstimate,
  b: IndicatorEstimate,
): Verdict {
  if (a.value == null || b.value == null) return 'unknown';
  if (hasInterval(a) && hasInterval(b)) {
    const se = Math.hypot(standardError(a), standardError(b));
    return se > 0 && Math.abs(a.value - b.value) / se > 1.96
      ? 'different'
      : 'similar';
  }
  if (hasInterval(a)) {
    return b.value < a.low || b.value > a.high ? 'different' : 'similar';
  }
  if (hasInterval(b)) {
    return a.value < b.low || a.value > b.high ? 'different' : 'similar';
  }
  return 'unknown';
}

export function formatValue(value: number | null, unit = '%') {
  return value == null ? '—' : `${value.toFixed(1)}${unit}`;
}

/** A 0..max axis with round ticks: the smallest step giving at most five
 *  intervals, and a max rounded up to a whole step. */
function niceScale(rows: IndicatorRow[]): { max: number; ticks: number[] } {
  const values = rows.flatMap((r) =>
    [r.primary, r.comparison].flatMap((e) => [e.value, e.high]),
  );
  const top = Math.max(1, ...values.filter((v): v is number => v != null));
  const step =
    [1, 2, 5, 10, 20, 25, 50].find((s) => Math.ceil(top / s) <= 4) ?? 100;
  const max = Math.ceil(top / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  return { max, ticks };
}

const tickPct = (tick: number, max: number) => `${(tick / max) * 100}%`;

function PlaceHeader({ place }: { place: IndicatorPlace }) {
  return (
    <Stack gap={0}>
      <Text size="sm" fw={600}>
        {place.name}
      </Text>
      {place.note && (
        <Text size="xs" c="dimmed" fw={400}>
          {place.note}
        </Text>
      )}
    </Stack>
  );
}

const PLOT_HEIGHT = 28;
const DOT = 9;
const CAP = 8;

/** One estimate on a lane: dot with whisker and end caps for its interval,
 *  or a full-height reference tick when intervals are on but it has none. */
function Mark({
  estimate,
  lane,
  color,
  max,
  showInterval,
}: {
  estimate: IndicatorEstimate;
  lane: number;
  color: string;
  max: number;
  showInterval: boolean;
}) {
  if (estimate.value == null) return null;
  const pct = (v: number) => `${(Math.min(v, max) / max) * 100}%`;
  if (showInterval && !hasInterval(estimate)) {
    return (
      <Box
        pos="absolute"
        top={2}
        w={2}
        h={PLOT_HEIGHT - 4}
        bg={color}
        style={{ left: pct(estimate.value), transform: 'translateX(-50%)' }}
      />
    );
  }
  return (
    <>
      {showInterval && hasInterval(estimate) && (
        <>
          <Box
            pos="absolute"
            top={lane - 1}
            h={2}
            bg={color}
            style={{
              left: pct(estimate.low),
              width: `calc(${pct(estimate.high)} - ${pct(estimate.low)})`,
            }}
          />
          {[estimate.low, estimate.high].map((v, i) => (
            <Box
              key={i}
              pos="absolute"
              top={lane - CAP / 2}
              w={2}
              h={CAP}
              bg={color}
              style={{ left: pct(v), transform: 'translateX(-50%)' }}
            />
          ))}
        </>
      )}
      <Box
        pos="absolute"
        top={lane - DOT / 2}
        w={DOT}
        h={DOT}
        bg={color}
        style={{
          left: pct(estimate.value),
          transform: 'translateX(-50%)',
          borderRadius: '50%',
        }}
      />
    </>
  );
}

/** Dot-and-whisker plot, the first place on an upper lane and the
 *  comparison on a lower one so overlapping intervals stay readable. */
function RangePlot({
  row,
  max,
  ticks,
  showIntervals,
}: {
  row: IndicatorRow;
  max: number;
  ticks: number[];
  showIntervals: boolean;
}) {
  return (
    <Box pos="relative" h={PLOT_HEIGHT} miw={200}>
      {/* Faint gridlines at the axis ticks, behind the marks. */}
      {ticks.map((tick) => (
        <Box
          key={tick}
          pos="absolute"
          top={0}
          bottom={0}
          w={1}
          bg={COLORS.line}
          style={{ left: tickPct(tick, max) }}
        />
      ))}
      <Mark
        estimate={row.comparison}
        lane={20}
        color={COMPARISON_COLOR}
        max={max}
        showInterval={showIntervals}
      />
      <Mark
        estimate={row.primary}
        lane={8}
        color={PRIMARY_COLOR}
        max={max}
        showInterval={showIntervals}
      />
    </Box>
  );
}

function DifferenceCell({ row }: { row: IndicatorRow }) {
  const { primary: p, comparison: c } = row;
  if (p.value == null || c.value == null) return <Text size="sm">—</Text>;
  const diff = p.value - c.value;
  const verdict = compareEstimates(p, c);
  return (
    <Stack gap={0}>
      <Text size="sm" fw={verdict === 'different' ? 700 : 400}>
        {`${diff > 0 ? '+' : ''}${diff.toFixed(1)} pts`}
      </Text>
      {verdict !== 'unknown' && (
        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
          {verdict === 'different' ? 'significant' : 'not significant'}
        </Text>
      )}
    </Stack>
  );
}

function LegendMark({
  color,
  showInterval,
}: {
  color: string;
  showInterval: boolean;
}) {
  return (
    <Box pos="relative" w={showInterval ? 26 : DOT} h={12}>
      {showInterval && (
        <>
          <Box pos="absolute" top={5} left={0} right={0} h={2} bg={color} />
          <Box pos="absolute" top={2} left={0} w={2} h={CAP} bg={color} />
          <Box pos="absolute" top={2} right={0} w={2} h={CAP} bg={color} />
        </>
      )}
      <Box
        pos="absolute"
        top={6 - DOT / 2}
        w={DOT}
        h={DOT}
        bg={color}
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: '50%',
        }}
      />
    </Box>
  );
}

function Legend({
  primary,
  comparison,
  showIntervals,
}: {
  primary: IndicatorPlace;
  comparison: IndicatorPlace;
  showIntervals: boolean;
}) {
  return (
    <Group gap="lg" visibleFrom="sm">
      <Group gap={6}>
        <LegendMark color={PRIMARY_COLOR} showInterval={showIntervals} />
        <Text size="xs">{primary.name}</Text>
      </Group>
      <Group gap={6}>
        <LegendMark color={COMPARISON_COLOR} showInterval={showIntervals} />
        <Text size="xs">{comparison.name}</Text>
      </Group>
      {showIntervals && (
        <Text size="xs" c="dimmed">
          Lines show 95% confidence intervals; they can overlap and still differ
          significantly.
        </Text>
      )}
    </Group>
  );
}

export default function IndicatorTable({
  title = 'All Indicators',
  primary,
  comparison,
  rows,
  notice,
  footnote,
  categoryOrder = [],
}: IndicatorTableProps) {
  const hasKey = rows.some((r) => r.keyIndicator);
  const [show, setShow] = useState<'key' | 'all'>(hasKey ? 'key' : 'all');
  const [showIntervals, setShowIntervals] = useState(true);

  const visible = show === 'key' ? rows.filter((r) => r.keyIndicator) : rows;
  const rank = (cat: string) => {
    const i = categoryOrder.indexOf(cat);
    return i === -1 ? categoryOrder.length : i;
  };
  const categories = Array.from(new Set(visible.map((r) => r.category))).sort(
    (a, b) => rank(a) - rank(b) || a.localeCompare(b),
  );

  return (
    <Card
      radius="xl"
      padding="lg"
      withBorder
      style={{ height: '100%', transition: 'all 180ms ease' }}
    >
      <Group justify="space-between" mb="xs" wrap="wrap">
        <Title order={4}>{title}</Title>
        <Group gap="md">
          <Switch
            size="xs"
            label="Confidence intervals"
            checked={showIntervals}
            onChange={(e) => setShowIntervals(e.currentTarget.checked)}
            color={COLORS.spruce}
            visibleFrom="sm"
          />
          {hasKey && (
            <SegmentedControl
              size="xs"
              value={show}
              onChange={(v) => setShow(v as 'key' | 'all')}
              data={[
                { label: 'Key indicators', value: 'key' },
                { label: 'All indicators', value: 'all' },
              ]}
            />
          )}
        </Group>
      </Group>
      <Legend
        primary={primary}
        comparison={comparison}
        showIntervals={showIntervals}
      />
      {notice && (
        <Text size="sm" c="dimmed" mt="xs">
          {notice}
        </Text>
      )}

      <Table.ScrollContainer minWidth={420} mt="sm">
        <Table verticalSpacing={6} highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Indicator</Table.Th>
              <Table.Th>
                <PlaceHeader place={primary} />
              </Table.Th>
              <Table.Th>
                <PlaceHeader place={comparison} />
              </Table.Th>
              <Table.Th>Difference</Table.Th>
              <Table.Th visibleFrom="sm" miw={220} w="36%" />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {categories.map((category) => (
              <CategoryRows
                key={category}
                category={category}
                rows={visible.filter((r) => r.category === category)}
                showKeyBadges={show === 'all'}
                showIntervals={showIntervals}
              />
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {footnote && (
        <Text size="xs" c="dimmed" mt="sm">
          {footnote}
        </Text>
      )}
    </Card>
  );
}

function CategoryRows({
  category,
  rows,
  showKeyBadges,
  showIntervals,
}: {
  category: string;
  rows: IndicatorRow[];
  /** Only useful when non-key rows are also shown. */
  showKeyBadges: boolean;
  showIntervals: boolean;
}) {
  // Key indicators first, then alphabetical.
  const sorted = [...rows].sort(
    (a, b) =>
      Number(!!b.keyIndicator) - Number(!!a.keyIndicator) ||
      a.label.localeCompare(b.label),
  );
  // Each category gets its own 0..max scale: screening rates near 80% would
  // otherwise squash every 5-30% outcome into the left edge of the plot.
  const { max, ticks } = niceScale(rows);
  return (
    <>
      <Table.Tr>
        <Table.Td colSpan={4} pt="md">
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">
            {category}
          </Text>
        </Table.Td>
        <Table.Td visibleFrom="sm" pt="md" style={{ verticalAlign: 'bottom' }}>
          {/* Tick labels, placed at the same positions as each row's
              gridlines (the first and last kept inside the cell). */}
          <Box pos="relative" h={16} miw={200}>
            {ticks.map((tick, i) => (
              <Text
                key={tick}
                size="xs"
                c="dimmed"
                pos="absolute"
                top={0}
                style={{
                  left: tickPct(tick, max),
                  transform:
                    i === 0
                      ? 'none'
                      : i === ticks.length - 1
                        ? 'translateX(-100%)'
                        : 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                }}
              >
                {tick}%
              </Text>
            ))}
          </Box>
        </Table.Td>
      </Table.Tr>
      {sorted.map((row) => (
        <Table.Tr key={row.measure}>
          <Table.Td>
            <Group gap={6} wrap="nowrap">
              <Text size="sm">{row.label}</Text>
              {showKeyBadges && row.keyIndicator && (
                <Badge
                  size="xs"
                  variant="light"
                  color={COLORS.spruce}
                  style={{ flexShrink: 0 }}
                >
                  Key
                </Badge>
              )}
            </Group>
          </Table.Td>
          <Table.Td>
            <Text size="sm" fw={600}>
              {formatValue(row.primary.value, row.unit)}
            </Text>
          </Table.Td>
          <Table.Td>
            <Text size="sm">{formatValue(row.comparison.value, row.unit)}</Text>
          </Table.Td>
          <Table.Td>
            <DifferenceCell row={row} />
          </Table.Td>
          <Table.Td visibleFrom="sm">
            <RangePlot
              row={row}
              max={max}
              ticks={ticks}
              showIntervals={showIntervals}
            />
          </Table.Td>
        </Table.Tr>
      ))}
    </>
  );
}

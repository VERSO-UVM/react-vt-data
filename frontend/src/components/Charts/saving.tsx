import { useEffect, useState } from 'react';
import { useItems } from '../ItemsProvider';
import { useProfile } from '@/components/profile/profileStore';
import Link from 'next/link';
import { Anchor, Button, Group, Transition } from '@mantine/core';
import { CheckIcon, XIcon } from '@phosphor-icons/react';
import { ChartItem, DataRow } from '@/types/cachedCharts';
import { COLORS } from '@/app/theme';

// Save an externally-built chart (comparison pages, etc.) to the working report.
// If defId is provided, marks it included in the auto-populated set instead of
// storing a copy. Initial inclusion is determined by profile interests — charts
// whose categories don't match any interest start excluded.
interface AddChartProps {
  chart: ChartItem<DataRow>;
  defId?: string;
}

export function AddChart({ chart, defId }: AddChartProps) {
  const {
    addItem,
    removeItem,
    items,
    excludedIds,
    toggleExcluded,
    setSessionInitialized,
  } = useItems();
  const { interests } = useProfile();

  const stableId =
    defId ??
    chart.id ??
    [
      chart.title,
      chart.subtype,
      chart.chartParams?.xKey,
      chart.chartParams?.yKey,
      ...(chart.chartParams?.legendLabels ?? []),
    ]
      .filter(Boolean)
      .join('::');

  // Check if the chart categories match any of the user's profile interests
  const chartCategories = chart.categories ?? []; // Adjust field name to match your ChartItem schema
  const matchesInterests =
    interests.length === 0 || // If no interests set, default to showing/including
    chartCategories.some((category) => interests.includes(category));

  // Charts backed by a chartDefs id (defId set) are already auto-populated
  // on the working report — their inclusion is governed by excludedIds, not
  // by presence in `items`. So "Add"/"Remove" here just toggles exclusion,
  // matching the working-report page's own inclusion check. Only charts
  // built ad hoc on other pages (no defId — no chartDefs counterpart) get
  // stored as a standalone copy in `items`.
  const inReport = defId
    ? !excludedIds.includes(defId)
    : items.some((item) => item.id === stableId);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent parent elements (like ChartCard or Modal triggers) from catching the click
    e.stopPropagation();

    if (defId) {
      // Explicit choice: stop the working report from re-deriving inclusion
      // from interests on first visit and wiping this out.
      setSessionInitialized(true);
      toggleExcluded(defId);
      return;
    }

    if (inReport) {
      removeItem(stableId);
    } else {
      addItem({ ...chart, id: stableId });
    }
  };

  // Optional: If you want to dim or hide the button when interests don't match
  if (!matchesInterests && !inReport) {
    return null; // or render a muted/disabled state based on your UX needs
  }

  return (
    <Group gap="sm">
      <Button
        onClick={handleClick}
        color={inReport ? COLORS.red : COLORS.spruce}
        variant={inReport ? 'light' : 'filled'}
        radius="xl"
        size="xs"
        leftSection={
          inReport ? (
            <XIcon size={14} weight="bold" />
          ) : (
            <CheckIcon size={14} weight="bold" />
          )
        }
      >
        {inReport ? 'Remove from report' : 'Add to report'}
      </Button>
      {inReport && (
        <Anchor
          component={Link}
          href="/working-report"
          size="xs"
          c={COLORS.spruce}
          onClick={(e) => e.stopPropagation()}
        >
          Added — view report →
        </Anchor>
      )}
    </Group>
  );
}

// Remove a manually-saved chart from the working report
interface RemoveChartProps {
  chart: ChartItem<DataRow>;
}
export function RemoveChart({ chart }: RemoveChartProps) {
  const { removeItem } = useItems();
  return (
    <Button variant="light" color="red" onClick={() => removeItem(chart.id)}>
      Remove from report
    </Button>
  );
}

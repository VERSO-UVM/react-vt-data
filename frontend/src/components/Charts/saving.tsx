import { useEffect, useState } from 'react';
import { useItems } from '../ItemsProvider';
import { useProfile } from '@/components/profile/profileStore';
import { Button, Transition } from '@mantine/core';
import { CheckIcon, XIcon } from '@phosphor-icons/react';
import { ChartItem, DataRow } from '@/types/cachedCharts';

// Toggle include/exclude for auto-populated working report charts
interface ToggleProps {
  defId: string;
  isIncluded: boolean;
  onToggle: () => void;
}
export function ToggleChart({ isIncluded, onToggle }: ToggleProps) {
  return (
    <Button
      variant={isIncluded ? 'light' : 'filled'}
      color={isIncluded ? 'red' : 'green'}
      onClick={onToggle}
    >
      {isIncluded ? 'Exclude from report' : 'Include in report'}
    </Button>
  );
}

// Save an externally-built chart (comparison pages, etc.) to the working report.
// If defId is provided, marks it included in the auto-populated set instead of
// storing a copy. Initial inclusion is determined by profile interests — charts
// whose categories don't match any interest start excluded.
interface AddChartProps {
  chart: ChartItem<DataRow>;
  defId?: string;
}

export function AddChart({ chart, defId }: AddChartProps) {
  const { addItem, removeItem, items } = useItems();
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

  // Auto-exclude initial state check based on interests if needed,
  // or track state relative to items in report:
  const inReport = items.some((item) => item.id === stableId);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  // Prevent parent elements (like ChartCard or Modal triggers) from catching the click
  e.stopPropagation();

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
    <Button
      onClick={handleClick}
      color={inReport ? 'red' : 'blue'}
      variant={inReport ? 'filled' : 'light'}
      leftSection={
        inReport ? (
          <XIcon size={12} weight="bold" />
        ) : (
          <CheckIcon size={16} weight="bold" />
        )
      }
    >
      {inReport ? 'Remove from working report' : 'Add to working report'}
    </Button>
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

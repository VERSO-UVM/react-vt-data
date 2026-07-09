import { useEffect, useState } from 'react';
import { useItems } from '../ItemsProvider';
import { useProfile } from '@/components/profile/profileStore';
import { Button, Transition } from '@mantine/core';
import { CheckIcon, XIcon } from '@phosphor-icons/react';
import { ChartItem } from '@/types/cachedCharts';

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
  chart: ChartItem<any>;
  defId?: string;
}
export function AddChart({ chart, defId }: AddChartProps) {
  const {
    addItem,
    removeItem,
    includeById,
    excludeById,
    items,
  } = useItems();

  const { interests } = useProfile();

  const stableId = [
    chart.title,
    chart.subtype,
    ...(chart.chartParams?.legendLabels ?? []),
  ].join("::");

const inReport = items.some(item => item.id === stableId);

const handleClick = () => {
  if (inReport) {
    removeItem(stableId);
  } else {
    addItem({ ...chart, id: stableId });
  }
};

  return (
    <Button
      onClick={handleClick}
      color={inReport ? "red" : "blue"}
      variant={inReport ? "filled" : "light"}
      leftSection={
        inReport ? <XIcon size={12} weight="bold" /> : <CheckIcon size={16} weight="bold" />
      }
    >
      {inReport
        ? "Remove from working report"
        : "Add to working report"}
    </Button>
  );
}

// Remove a manually-saved chart from the working report
interface RemoveChartProps {
  chart: ChartItem<any>;
}
export function RemoveChart({ chart }: RemoveChartProps) {
  const { removeItem } = useItems();
  return (
    <Button variant="light" color="red" onClick={() => removeItem(chart.id)}>
      Remove from report
    </Button>
  );
}

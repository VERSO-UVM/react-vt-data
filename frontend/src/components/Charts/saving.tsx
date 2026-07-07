import React from 'react';
import { useItems } from '../ItemsProvider';
import { useProfile } from '@/components/profile/profileStore';
import { Button } from '@mantine/core';
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
  const { addItem, includeById, excludeById } = useItems();
  const { interests } = useProfile();

  const handleClick = () => {
    if (defId) {
      includeById(defId);
    } else {
      // Stable ID: title + subtype + locations — prevents saving the same chart twice
      const stableId = [
        chart.title,
        chart.subtype,
        ...(chart.chartParams?.legendLabels ?? []),
      ].join('::');
      const deduped = { ...chart, id: stableId };
      addItem(deduped);
      // Auto-exclude if interests are set and this chart doesn't match any
      if (interests.length > 0) {
        const matches = deduped.categories?.some((cat: string) =>
          interests.includes(cat),
        );
        if (!matches) excludeById(stableId);
      }
    }
  };
  return <Button onClick={handleClick}>Save to working report</Button>;
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

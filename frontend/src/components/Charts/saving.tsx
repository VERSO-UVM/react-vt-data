import React from 'react';
import { useItems } from '../ItemsProvider';
import { Button } from '@mantine/core';
import { ChartItem } from '@/types/cachedCharts';

interface ChartProps {
  chart: ChartItem<any>;
}

export function AddChart({ chart }: ChartProps) {
  const { addItem } = useItems();

  return <Button onClick={() => addItem(chart)}>Save to working report</Button>;
}

export function RemoveChart({ chart }: ChartProps) {
  const { removeItem } = useItems();

  console.log(`Removing ${chart.id}`);
  return (
    <Button onClick={() => removeItem(chart.id)}>
      Remove from working report
    </Button>
  );
}

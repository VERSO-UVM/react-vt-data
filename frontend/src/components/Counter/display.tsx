import { useItems } from '@/components/ItemsProvider';
import type { CounterItem } from '@/types/cachedCharts';

export default function CounterDisplay() {
  const { items } = useItems();

  const counter = items.find(
    (i): i is CounterItem => i.id === 'counter1' && i.type === 'counter',
  );

  if (!counter) return <div>No counter yet</div>;

  return <div>Count: {counter.value}</div>;
}

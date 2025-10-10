import { useItems } from '@/components/ItemsProvider';

export default function CounterDisplay() {
  const { items } = useItems();

  const counter = items.find(
    (
      i,
    ): i is {
      id: string;
      type: 'counter';
      value: number;
      title: string;
    } => i.id === 'counter1' && i.type === 'counter',
  );

  if (!counter) return <div>No counter yet</div>;

  return <div>Count: {counter.value}</div>;
}

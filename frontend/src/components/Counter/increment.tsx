import { useItems } from '@/components/ItemsProvider';
import { Button } from '@mantine/core';
import { GenItem } from '@/types/cachedCharts';

export default function IncrementButton() {
  const { items, addItem, updateItem } = useItems();

  let counter: GenItem | undefined = items.find(
    (i): i is { id: string; type: 'counter'; data: { count: number } } =>
      i.id === 'counter1' && i.type === 'counter',
  );

  if (!counter) {
    counter = { id: 'counter1', type: 'counter', data: { count: 0 } };
    addItem(counter);
  }

  const handleIncrement = () => {
    updateItem({
      ...counter,
      data: { ...counter.data, count: counter.data.count + 1 },
    });
  };

  return (
    <Button color="blue" variant="outline" onClick={handleIncrement}>
      +1
    </Button>
  );
}

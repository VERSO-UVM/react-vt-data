import { useItems } from '@/components/ItemsProvider';
import { Button } from '@mantine/core';
import type { CounterItem } from '@/types/cachedCharts';

export default function IncrementButton() {
  const { items, addItem, updateItem } = useItems();

  const handleIncrement = () => {
    const counter = items.find(
      (i): i is CounterItem => i.id === 'counter1' && i.type === 'counter',
    );

    if (counter) {
      updateItem({ ...counter, value: counter.value + 1 });
    } else {
      addItem({
        id: 'counter1',
        type: 'counter',
        value: 1,
        title: 'counter',
      });
    }
  };

  return (
    <Button color="blue" variant="outline" onClick={handleIncrement}>
      +1
    </Button>
  );
}

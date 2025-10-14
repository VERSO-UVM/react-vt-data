import { useItems } from '../ItemsProvider';
import { Button } from '@mantine/core';
export default function ResetButton() {
  const { setItems } = useItems();

  const handleReset = () => {
    localStorage.removeItem('items-storage'); // clear persisted state
    setItems([]); // clear in-memory store
  };

  return <Button onClick={handleReset}>Reset State</Button>;
}

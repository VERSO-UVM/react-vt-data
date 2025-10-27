import { Button } from '@mantine/core';
import axios from 'axios';
import { useFilter } from './FilterContext';

type ApplyButtonProps = {
  dataURL: string;
  onData?: (data: any) => void;
  disabled?: boolean;
};

export default function ApplyButton({
  dataURL,
  onData,
  disabled,
}: ApplyButtonProps) {
  const { selectedFilters, labels, format } = useFilter();

  const handleApply = async () => {
    if (!dataURL) return;

    try {
      const filters: Record<string, string[]> = {};
      Object.entries(selectedFilters).forEach(([level, value]) => {
        const colName = labels[Number(level)];
        if (colName && value && value !== 'All') filters[colName] = [value];
      });

      console.log('Sending filters:', filters);
      const response = await axios.post(dataURL, { filters, format });
      onData?.(response.data);
    } catch (err) {
      console.error('Error fetching filtered data:', err);
    }
  };

  return (
    <Button onClick={handleApply} disabled={disabled}>
      Apply
    </Button>
  );
}

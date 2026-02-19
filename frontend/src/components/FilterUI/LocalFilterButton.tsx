import { Button } from '@mantine/core';
import { useFilter } from './FilterContext';
import { useApplyFilters } from './useApplyFilters';

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
  const apply = useApplyFilters();

  const handleApply = () => {
    const filters: Record<string, string[]> = {};

    for (const [level, value] of Object.entries(selectedFilters)) {
      const colName = labels[Number(level)];
      if (colName && value && value !== 'All') filters[colName] = [value];
    }

    apply(dataURL, filters, format, undefined, onData);
  };

  return (
    <Button onClick={handleApply} disabled={disabled}>
      Apply
    </Button>
  );
}

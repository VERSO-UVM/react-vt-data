import { Button } from '@mantine/core';
import { useFilter } from './FilterContext';
import { useApplyFilters, FilterValue } from './useApplyFilters';

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
  const { selectedFilters, labels, range } = useFilter();
  const apply = useApplyFilters();

  const handleApply = () => {
    const filters: Record<string, FilterValue> = {};

    for (const [level, value] of Object.entries(selectedFilters)) {
      const colName = labels[Number(level)];
      if (colName && value && value !== 'All') filters[colName] = [value];
    }

    if (range) {
      // Key by label, not column — the backend shim maps label -> column.
      filters[range.label] = { min: range.selected[0], max: range.selected[1] };
    }

    apply({ dataURL: dataURL, filters: filters, onData: onData });
  };

  return (
    <Button onClick={handleApply} disabled={disabled}>
      Apply
    </Button>
  );
}

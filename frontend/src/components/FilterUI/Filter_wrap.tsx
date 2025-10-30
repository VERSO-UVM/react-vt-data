import { Stack } from '@mantine/core';
import GenericFilter from './GetFilterTreeFromAPI';
import ApplyButton from './LocalFilterButton';
import { useFilter } from './FilterContext';

type FilterContainerProps = {
  apiURL: string;
  dataURL: string;
  onData?: (data: any) => void;
};

export default function FilterContainer({
  apiURL,
  dataURL,
  onData,
}: FilterContainerProps) {
  const { selectedFilters } = useFilter();
  return (
    <Stack>
      <GenericFilter apiURL={apiURL} />
      <ApplyButton
        dataURL={dataURL}
        onData={onData}
        disabled={Object.keys(selectedFilters).length === 0}
      />
    </Stack>
  );
}

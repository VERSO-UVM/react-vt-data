import { Stack, Group, Button } from '@mantine/core';
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
  const { selectedFilters, setSelectedFilters } = useFilter();
  return (
    <Stack gap="md">
      <GenericFilter apiURL={apiURL} />

      <Group grow>
        <Button
          variant="default"
          onClick={() => setSelectedFilters({})}
        >
          Reset
        </Button>

        <ApplyButton
          dataURL={dataURL}
          onData={onData}
          disabled={Object.keys(selectedFilters).length === 0}
        />
      </Group>
    </Stack>
  );
}

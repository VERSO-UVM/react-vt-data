import { Button } from '@mantine/core';
import { FilterSpec } from './filterTypes';
import { postRequest } from './filterRequest';
import axios from 'axios';

interface ApplyButtonProps {
  dataURL: string;
  specs: FilterSpec[];
  onData: (data: any) => void;
  disabled?: boolean;
}

export default function ApplyButton(params: ApplyButtonProps) {
  const { dataURL, specs, onData, disabled } = params;

  const handleApply = async () => {
    const payload = specs.filter(
      (s) => s.filters && Object.keys(s.filters).length > 0,
    );
    try {
      const data = await postRequest({ dataURL, payload });
      onData(data);
    } catch (e) {}
  };

  return (
    <Button onClick={handleApply} disabled={disabled}>
      Apply
    </Button>
  );
}

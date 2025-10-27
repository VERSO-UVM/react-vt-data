'use client';

import CounterDisplay from '@/components/Counter/display';
import IncrementButton from '@/components/Counter/increment';
import { Container } from '@mantine/core';
import ResetButton from '@/components/reload';
import BDLoad from '@/components/Data_Loading/basic_data_load';

export default function BasePage() {
  return (
    <Container>
      <CounterDisplay />
      <IncrementButton />
      <ResetButton />
      <BDLoad />
    </Container>
  );
}

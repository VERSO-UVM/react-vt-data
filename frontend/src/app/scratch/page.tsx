'use client';

import CounterDisplay from '@/components/Counter/display';
import IncrementButton from '@/components/Counter/increment';
import { Container } from '@mantine/core';

export default function BasePage() {
  return (
    <Container>
      <CounterDisplay />
      <IncrementButton />
    </Container>
  );
}

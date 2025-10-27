'use client';

import BasePage from './base_page';
import { FilterProvider } from '@/components/FilterUI/FilterContext';

export default function ScratchPage() {
  return (
    <FilterProvider>
      <BasePage />
    </FilterProvider>
  );
}

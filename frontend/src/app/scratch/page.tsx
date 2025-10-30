'use client';

import BasePage from './page_content';
import { FilterProvider } from '@/components/FilterUI/FilterContext';

export default function ScratchPage() {
  return (
    <FilterProvider>
      <BasePage />
    </FilterProvider>
  );
}

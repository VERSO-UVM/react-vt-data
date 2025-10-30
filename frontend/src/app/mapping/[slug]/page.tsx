'use client';

import MappingContent from './page_content';
import { FilterProvider } from '@/components/FilterUI/FilterContext';

export default function MapPage() {
  return (
    <FilterProvider>
      <MappingContent />
    </FilterProvider>
  );
}

import MappingContent from './page_content';
import { FilterProvider } from '@/components/FilterUI/FilterContext';

export function generateStaticParams() {
  return [
    { slug: 'zoning' },
    { slug: 'soil-suitability' },
    { slug: 'flood-legal' },
  ];
}

export default function MapPage() {
  return (
    <FilterProvider>
      <MappingContent />
    </FilterProvider>
  );
}

import MappingContent from './page_content';
import { FilterProvider } from '@/components/FilterUI/FilterContext';

export function generateStaticParams() {
  return [
    { slug: 'zoning' },
    { slug: 'soil-suitability' },
    { slug: 'treatment-facilities'},
    { slug: 'service_areas'},
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

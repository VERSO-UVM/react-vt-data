import MappingContent from './page_content';
import { FilterProvider } from '@/components/FilterUI/FilterContext';

export function generateStaticParams() {
  return [
    { slug: 'zoning' },
    { slug: 'soil-suitability' },
    { slug: 'treatment-facilities'},
    { slug: 'service-areas'},
    { slug: 'flood-legal' },
    { slug: 'ambulance'}
  ];
}

export default function MapPage() {
  return (
    <FilterProvider>
      <MappingContent />
    </FilterProvider>
  );
}

'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type FilterContextType = {
  selectedFilters: Record<number, string>;
  setSelectedFilters: (sel: Record<number, string>) => void;
  labels: string[];
  setLabels: (labels: string[]) => void;
  format: string | undefined;
  setFormat: (format: string | undefined) => void;
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedFilters, setSelectedFilters] = useState<
    Record<number, string>
  >({});
  const [labels, setLabels] = useState<string[]>([]);
  const [format, setFormat] = useState<string | undefined>(undefined);

  return (
    <FilterContext.Provider
      value={{
        selectedFilters,
        setSelectedFilters,
        labels,
        setLabels,
        setFormat,
        format,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (!context) throw new Error('useFilter must be used inside FilterProvider');
  return context;
}

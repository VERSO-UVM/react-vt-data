'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type RangeState = {
  col: string; // "Data_Value" — what ApplyButton sends
  label: string; // "Percent" — caption
  bounds: [number, number]; // full min/max from fetch
  selected: [number, number]; // user's current pick
};

type FilterContextType = {
  selectedFilters: Record<number, string>;
  setSelectedFilters: (sel: Record<number, string>) => void;
  labels: string[];
  setLabels: (labels: string[]) => void;
  range: RangeState | null;
  setRange: (range: RangeState | null) => void;
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
  const [range, setRange] = useState<RangeState | null>(null);

  return (
    <FilterContext.Provider
      value={{
        selectedFilters,
        setSelectedFilters,
        labels,
        setLabels,
        range,
        setRange,
        format,
        setFormat,
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

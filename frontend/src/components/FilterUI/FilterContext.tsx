'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type FilterContextType = {
  selectedFilters: Record<number, string>;
  setSelectedFilters: (sel: Record<number, string>) => void;
  labels: string[];
  setLabels: (labels: string[]) => void;
  selectedRange: [number, number] | null;
  setSelectedRange: (range: [number, number]) => void;
  rangeCol: string | null;
  setRangeCol: (col: string | null) => void;
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
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>(
    null,
  );
  const [rangeCol, setRangeCol] = useState<string | null>(null);

  return (
    <FilterContext.Provider
      value={{
        selectedFilters,
        setSelectedFilters,
        labels,
        setLabels,
        selectedRange,
        setSelectedRange,
        rangeCol,
        setRangeCol,
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

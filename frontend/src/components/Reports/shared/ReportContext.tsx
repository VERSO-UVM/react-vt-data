'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { DataRow } from '@/types/cachedCharts';
import type { Location } from '@/components/profile/profileStore';
import { DEFAULT_ACCENT, TOPIC_ACCENTS } from './colors';

interface Place {
  name: string;
  location?: Location;
  current: DataRow[];
  history: DataRow[];
}

export interface ReportData {
  year: number;
  primary: Place;
  comparison: Place;
  // Extra time-series tables, keyed by the SECTIONS.timeseries config key.
  timeseries?: Record<string, { primary: DataRow[]; comparison: DataRow[] }>;
  // Section-wide endpoints, keyed by the SECTIONS.allAreas config key.
  allAreas?: Record<string, DataRow[]>;
}

export interface ReportContextValue extends ReportData {
  topic: string;
  accent: string;
}

const ReportContext = createContext<ReportContextValue | null>(null);

export function ReportProvider({
  topic,
  data,
  children,
}: {
  topic: string;
  data: ReportData;
  children: ReactNode;
}) {
  return (
    <ReportContext.Provider
      value={{ ...data, topic, accent: TOPIC_ACCENTS[topic] ?? DEFAULT_ACCENT }}
    >
      {children}
    </ReportContext.Provider>
  );
}

export function useReport(): ReportContextValue {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error('useReport must be used inside <ReportProvider>');
  return ctx;
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GenItem } from '@/types/cachedCharts';

export interface ChartCustomization {
  view?: 'chart' | 'table'; // explicit override; undefined = component default
  title?: string; // overrides chart.description in display + PDF
  notes?: string; // overrides chart.notes in display + PDF
}

export type LayoutStyle = 'list' | 'grid';

interface ItemsStore {
  // Auto-populated working report charts (from chartDefs): track by def ID
  excludedIds: string[];
  includeById: (defId: string) => void;
  excludeById: (defId: string) => void;
  toggleExcluded: (defId: string) => void;
  clearExclusions: () => void;
  isIncluded: (defId: string) => boolean;

  // Manually saved charts from other pages (comparison, etc.)
  items: GenItem[];
  addItem: (item: GenItem) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;

  // Report layout customization: reordering, per-chart title/notes/view,
  // all keyed by the stable defId (chartDefs id, or saved item.id) — never
  // by ChartItem.id, which is regenerated on every render.
  chartCustomizations: Record<string, ChartCustomization>;
  sectionOrder: string[];
  sectionChartOrder: Record<string, string[]>;
  layoutStyle: LayoutStyle;
  setChartView: (defId: string, view: 'chart' | 'table') => void;
  setChartTitle: (defId: string, title: string) => void;
  setChartNotes: (defId: string, notes: string) => void;
  resetChartCustomization: (defId: string) => void;
  reorderSections: (newOrder: string[]) => void;
  reorderChartsInSection: (category: string, orderedDefIds: string[]) => void;
  setLayoutStyle: (style: LayoutStyle) => void;
  resetLayout: () => void;

  // Session guard — not persisted
  sessionInitialized: boolean;
  setSessionInitialized: (v: boolean) => void;
  // Set when the user clears the report; cleared after auto-exclude re-runs
  pendingReset: boolean;
  setPendingReset: (v: boolean) => void;
}

export const useItems = create<ItemsStore>()(
  persist(
    (set, get) => ({
      excludedIds: [],
      includeById: (defId) =>
        set((s) => ({
          excludedIds: s.excludedIds.filter((id) => id !== defId),
        })),
      excludeById: (defId) =>
        set((s) =>
          s.excludedIds.includes(defId)
            ? s
            : { excludedIds: [...s.excludedIds, defId] },
        ),
      toggleExcluded: (defId) =>
        set((s) =>
          s.excludedIds.includes(defId)
            ? { excludedIds: s.excludedIds.filter((id) => id !== defId) }
            : { excludedIds: [...s.excludedIds, defId] },
        ),
      clearExclusions: () => set({ excludedIds: [] }),
      isIncluded: (defId) => !get().excludedIds.includes(defId),

      items: [],
      addItem: (item) =>
        set((s) => ({
          items: [...s.items.filter((x) => x.id !== item.id), item],
        })),
      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clearItems: () => set({ items: [] }),

      chartCustomizations: {},
      sectionOrder: [],
      sectionChartOrder: {},
      layoutStyle: 'list',
      setChartView: (defId, view) =>
        set((s) => ({
          chartCustomizations: {
            ...s.chartCustomizations,
            [defId]: { ...s.chartCustomizations[defId], view },
          },
        })),
      setChartTitle: (defId, title) =>
        set((s) => ({
          chartCustomizations: {
            ...s.chartCustomizations,
            [defId]: { ...s.chartCustomizations[defId], title },
          },
        })),
      setChartNotes: (defId, notes) =>
        set((s) => ({
          chartCustomizations: {
            ...s.chartCustomizations,
            [defId]: { ...s.chartCustomizations[defId], notes },
          },
        })),
      resetChartCustomization: (defId) =>
        set((s) => {
          const next = { ...s.chartCustomizations };
          delete next[defId];
          return { chartCustomizations: next };
        }),
      reorderSections: (newOrder) => set({ sectionOrder: newOrder }),
      reorderChartsInSection: (category, orderedDefIds) =>
        set((s) => ({
          sectionChartOrder: {
            ...s.sectionChartOrder,
            [category]: orderedDefIds,
          },
        })),
      setLayoutStyle: (style) => set({ layoutStyle: style }),
      resetLayout: () =>
        set({
          chartCustomizations: {},
          sectionOrder: [],
          sectionChartOrder: {},
          layoutStyle: 'list',
        }),

      sessionInitialized: false,
      setSessionInitialized: (v) => set({ sessionInitialized: v }),
      pendingReset: false,
      setPendingReset: (v) => set({ pendingReset: v }),
    }),
    {
      name: 'report-prefs',
      partialize: (state) => ({
        excludedIds: state.excludedIds,
        items: state.items,
        chartCustomizations: state.chartCustomizations,
        sectionOrder: state.sectionOrder,
        sectionChartOrder: state.sectionChartOrder,
        layoutStyle: state.layoutStyle,
      }),
    },
  ),
);

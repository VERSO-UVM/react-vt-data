import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GenItem } from '@/types/cachedCharts';

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
      }),
    },
  ),
);

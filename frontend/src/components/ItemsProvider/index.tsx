import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GenItem } from '@/types/cachedCharts';

interface ItemsStore {
  items: GenItem[];
  setItems: (items: GenItem[]) => void;
  addItem: (item: GenItem) => void;
  removeItem: (id: string) => void;
  updateItem: (item: GenItem) => void;
}

export const useItems = create<ItemsStore>()(
  persist(
    (set) => ({
      items: [],
      setItems: (items: GenItem[]) => set({ items }),
      addItem: (item) => {
        return set((s) => ({
          items: [...s.items.filter((x) => x.id !== item.id), item],
        }));
      },
      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      updateItem: (item) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === item.id ? item : i)),
        })),
    }),
    { name: 'items-storage' }, // localStorage key
  ),
);

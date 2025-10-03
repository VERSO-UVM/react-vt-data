'use client';

import React, { createContext, useContext } from 'react';
import { useLocalStorage, useLogger } from '@mantine/hooks';
import type { GenItem, ItemsContextType } from '@/types/cachedCharts';

const ItemsContext = createContext<ItemsContextType | null>(null);

export function ItemsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useLocalStorage<GenItem[]>({
    key: 'items',
    defaultValue: [],
  });

  const addItem = (item: GenItem) => setItems((prev) => [...prev, item]);
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (updated: GenItem) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  if (!items) return null;

  return (
    <ItemsContext.Provider value={{ items, addItem, removeItem, updateItem }}>
      {children}
    </ItemsContext.Provider>
  );
}

export function useItems() {
  const ctx = useContext(ItemsContext);
  if (!ctx) throw new Error('UseItems must be used within ItemsProvider');
  return ctx;
}

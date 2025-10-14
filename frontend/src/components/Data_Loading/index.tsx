import { useEffect, useState } from 'react';
import type { GenItem } from '@/types/cachedCharts';

export function useItemData(item: GenItem) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const dataRef = item.dataRef;

  useEffect(() => {
    if (!dataRef) return;

    setLoading(true);
    fetch(`/api/dataset/${dataRef.datasetId}`, {
      method: 'POST',
      body: JSON.stringify({
        datasetID: dataRef.datasetId,
        filters: dataRef.filters,
        params: dataRef.params,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [item]);

  return { data, loading };
}

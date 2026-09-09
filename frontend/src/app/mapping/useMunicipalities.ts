// src/app/mapping/useMunicipalities.ts
import { useState, useEffect } from 'react';
import axios from 'axios';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import { BASE_API_URL } from '@/config';

const MUNICIPALITIES_URL = `${BASE_API_URL}/data/vermont/municipalities`;

export interface MunicipalityProperty {
  GEOID: string;
  NAME: string;
}

export type MunicipalityFeature = Feature<Geometry, MunicipalityProperty>;

export function useMunicipalities() {
  const [data, setData] = useState<FeatureCollection<
    Geometry,
    MunicipalityProperty
  > | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Replace with your FastAPI endpoint URL or public asset path
    axios
      .get(MUNICIPALITIES_URL)
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => console.error('Failed to load municipalities', err))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

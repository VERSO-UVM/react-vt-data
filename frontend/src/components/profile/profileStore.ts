import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Location {
  type: 'state' | 'county' | 'town' | 'rpc';
  state?: boolean;
  county?: string | null;
  town?: string | null;
  rpc?: string | null;
  name: string;
}

export const INTEREST_OPTIONS = [
  'Housing',
  'Demographics',
  'Education',
  'Labor & Economy',
  'Land Use',
] as const;

export type Interest = (typeof INTEREST_OPTIONS)[number];

export const YEAR_MIN_OVERALL = 2009;
export const YEAR_MAX_OVERALL = 2024;

interface ProfileStore {
  myLocation: Location;
  comparison: Location;
  interests: string[];
  yearMin: number;
  yearMax: number;
  setLocation: (location: Location) => void;
  setComparison: (location: Location) => void;
  setInterests: (interests: string[]) => void;
  setYearRange: (min: number, max: number) => void;
}

export const useProfile = create<ProfileStore>()(
  persist(
    (set) => ({
      myLocation: { type: 'state', state: true, name: 'Vermont' },
      comparison: { type: 'county', county: 'Chittenden', name: 'Chittenden' },
      interests: [],
      yearMin: YEAR_MIN_OVERALL,
      yearMax: YEAR_MAX_OVERALL,
      setLocation: (location) => set({ myLocation: location }),
      setComparison: (location) => set({ comparison: location }),
      setInterests: (interests) => set({ interests }),
      setYearRange: (min, max) => set({ yearMin: min, yearMax: max }),
    }),
    { name: 'location-storage' },
  ),
);

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

interface ProfileStore {
  myLocation: Location;
  comparison: Location;
  interests: string[];
  setLocation: (location: Location) => void;
  setComparison: (location: Location) => void;
  setInterests: (interests: string[]) => void;
}

export const useProfile = create<ProfileStore>()(
  persist(
    (set) => ({
      myLocation: { type: 'state', state: true, name: 'Vermont' },
      comparison: { type: 'county', county: 'Chittenden', name: 'Chittenden' },
      interests: [],
      setLocation: (location) => set({ myLocation: location }),
      setComparison: (location) => set({ comparison: location }),
      setInterests: (interests) => set({ interests }),
    }),
    { name: 'location-storage' },
  ),
);

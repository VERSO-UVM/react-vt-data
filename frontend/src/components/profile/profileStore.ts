import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Location {
  type: 'state' | 'county' | 'town' | 'rpc';
  state?: boolean;
  county?: string | null;
  town?: string | null;
  rpc?: string | null;
}

interface ProfileStore {
  myLocation: Location;
  comparison: Location;
  setLocation: (location: Location) => void;
  setComparison: (location: Location) => void;
}

export const useProfile = create<ProfileStore>()(
  persist(
    (set) => ({
      myLocation: { type: 'state', state: true },
      comparison: { type: 'county', county: 'Chittenden' },
      setLocation: (location) => set({ myLocation: location }),
      setComparison: (location) => set({ comparison: location }),
    }),
    { name: 'location-storage' },
  ),
);

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Location {
  type: 'state' | 'county' | 'town' | 'rpc' | 'national';
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
export const YEAR_MAX_OVERALL = new Date().getFullYear() - 2;

interface ProfileStore {
  myLocation: Location;
  comparison: Location;
  interests: string[];
  yearMin: number;
  yearMax: number;
  profileSet: boolean;
  profileModalOpen: boolean;
  setLocation: (location: Location) => void;
  setComparison: (location: Location) => void;
  setInterests: (interests: string[]) => void;
  setYearRange: (min: number, max: number) => void;
  setProfileSet: (v: boolean) => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
}

export const useProfile = create<ProfileStore>()(
  persist(
    (set) => ({
      myLocation: { type: 'state', state: true, name: 'Vermont' },
      comparison: { type: 'state', state: true, name: 'Vermont' },
      interests: [],
      yearMin: YEAR_MIN_OVERALL,
      yearMax: YEAR_MAX_OVERALL,
      profileSet: false,
      profileModalOpen: false,
      setLocation: (location) => set({ myLocation: location }),
      setComparison: (location) => set({ comparison: location }),
      setInterests: (interests) => set({ interests }),
      setYearRange: (min, max) => set({ yearMin: min, yearMax: max }),
      setProfileSet: (v) => set({ profileSet: v }),
      openProfileModal: () => set({ profileModalOpen: true }),
      closeProfileModal: () => set({ profileModalOpen: false }),
    }),
    {
      name: 'location-storage',
      // Whether the dialog is open is per page view, not part of the saved
      // profile; persisting it reopened the dialog on every reload after
      // leaving it open. Ignore it in profiles saved before this, too.
      partialize: (state) => {
        const saved: Partial<ProfileStore> = { ...state };
        delete saved.profileModalOpen;
        return saved;
      },
      merge: (saved, current) => ({
        ...current,
        ...(saved as Partial<ProfileStore>),
        profileModalOpen: false,
      }),
    },
  ),
);

// Whether the saved profile has loaded from localStorage. Pages are statically
// exported, so on a full page load React's hydration render gets the store's
// defaults (Vermont vs. Vermont) from useProfile(), and the saved profile only
// arrives on the next render. Wait for this before fetching by location or
// seeding local state from the profile. Client-side navigation is already
// hydrated, so this is true from the first render there.
export function useProfileHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useProfile.persist.onFinishHydration(onChange),
    () => useProfile.persist.hasHydrated(),
    () => false,
  );
}

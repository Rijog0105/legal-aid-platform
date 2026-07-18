import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { UserWithDetails } from '@/types';
import type { RoleName } from '@/constants';

interface AuthState {
  /* State */
  session: Session | null;
  profile: UserWithDetails | null;
  isLoading: boolean;
  isInitialized: boolean;

  /* Computed */
  isAuthenticated: boolean;
  roleName: RoleName | null;
  userId: string | null;
  personId: string | null;
  displayName: string | null;

  /* Actions */
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserWithDetails | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}

const initialState = {
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  isAuthenticated: false,
  roleName: null,
  userId: null,
  personId: null,
  displayName: null,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  setSession: (session) => {
    set({ session, isAuthenticated: !!session });
  },

  setProfile: (profile) => {
    set({
      profile,
      roleName: profile?.role?.name ?? null,
      userId: profile?.id ?? null,
      personId: profile?.person_id ?? null,
      displayName: profile?.person?.full_name ?? null,
    });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setInitialized: (isInitialized) => {
    set({ isInitialized });
  },

  reset: () => {
    set(initialState);
  },
}));

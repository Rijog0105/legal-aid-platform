import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  onAuthStateChange,
  fetchUserProfile,
} from '@/features/auth/services/authService';
import type { RoleName } from '@/constants';

// Global counter so we can tell subscriptions apart in the logs
let _subCount = 0;

/**
 * Primary auth hook — initializes auth listener, provides login/logout/signup actions.
 */
export function useAuth() {
  const store = useAuthStore();

  /* ─── Initialize auth listener on mount ─── */
  useEffect(() => {
    const subId = ++_subCount;
    console.log(`[useAuth] useEffect MOUNT — registering subscription #${subId}`);

    const { data: { subscription } } = onAuthStateChange(async (_event, session) => {
      console.log(`[useAuth] onAuthStateChange fired on sub #${subId} — event: "${_event}", session:`, session ? 'EXISTS (user: ' + session.user?.id + ')' : 'NULL');

      store.setSession(session);

      if (session?.user) {
        console.log(`[useAuth] sub #${subId} — session.user present, calling fetchUserProfile for ${session.user.id}`);
        store.setLoading(true);
        const profile = await fetchUserProfile(session.user.id);
        console.log(`[useAuth] sub #${subId} — fetchUserProfile returned:`, profile ? 'PROFILE (role: ' + profile.role?.name + ')' : 'NULL (RLS block or missing row)');
        store.setProfile(profile);
        store.setLoading(false);
      } else {
        console.log(`[useAuth] sub #${subId} — no session, skipping fetchUserProfile`);
        store.setProfile(null);
        store.setLoading(false);
      }

      console.log(`[useAuth] sub #${subId} — calling setInitialized(true)`);
      store.setInitialized(true);
    });

    return () => {
      console.log(`[useAuth] useEffect CLEANUP — unsubscribing sub #${subId}`);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Actions ─── */
  const login = useCallback(async (email: string, password: string) => {
    store.setLoading(true);
    const result = await authSignIn(email, password);
    if (!result.success) {
      store.setLoading(false);
    }
    return result;
  }, [store]);

  const signup = useCallback(async (email: string, password: string) => {
    store.setLoading(true);
    const result = await authSignUp(email, password);
    if (!result.success) {
      store.setLoading(false);
    }
    return result;
  }, [store]);

  const logout = useCallback(async () => {
    const result = await authSignOut();
    return result;
  }, [store]);

  const hasRole = useCallback(
    (roles: RoleName | RoleName[]): boolean => {
      if (!store.roleName) return false;
      const roleArray = Array.isArray(roles) ? roles : [roles];
      return roleArray.includes(store.roleName);
    },
    [store.roleName]
  );

  return {
    /* State */
    session: store.session,
    profile: store.profile,
    isLoading: store.isLoading,
    isInitialized: store.isInitialized,
    isAuthenticated: store.isAuthenticated,
    roleName: store.roleName,
    userId: store.userId,
    personId: store.personId,
    displayName: store.displayName,

    /* Actions */
    login,
    signup,
    logout,
    hasRole,
  };
}

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

/**
 * Primary auth hook — initializes auth listener, provides login/logout/signup actions.
 */
export function useAuth() {
  const store = useAuthStore();

  /* ─── Initialize auth listener on mount ─── */
  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange(async (_event, session) => {
      store.setSession(session);

      if (session?.user) {
        store.setLoading(true);
        const profile = await fetchUserProfile(session.user.id);
        store.setProfile(profile);
        store.setLoading(false);
      } else {
        store.setProfile(null);
        store.setLoading(false);
      }

      store.setInitialized(true);
    });

    return () => {
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
    if (result.success) {
      store.reset();
    }
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

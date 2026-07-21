import { useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
} from '@/features/auth/services/authService';
import type { RoleName } from '@/constants';

/**
 * Primary auth hook — reads Zustand state and provides login/logout/signup actions.
 * NEVER subscribes to Supabase onAuthStateChange (handled strictly by top-level AuthProvider).
 */
export function useAuth() {
  const store = useAuthStore();

  /* ─── Actions ─── */
  const login = useCallback(async (email: string, password: string) => {
    console.log('[useAuth] login action called for email:', email);
    console.log('[useAuth] BEFORE store.setLoading(true) [login]');
    store.setLoading(true);
    try {
      const result = await authSignIn(email, password);
      if (!result.success) {
        console.log('[useAuth] login result failed, BEFORE store.setLoading(false) [login failed]');
        store.setLoading(false);
      }
      console.log('[useAuth] login returning result:', result);
      return result;
    } catch (err) {
      console.error('[useAuth] CATCH BLOCK in login:', err);
      console.log('[useAuth] BEFORE store.setLoading(false) [login catch]');
      store.setLoading(false);
      return { success: false, error: err instanceof Error ? err.message : 'Login failed' };
    }
  }, [store]);

  const signup = useCallback(async (email: string, password: string) => {
    console.log('[useAuth] signup action called for email:', email);
    console.log('[useAuth] BEFORE store.setLoading(true) [signup]');
    store.setLoading(true);
    try {
      const result = await authSignUp(email, password);
      if (!result.success) {
        console.log('[useAuth] signup result failed, BEFORE store.setLoading(false) [signup failed]');
        store.setLoading(false);
      }
      console.log('[useAuth] signup returning result:', result);
      return result;
    } catch (err) {
      console.error('[useAuth] CATCH BLOCK in signup:', err);
      console.log('[useAuth] BEFORE store.setLoading(false) [signup catch]');
      store.setLoading(false);
      return { success: false, error: err instanceof Error ? err.message : 'Signup failed' };
    }
  }, [store]);

  const logout = useCallback(async () => {
    console.log('[useAuth] logout action called');
    console.log('[useAuth] BEFORE store.setLoading(true) [logout]');
    store.setLoading(true);
    try {
      const result = await authSignOut();
      store.reset();
      console.log('[useAuth] logout completed, authStore reset');
      console.log('[useAuth] logout returning result:', result);
      return result;
    } catch (err) {
      console.error('[useAuth] CATCH BLOCK in logout:', err);
      store.reset();
      return { success: false, error: err instanceof Error ? err.message : 'Logout failed' };
    }
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
    authError: store.authError,

    /* Actions */
    login,
    signup,
    logout,
    hasRole,
    clearAuthError: store.clearAuthError,
  };
}

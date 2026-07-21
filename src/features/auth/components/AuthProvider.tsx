import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  onAuthStateChange,
  fetchUserProfile,
  signOut as authSignOut,
} from '@/features/auth/services/authService';
import { PageLoader } from '@/components/ui';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Single top-level AuthProvider.
 * Establishes EXACTLY ONE Supabase onAuthStateChange subscription
 * for the entire application lifecycle.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const store = useAuthStore();

  useEffect(() => {
    console.log('[AuthProvider] Establishing SINGLE top-level onAuthStateChange subscription');

    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      console.log('[AuthProvider] 1. ON_AUTH_STATE_CHANGE EVENT:', event, '| email:', session?.user?.email, '| user.id:', session?.user?.id);
      try {
        console.log('[AuthProvider] BEFORE store.setLoading(true)');
        store.setLoading(true);
        store.setSession(session);

        if (session?.user) {
          console.log('[AuthProvider] 2. BEFORE fetchUserProfile() for user.id:', session.user.id);
          const profile = await fetchUserProfile(session.user.id);
          console.log('[AuthProvider] 3. AFTER fetchUserProfile() returned profile:', profile?.person?.full_name, '| role:', profile?.role?.name);

          if (!profile) {
            console.warn('[AuthProvider] Unresolvable profile for session user! Signing out and resetting state...');
            await authSignOut();
            store.reset();
            store.setAuthError('Your session is no longer valid. Please sign in again.');
          } else {
            store.setProfile(profile);
          }
        } else {
          console.log('[AuthProvider] No session user, setting profile to null');
          store.setProfile(null);
        }
      } catch (err) {
        console.error('[AuthProvider] CATCH BLOCK in onAuthStateChange:', err);
      } finally {
        console.log('[AuthProvider] BEFORE store.setLoading(false)');
        store.setLoading(false);
        store.setInitialized(true);
      }
    });

    return () => {
      console.log('[AuthProvider] Unsubscribing SINGLE top-level onAuthStateChange subscription');
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!store.isInitialized) {
    return <PageLoader message="Initializing application..." />;
  }

  return <>{children}</>;
}

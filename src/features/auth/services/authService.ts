import type { AuthError, Session, User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';
import type { UserWithDetails } from '@/types';

export interface AuthResult {
  success: boolean;
  error?: string;
}

/**
 * Sign in with email and password.
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Sign up with email and password.
 */
export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Get the current session.
 */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Subscribe to auth state changes.
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Fetch the full user profile (user + role + person) for a given auth user ID.
 */
export async function fetchUserProfile(authUserId: string): Promise<UserWithDetails | null> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      role:roles(*),
      person:persons(*)
    `)
    .eq('auth_user_id', authUserId)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data as UserWithDetails;
}

/**
 * Get the auth user.
 */
export async function getAuthUser(): Promise<{ user: AuthUser | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}

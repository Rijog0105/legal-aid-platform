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
  console.log('[authService] signIn initiated for email:', email);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[authService] signIn failed:', error.message, error);
      console.log('[authService] signIn returning success: false');
      return { success: false, error: error.message };
    }
    console.log('[authService] signIn succeeded for user.id:', data.user?.id);
    console.log('[authService] signIn returning success: true');
    return { success: true };
  } catch (err) {
    console.error('[authService] signIn caught exception:', err);
    console.log('[authService] signIn returning success: false due to exception');
    return { success: false, error: err instanceof Error ? err.message : 'Unknown sign-in error' };
  }
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  console.log('[authService] signUp initiated for email:', email);
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error('[authService] signUp failed:', error.message, error);
      console.log('[authService] signUp returning success: false');
      return { success: false, error: error.message };
    }
    console.log('[authService] signUp succeeded for user.id:', data.user?.id);
    console.log('[authService] signUp returning success: true');
    return { success: true };
  } catch (err) {
    console.error('[authService] signUp caught exception:', err);
    console.log('[authService] signUp returning success: false due to exception');
    return { success: false, error: err instanceof Error ? err.message : 'Unknown sign-up error' };
  }
}

export async function signOut(): Promise<AuthResult> {
  console.log('[authService] signOut initiated');
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[authService] signOut failed:', error.message, error);
      console.log('[authService] signOut returning success: false');
      return { success: false, error: error.message };
    }
    console.log('[authService] signOut succeeded');
    console.log('[authService] signOut returning success: true');
    return { success: true };
  } catch (err) {
    console.error('[authService] signOut caught exception:', err);
    console.log('[authService] signOut returning success: false due to exception');
    return { success: false, error: err instanceof Error ? err.message : 'Unknown sign-out error' };
  }
}

export async function getSession(): Promise<Session | null> {
  console.log('[authService] getSession called');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[authService] getSession error:', error.message, error);
      console.log('[authService] getSession returning null');
      return null;
    }
    console.log('[authService] getSession returning session for email:', data.session?.user?.email);
    return data.session;
  } catch (err) {
    console.error('[authService] getSession caught exception:', err);
    console.log('[authService] getSession returning null due to exception');
    return null;
  }
}

export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  console.log('[authService] subscribing to onAuthStateChange');
  return supabase.auth.onAuthStateChange(callback);
}

export async function fetchUserProfile(authUserId: string): Promise<UserWithDetails | null> {
  console.log('[authService] BEFORE fetchUserProfile() for authUserId:', authUserId);
  
  if (!navigator.onLine) {
    console.warn('[authService] fetchUserProfile failed: network offline');
    throw new Error('NETWORK_UNAVAILABLE');
  }

  try {
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

    if (error) {
      console.error('[authService] fetchUserProfile Supabase error returned:', error);
      return null;
    }

    const typedData = data as UserWithDetails | null;
    console.log('[authService] AFTER fetchUserProfile() returned profile:', typedData);
    return typedData;
  } catch (err) {
    console.error('[authService] fetchUserProfile caught exception:', err);
    
    // Detect if this is a network/fetch exception
    const errStr = String(err).toLowerCase();
    const isNetworkError = 
      errStr.includes('failed to fetch') || 
      errStr.includes('networkerror') || 
      errStr.includes('load failed') || 
      errStr.includes('unreachable') || 
      errStr.includes('network') ||
      errStr.includes('cors');
      
    if (isNetworkError) {
      throw new Error('NETWORK_UNAVAILABLE');
    }
    return null;
  }
}

/**
 * Get the auth user.
 */
export async function getAuthUser(): Promise<{ user: AuthUser | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}

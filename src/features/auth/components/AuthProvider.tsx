import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  onAuthStateChange,
  fetchUserProfile,
  signOut as authSignOut,
} from '@/features/auth/services/authService';
import { PageLoader } from '@/components/ui';
import { supabase } from '@/services/supabase';
import { fetchMyProjectAssignment } from '@/features/volunteer/services/volunteerService';
import { getProjectLifecycleState } from '@/utils/projectLifecycle';
import type { RoleName } from '@/constants';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Helper to dynamically create a profile on first login (post email-confirmation).
 * Enforces 'student' category and default 'volunteer' role securely.
 */
async function createProfileAfterEmailConfirmation(user: any): Promise<boolean> {
  const metadata = user.user_metadata;
  if (!metadata || !metadata.full_name || !metadata.usn_employee_id) {
    console.log('[AuthProvider] Missing metadata on user, cannot auto-create profile:', metadata);
    return false;
  }

  try {
    // 1. Insert into public.persons (category student, status pending)
    const { data: personData, error: personError } = await supabase
      .from('persons')
      .insert([
        {
          full_name: metadata.full_name,
          category: 'student',
          email: user.email,
          phone: metadata.phone || null,
          usn_employee_id: metadata.usn_employee_id,
          department: metadata.department,
          semester: metadata.semester || null,
          registration_status: 'pending',
        },
      ])
      .select('id')
      .single();

    if (personError || !personData) {
      console.error('[AuthProvider] Failed to create person profile on first login:', personError?.message);
      return false;
    }

    // 2. Resolve default volunteer role
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'volunteer')
      .single();

    if (roleError || !roleData) {
      console.error('[AuthProvider] Failed to resolve default role on first login:', roleError?.message);
      return false;
    }

    // 3. Insert into public.users (is_active false)
    const { error: userError } = await supabase.from('users').insert([
      {
        auth_user_id: user.id,
        person_id: personData.id,
        role_id: roleData.id,
        is_active: false,
      },
    ]);

    if (userError) {
      console.error('[AuthProvider] Failed to create user record on first login:', userError.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[AuthProvider] Exception creating profile on first login:', err);
    return false;
  }
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
            console.log('[AuthProvider] Profile not found. Checking if user already exists in public.users...');
            const { data: existingUser, error: checkErr } = await supabase
              .from('users')
              .select('id, is_active')
              .eq('auth_user_id', session.user.id)
              .maybeSingle();

            if (checkErr) {
              console.error('[AuthProvider] Error checking existing user:', checkErr.message);
            }

            if (existingUser) {
              if (!existingUser.is_active) {
                console.log('[AuthProvider] User profile exists but is pending approval.');
                await authSignOut();
                store.reset();
                store.setAuthError('Your registration is pending approval by a Faculty Coordinator.');
                return;
              }
            } else {
              // Attempt first sign-in profile creation
              console.log('[AuthProvider] No database user found. Attempting profile creation from metadata...');
              const created = await createProfileAfterEmailConfirmation(session.user);
              if (created) {
                console.log('[AuthProvider] Profile created successfully. User is now pending approval.');
                await authSignOut();
                store.reset();
                store.setAuthError('Your registration has been submitted successfully and is pending approval.');
                return;
              }
            }

            console.warn('[AuthProvider] Unresolvable profile for session user! Signing out and resetting state...');
            await authSignOut();
            store.reset();
            store.setAuthError('Your session is no longer valid. Please sign in again.');
          } else {
            // Dynamic role override logic for student/volunteer accounts temporarily promoted to Team Lead
            let roleOverride: RoleName | null = null;
            if (profile.role?.name === 'volunteer') {
              try {
                const assignment = await fetchMyProjectAssignment(profile.person_id);
                if (assignment && assignment.campPerson?.camp_role === 'team_lead') {
                  const lc = getProjectLifecycleState(assignment.camp);
                  const assignedPhase = (assignment.campPerson as any).phase;
                  const isPhaseActive =
                    assignedPhase === null || // Legacy matches any active phase
                    (lc.isSurveyActive && assignedPhase === 'survey') ||
                    (lc.isCampActive && assignedPhase === 'camp') ||
                    (lc.isBetweenPhases && assignedPhase === 'camp');

                  if (lc.state !== 'completed' && lc.state !== 'draft' && isPhaseActive) {
                    console.log('[AuthProvider] Active Team Lead assignment detected. Overriding UI role.');
                    roleOverride = 'team_lead';
                  } else {
                    console.log('[AuthProvider] Team Lead assignment is inactive, phase mismatch, or completed. Reverting to volunteer UI.');
                  }
                }
              } catch (err) {
                console.error('[AuthProvider] Error resolving dynamic team_lead role:', err);
              }
            }

            store.setProfile(profile, roleOverride);
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

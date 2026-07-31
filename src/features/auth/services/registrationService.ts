import { supabase } from '@/services/supabase';
import type { PersonCategory } from '@/constants';

export interface RegisterPayload {
  full_name: string;
  email: string;
  phone: string;
  category: 'faculty' | 'student';
  usn_employee_id: string;
  department: string;
  semester?: string | null;
  password: string;
}

/**
 * Complete registration flow following the existing architecture:
 *
 *   auth.users  ←  supabase.auth.signUp()
 *       ↓
 *   public.users (auth_user_id, person_id, role_id, is_active=false)
 *       ↓
 *   public.persons (full_name, category, …registration fields)
 *
 * The user is marked is_active=false until a Faculty/Admin approves them
 * in the People Registry. The user is signed out immediately after
 * registration so they cannot access the application until approved.
 */
export async function registerUser(
  payload: RegisterPayload
): Promise<{ success: boolean; error?: string }> {
  console.log('[registrationService] registerUser initiated for email:', payload.email);

  try {
    // ── Step 1: Create Supabase Auth account ─────────────────────
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
    });

    if (authError) {
      console.error('[registrationService] signUp error:', authError.message);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Registration failed to create auth account.' };
    }

    const authUserId = authData.user.id;

    // ── Step 2: Insert into public.persons ───────────────────────
    // Note: auth_user_id does NOT exist on persons. It lives on public.users.
    const { data: personData, error: personError } = await supabase
      .from('persons')
      .insert([
        {
          full_name: payload.full_name,
          category: payload.category as PersonCategory,
          email: payload.email,
          phone: payload.phone,
          usn_employee_id: payload.usn_employee_id,
          department: payload.department,
          semester: payload.semester || null,
          registration_status: 'pending',
        },
      ])
      .select('id')
      .single();

    if (personError || !personData) {
      console.error('[registrationService] persons INSERT error:', personError?.message);
      // Clean up: sign out so the orphaned auth user doesn't linger as authenticated
      await supabase.auth.signOut();
      return {
        success: false,
        error: personError?.message ?? 'Failed to create person record.',
      };
    }

    const personId = personData.id;

    // ── Step 3: Look up the default Volunteer role id ────────────
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'volunteer')
      .single();

    if (roleError || !roleData) {
      console.error('[registrationService] role lookup error:', roleError?.message);
      await supabase.auth.signOut();
      return { success: false, error: 'Could not resolve default role.' };
    }

    // ── Step 4: Insert into public.users (is_active=false) ───────
    // Allowed by the "users_self_register" RLS policy (auth_user_id = auth.uid() AND is_active=false)
    const { error: userError } = await supabase.from('users').insert([
      {
        auth_user_id: authUserId,
        person_id: personId,
        role_id: roleData.id,
        is_active: false, // blocked from application access until Faculty approves
      },
    ]);

    if (userError) {
      console.error('[registrationService] users INSERT error:', userError.message);
      await supabase.auth.signOut();
      return {
        success: false,
        error: userError.message,
      };
    }

    // ── Step 5: Sign out immediately ─────────────────────────────
    // The user must not receive application access until approved.
    await supabase.auth.signOut();

    return { success: true };
  } catch (err) {
    console.error('[registrationService] caught exception:', err);
    // Best-effort sign out on unexpected failure
    try { await supabase.auth.signOut(); } catch (_) { /* ignore */ }
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Registration failed. Please try again.',
    };
  }
}

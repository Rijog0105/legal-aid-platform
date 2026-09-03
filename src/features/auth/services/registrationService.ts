import { supabase } from '@/services/supabase';

export interface RegisterPayload {
  full_name: string;
  email: string;
  phone: string;
  category: 'faculty' | 'student';
  usn_employee_id?: string | null;
  department: string;
  semester?: string | null;
  designation?: string | null;
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
/**
 * Helper to immediately create the student or faculty profile in persons and users tables.
 * Used when email confirmation is disabled and signUp returns a session immediately.
 */
async function insertPersonAndUserImmediate(user: any, payload: RegisterPayload): Promise<void> {
  const { data: personData, error: personError } = await supabase
    .from('persons')
    .insert([
      {
        full_name: payload.full_name,
        category: payload.category,
        email: payload.email,
        phone: payload.phone || null,
        usn_employee_id: payload.usn_employee_id || null,
        department: payload.department,
        semester: payload.category === 'faculty' ? null : (payload.semester || null),
        designation: payload.category === 'faculty' ? (payload.designation || null) : null,
        registration_status: 'pending',
      },
    ])
    .select('id')
    .single();

  if (personError || !personData) {
    throw new Error(personError?.message || 'Failed to create person record.');
  }

  const roleName = payload.category === 'faculty' ? 'faculty' : 'volunteer';
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .single();

  if (roleError || !roleData) {
    throw new Error(roleError?.message || 'Failed to resolve default role.');
  }

  const { error: userError } = await supabase.from('users').insert([
    {
      auth_user_id: user.id,
      person_id: personData.id,
      role_id: roleData.id,
      is_active: false, // User remains inactive until Coordinator approval
    },
  ]);

  if (userError) {
    throw new Error(userError.message);
  }
}

export async function registerUser(
  payload: RegisterPayload
): Promise<{ success: boolean; error?: string }> {
  console.log('[registrationService] registerUser initiated for email:', payload.email);

  try {
    // ── Step 1: Create Supabase Auth account with options.data ─────────────────────
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      options: {
        data: {
          full_name: payload.full_name.trim(),
          phone: payload.phone.trim(),
          usn_employee_id: payload.usn_employee_id?.trim() || null,
          department: payload.department.trim(),
          semester: payload.category === 'faculty' ? null : (payload.semester?.trim() || null),
          designation: payload.category === 'faculty' ? (payload.designation?.trim() || null) : null,
          category: payload.category,
        },
      },
    });

    if (authError) {
      console.error('[registrationService] signUp error:', authError.message);
      
      let friendlyError = authError.message || 'Registration failed. Please verify your details and try again.';
      const msg = authError.message.toLowerCase();
      
      if (msg.includes('rate limit')) {
        friendlyError = 'Registration rate limit reached. Please wait a few moments or contact support.';
      } else if (msg.includes('already exists') || msg.includes('unique_constraint') || msg.includes('duplicate') || msg.includes('already registered')) {
        friendlyError = 'An account with this email address or SRN is already registered. Try signing in instead.';
      } else if (msg.includes('invalid email') || msg.includes('email address is invalid')) {
        friendlyError = 'Please provide a valid institutional email address.';
      } else if (msg.includes('weak') || msg.includes('password')) {
        friendlyError = 'Password is too weak. Please use at least 6 characters.';
      }
      
      return { success: false, error: friendlyError };
    }

    // Supabase returns an existing user with empty identities if already registered without returning an error
    if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
      return {
        success: false,
        error: 'An account with this email is already registered. Please sign in or reset your password.',
      };
    }

    if (!authData.user) {
      return { success: false, error: 'Registration failed to create authentication account.' };
    }

    // ── Step 2: Immediate profile creation if auto-confirmed (Vite / Test Environment) ──
    if (authData.session) {
      try {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', authData.user.id)
          .maybeSingle();

        if (!existingUser) {
          console.log('[registrationService] Session active on signup, creating profile...');
          await insertPersonAndUserImmediate(authData.user, payload);
        }
      } catch (insertError: any) {
        console.warn('[registrationService] Client-side profile insert skipped (handled by DB trigger or RLS):', insertError.message);
      }
    }

    // ── Step 3: Sign out immediately ─────────────────────────────
    // To ensure the user does not session-lock in the browser until approved.
    try {
      await supabase.auth.signOut();
    } catch (_) {
      /* ignore */
    }

    return { success: true };
  } catch (err: any) {
    console.error('[registrationService] caught exception:', err);
    try { await supabase.auth.signOut(); } catch (_) { /* ignore */ }
    return {
      success: false,
      error: err?.message || 'Registration encountered an unexpected issue. Please try again or contact your Coordinator.',
    };
  }
}

import { supabase } from '@/services/supabase';

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
/**
 * Helper to immediately create the student profile in persons and users tables.
 * Used when email confirmation is disabled and signUp returns a session immediately.
 */
async function insertPersonAndUserImmediate(user: any, payload: RegisterPayload): Promise<void> {
  const { data: personData, error: personError } = await supabase
    .from('persons')
    .insert([
      {
        full_name: payload.full_name,
        category: 'student',
        email: payload.email,
        phone: payload.phone || null,
        usn_employee_id: payload.usn_employee_id,
        department: payload.department,
        semester: payload.semester || null,
        registration_status: 'pending',
      },
    ])
    .select('id')
    .single();

  if (personError || !personData) {
    throw new Error(personError?.message || 'Failed to create person record.');
  }

  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'volunteer')
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
    // Note: We explicitly hardcode the metadata category to 'student' to prevent client role escalation.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.full_name,
          phone: payload.phone,
          usn_employee_id: payload.usn_employee_id,
          department: payload.department,
          semester: payload.semester || null,
          category: 'student',
        },
      },
    });

    if (authError) {
      console.error('[registrationService] signUp error:', authError.message);
      
      let friendlyError = 'Registration failed. Please verify your details and try again.';
      const msg = authError.message.toLowerCase();
      
      if (msg.includes('rate limit')) {
        friendlyError = 'Registration rate limit exceeded. Please try again in an hour.';
      } else if (msg.includes('already exists') || msg.includes('unique_constraint') || msg.includes('duplicate')) {
        friendlyError = 'An account with this email or SRN/Employee ID is already registered.';
      } else if (msg.includes('profile') || msg.includes('trigger') || msg.includes('database') || msg.includes('role') || msg.includes('security policy')) {
        friendlyError = 'Registration failed during profile creation. Please contact your Faculty Coordinator.';
      }
      
      return { success: false, error: friendlyError };
    }

    if (!authData.user) {
      return { success: false, error: 'Registration failed to create auth account.' };
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
          console.log('[registrationService] Session active on signup, creating profile immediately...');
          await insertPersonAndUserImmediate(authData.user, payload);
        }
      } catch (insertError: any) {
        console.error('[registrationService] Immediate profile insertion error:', insertError.message);
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Registration failed during profile creation. Please contact your Faculty Coordinator.',
        };
      }
    }

    // ── Step 3: Sign out immediately ─────────────────────────────
    // To ensure the user does not session-lock in the browser until approved.
    await supabase.auth.signOut();

    return { success: true };
  } catch (err) {
    console.error('[registrationService] caught exception:', err);
    try { await supabase.auth.signOut(); } catch (_) { /* ignore */ }
    return {
      success: false,
      error: 'Registration failed. Please contact your Faculty Coordinator, or try again later.',
    };
  }
}



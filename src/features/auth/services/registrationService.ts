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

export async function registerUser(payload: RegisterPayload): Promise<{ success: boolean; error?: string }> {
  console.log('[registrationService] registerUser initiated for email:', payload.email);

  try {
    // 1. Create auth user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
    });

    if (authError) {
      console.error('[registrationService] signUp error:', authError.message);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Registration failed to create user account.' };
    }

    const authUserId = authData.user.id;

    // 2. Insert corresponding People Registry record with registration_status = 'pending'
    const { error: personError } = await supabase.from('persons').insert([
      {
        full_name: payload.full_name,
        category: payload.category as PersonCategory,
        email: payload.email,
        phone: payload.phone,
        usn_employee_id: payload.usn_employee_id,
        department: payload.department,
        semester: payload.semester || null,
        registration_status: 'pending',
        auth_user_id: authUserId,
      },
    ]);

    if (personError) {
      console.error('[registrationService] person insert error:', personError.message);
      return { success: false, error: personError.message };
    }

    // 3. Immediately sign out so newly registered unapproved user receives no access
    await supabase.auth.signOut();

    return { success: true };
  } catch (err) {
    console.error('[registrationService] caught exception:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Registration failed. Please try again.',
    };
  }
}

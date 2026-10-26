import { supabase } from '@/services/supabase';
import type { Person } from '@/types';
import type { PersonCategory } from '@/constants';
import { withOfflineCache } from '@/services/offlineCache';

export interface PersonPayload {
  full_name: string;
  category: PersonCategory;
  designation?: string | null;
  organization?: string | null;
  phone?: string | null;
  email?: string | null;
  usn_employee_id?: string | null;
  department?: string | null;
  semester?: string | null;
}

export interface PeopleFilters {
  search?: string;
  category?: PersonCategory | null;
  includePending?: boolean;
}

export async function fetchPeople(filters: PeopleFilters = {}): Promise<Person[]> {
  const all = await withOfflineCache('people:all', async () => {
    const { data, error } = await supabase
      .from('persons')
      .select('*')
      .order('full_name', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Person[];
  });

  // Filtering happens on the device so the saved list also works offline.
  const search = filters.search?.trim().toLowerCase();
  return all.filter(
    (p) =>
      // Only approved/active people in main registry unless pending are requested
      (filters.includePending || p.registration_status !== 'pending') &&
      (!filters.category || p.category === filters.category) &&
      (!search || p.full_name.toLowerCase().includes(search))
  );
}

export async function fetchPendingRegistrations(): Promise<Person[]> {
  return withOfflineCache('people:pending', async () => {
    const { data, error } = await supabase
      .from('persons')
      .select('*')
      .eq('registration_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as Person[];
  });
}

export async function approvePendingRegistration(
  personId: string,
  assignedCategory: PersonCategory
): Promise<Person> {
  // ── Step 1: Resolve the target role for this category ────────
  // 'faculty' category → 'faculty' system role
  // 'student' category → 'volunteer' system role
  const targetRoleName = assignedCategory === 'faculty' ? 'faculty' : 'volunteer';

  const { data: rolesData, error: roleErr } = await supabase
    .from('roles')
    .select('id')
    .eq('name', targetRoleName)
    .single();

  if (roleErr || !rolesData) {
    throw new Error(`Role "${targetRoleName}" not found in database.`);
  }

  // ── Step 2: Approve the person record ────────────────────────
  const { data: updatedPerson, error: updateErr } = await supabase
    .from('persons')
    .update({
      registration_status: 'approved',
      category: assignedCategory,
    })
    .eq('id', personId)
    .select()
    .single();

  if (updateErr || !updatedPerson) {
    throw new Error(updateErr?.message ?? 'Failed to approve person record.');
  }

  // ── Step 3: Activate the existing public.users row ───────────
  // The users row was created during self-registration with is_active=false.
  // We find it by person_id, then set is_active=true and assign the correct role.
  const { data: existingUser, error: userFetchErr } = await supabase
    .from('users')
    .select('id')
    .eq('person_id', personId)
    .maybeSingle();

  if (userFetchErr) {
    throw new Error(`Failed to look up user record: ${userFetchErr.message}`);
  }

  if (existingUser) {
    // Self-registered user — activate their account with the assigned role
    const { error: userUpdateErr } = await supabase
      .from('users')
      .update({
        role_id: rolesData.id,
        is_active: true,
      })
      .eq('id', existingUser.id);

    if (userUpdateErr) {
      throw new Error(`Approved person, but failed to activate user access: ${userUpdateErr.message}`);
    }
  }
  // If no users row exists, this was a manually-added person (not self-registered).
  // In that case, no users row needs activation — they remain a registry-only entry.

  return updatedPerson as Person;
}


export async function rejectPendingRegistration(personId: string): Promise<Person> {
  const { data, error } = await supabase
    .from('persons')
    .update({ registration_status: 'rejected' })
    .eq('id', personId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Person;
}

export async function fetchPerson(id: string): Promise<Person | null> {
  const { data, error } = await supabase
    .from('persons')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Person;
}

export async function createPerson(payload: PersonPayload): Promise<Person> {
  const { data, error } = await supabase
    .from('persons')
    .insert([
      {
        ...payload,
        registration_status: 'approved',
      },
    ])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Person;
}

export async function createGuestPerson(payload: {
  full_name: string;
  designation?: string | null;
  organization?: string | null;
  phone?: string | null;
  email?: string | null;
}): Promise<Person> {
  const { data, error } = await supabase
    .from('persons')
    .insert([
      {
        full_name: payload.full_name,
        category: 'external',
        designation: payload.designation || null,
        organization: payload.organization || null,
        phone: payload.phone || null,
        email: payload.email || null,
        registration_status: 'approved',
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Person;
}

export async function updatePerson(id: string, payload: Partial<PersonPayload>): Promise<Person> {
  const { data, error } = await supabase
    .from('persons')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Person;
}

export async function deletePerson(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('persons')
    .delete()
    .eq('id', id)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error(
      'Person could not be deleted. It may be referenced elsewhere, or you may not have permission to delete it.'
    );
  }
}

import { supabase } from '@/services/supabase';
import type { Person } from '@/types';
import type { PersonCategory } from '@/constants';

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
  let query = supabase
    .from('persons')
    .select('*')
    .order('full_name', { ascending: true });

  if (!filters.includePending) {
    // Only approved/active people in main registry
    query = query.neq('registration_status', 'pending');
  }

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  if (filters.search && filters.search.trim()) {
    query = query.ilike('full_name', `%${filters.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Person[];
}

export async function fetchPendingRegistrations(): Promise<Person[]> {
  const { data, error } = await supabase
    .from('persons')
    .select('*')
    .eq('registration_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Person[];
}

export async function approvePendingRegistration(
  personId: string,
  assignedCategory: PersonCategory
): Promise<Person> {
  // 1. Fetch person record to obtain auth_user_id if present
  const { data: person, error: fetchErr } = await supabase
    .from('persons')
    .select('*')
    .eq('id', personId)
    .single();

  if (fetchErr || !person) throw new Error('Person record not found');

  // 2. Mark person as approved with assigned category
  const { data: updatedPerson, error: updateErr } = await supabase
    .from('persons')
    .update({
      registration_status: 'approved',
      category: assignedCategory,
    })
    .eq('id', personId)
    .select()
    .single();

  if (updateErr) throw new Error(updateErr.message);

  // 3. Create public.users record if auth_user_id exists
  if (person.auth_user_id) {
    const targetRoleName = assignedCategory === 'faculty' ? 'faculty' : 'volunteer';

    const { data: rolesData, error: roleErr } = await supabase
      .from('roles')
      .select('id')
      .eq('name', targetRoleName)
      .single();

    if (roleErr || !rolesData) {
      throw new Error(`Role "${targetRoleName}" not found in database.`);
    }

    const { error: userInsertErr } = await supabase.from('users').upsert(
      [
        {
          auth_user_id: person.auth_user_id,
          role_id: rolesData.id,
          person_id: personId,
          is_active: true,
        },
      ],
      { onConflict: 'auth_user_id' }
    );

    if (userInsertErr) {
      console.error('[peopleService] user record creation error:', userInsertErr);
      throw new Error(`Approved person, but failed to create user access: ${userInsertErr.message}`);
    }
  }

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

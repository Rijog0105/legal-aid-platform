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
}

export interface PeopleFilters {
  search?: string;
  category?: PersonCategory | null;
}

export async function fetchPeople(filters: PeopleFilters = {}): Promise<Person[]> {
  let query = supabase
    .from('persons')
    .select('*')
    .order('full_name', { ascending: true });

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
    .insert([payload])
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
  const { error } = await supabase.from('persons').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

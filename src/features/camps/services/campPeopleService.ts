import { supabase } from '@/services/supabase';
import type { CampPersonWithDetails } from '@/types';
import type { CampRole } from '@/constants';

export async function fetchCampPeople(campId: string): Promise<CampPersonWithDetails[]> {
  const { data, error } = await supabase
    .from('camp_people')
    .select('*, person:persons(*)')
    .eq('camp_id', campId)
    .order('assigned_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CampPersonWithDetails[];
}

export async function assignPersonToCamp(
  campId: string,
  personId: string,
  campRole: CampRole
): Promise<CampPersonWithDetails> {
  const { data, error } = await supabase
    .from('camp_people')
    .insert([{ camp_id: campId, person_id: personId, camp_role: campRole }])
    .select('*, person:persons(*)')
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as CampPersonWithDetails;
}

export async function assignMultiplePeopleToCamp(
  campId: string,
  personIds: string[],
  campRole: CampRole
): Promise<void> {
  if (personIds.length === 0) return;
  const rows = personIds.map((pId) => ({
    camp_id: campId,
    person_id: pId,
    camp_role: campRole,
  }));

  const { error } = await supabase.from('camp_people').insert(rows);
  if (error) throw new Error(error.message);
}

export async function updateCampPersonRole(
  campPersonId: string,
  campRole: CampRole,
  personId?: string
): Promise<CampPersonWithDetails> {
  const { data, error } = await supabase
    .from('camp_people')
    .update({ camp_role: campRole })
    .eq('id', campPersonId)
    .select('*, person:persons(*)')
    .single();
  if (error) throw new Error(error.message);

  // Sync user table role for system access if personId is provided
  if (personId) {
    if (campRole === 'team_lead') {
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'team_lead')
        .single();
      if (roleData) {
        await supabase.from('users').update({ role_id: roleData.id }).eq('person_id', personId);
      }
    } else if (campRole === 'volunteer') {
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'volunteer')
        .single();
      if (roleData) {
        await supabase.from('users').update({ role_id: roleData.id }).eq('person_id', personId);
      }
    }
  }

  return data as unknown as CampPersonWithDetails;
}

export async function removePersonFromCamp(campPersonId: string): Promise<void> {
  const { error } = await supabase.from('camp_people').delete().eq('id', campPersonId);
  if (error) throw new Error(error.message);
}

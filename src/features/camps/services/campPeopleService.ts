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

export async function updateCampPersonRole(
  campPersonId: string,
  campRole: CampRole
): Promise<CampPersonWithDetails> {
  const { data, error } = await supabase
    .from('camp_people')
    .update({ camp_role: campRole })
    .eq('id', campPersonId)
    .select('*, person:persons(*)')
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as CampPersonWithDetails;
}

export async function removePersonFromCamp(campPersonId: string): Promise<void> {
  const { error } = await supabase.from('camp_people').delete().eq('id', campPersonId);
  if (error) throw new Error(error.message);
}

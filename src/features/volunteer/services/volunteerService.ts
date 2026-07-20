import { supabase } from '@/services/supabase';
import type { Camp, CampPersonWithDetails } from '@/types';

interface CampPersonWithCamp extends CampPersonWithDetails {
  camp: Camp;
}

export interface MyCampAssignment {
  campPerson: CampPersonWithDetails;
  camp: Camp;
}

/**
 * Finds the volunteer's current camp assignment for documentation purposes —
 * the assigned camp with status 'active' (most recently dated, if more than
 * one is somehow active at once). Returns null if the volunteer has no
 * active camp assignment right now.
 */
export async function fetchMyActiveCampAssignment(
  personId: string
): Promise<MyCampAssignment | null> {
  const { data, error } = await supabase
    .from('camp_people')
    .select('*, person:persons(*), camp:camps(*)')
    .eq('person_id', personId);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as CampPersonWithCamp[];
  const activeAssignments = rows
    .filter((row) => row.camp?.status === 'active')
    .sort((a, b) => (a.camp.camp_date < b.camp.camp_date ? 1 : -1));

  const match = activeAssignments[0];
  if (!match) return null;

  const { camp, ...campPerson } = match;
  return { campPerson, camp };
}

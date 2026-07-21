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
 * Finds all camp assignments for a user (volunteer or team lead).
 * Sorted by active status first, then camp_date descending.
 */
export async function fetchAllMyCampAssignments(
  personId: string
): Promise<MyCampAssignment[]> {
  const { data, error } = await supabase
    .from('camp_people')
    .select('*, person:persons(*), camp:camps(*)')
    .eq('person_id', personId);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as CampPersonWithCamp[];
  const validRows = rows.filter((row) => Boolean(row.camp));

  // Sort: active camps first, then by camp_date descending
  validRows.sort((a, b) => {
    if (a.camp.status === 'active' && b.camp.status !== 'active') return -1;
    if (a.camp.status !== 'active' && b.camp.status === 'active') return 1;
    return a.camp.camp_date < b.camp.camp_date ? 1 : -1;
  });

  return validRows.map((row) => {
    const { camp, ...campPerson } = row;
    return { campPerson, camp };
  });
}

/**
 * Finds a specific camp assignment for a user by campId, or defaults to their primary/active assignment.
 */
export async function fetchMyCampAssignment(
  personId: string,
  targetCampId?: string | null
): Promise<MyCampAssignment | null> {
  const assignments = await fetchAllMyCampAssignments(personId);
  if (assignments.length === 0) return null;

  if (targetCampId) {
    const found = assignments.find((item) => item.camp.id === targetCampId);
    if (found) return found;
  }

  // Default to the first assignment (active first, then newest)
  return assignments[0] ?? null;
}

/**
 * Backwards-compatible wrapper: Finds the user's active camp assignment.
 * If no active camp exists, falls back to their most recent assigned camp.
 */
export async function fetchMyActiveCampAssignment(
  personId: string
): Promise<MyCampAssignment | null> {
  return await fetchMyCampAssignment(personId);
}

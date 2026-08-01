import { supabase } from '@/services/supabase';
import type { Project, ProjectPersonWithDetails } from '@/types';

interface ProjectPersonWithProject extends ProjectPersonWithDetails {
  camp: Project;
}

export interface MyProjectAssignment {
  campPerson: ProjectPersonWithDetails;
  camp: Project;
}

/**
 * Finds all project assignments for a user (volunteer or team lead).
 * Sorted by active status first, then camp_date descending.
 */
export async function fetchAllMyProjectAssignments(
  personId: string
): Promise<MyProjectAssignment[]> {
  const { data, error } = await supabase
    .from('camp_people')
    .select('*, person:persons(*), camp:camps(*)')
    .eq('person_id', personId);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as ProjectPersonWithProject[];
  const validRows = rows.filter((row) => Boolean(row.camp));

  // Sort: active projects first, then by camp_date descending
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
 * Finds a specific project assignment for a user by projectId, or defaults to their primary/active assignment.
 */
export async function fetchMyProjectAssignment(
  personId: string,
  targetProjectId?: string | null
): Promise<MyProjectAssignment | null> {
  const assignments = await fetchAllMyProjectAssignments(personId);
  if (assignments.length === 0) return null;

  if (targetProjectId) {
    const found = assignments.find((item) => item.camp.id === targetProjectId);
    if (found) return found;
  }

  // Default to the first assignment (active first, then newest)
  return assignments[0] ?? null;
}

/**
 * Backwards-compatible wrapper: Finds the user's active project assignment.
 * If no active project exists, falls back to their most recent assigned project.
 */
export async function fetchMyActiveProjectAssignment(
  personId: string
): Promise<MyProjectAssignment | null> {
  return await fetchMyProjectAssignment(personId);
}

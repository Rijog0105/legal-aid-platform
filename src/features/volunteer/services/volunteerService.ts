import { supabase } from '@/services/supabase';
import type { Project, ProjectPersonWithDetails } from '@/types';
import { getProjectLifecycleState } from '@/utils/projectLifecycle';
import { ensureSurveyActivityExists } from '@/features/activities/services/activityService';

interface ProjectPersonWithProject extends ProjectPersonWithDetails {
  camp: Project;
}

export interface MyProjectAssignment {
  campPerson: ProjectPersonWithDetails;
  camp: Project;
}

/**
 * Finds all project assignments for a user (volunteer or team lead).
 * Sorted by operational lifecycle status first, then camp_date descending.
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

  const isAccessible = (camp: Project) => {
    const lc = getProjectLifecycleState(camp);
    return lc.state !== 'completed' && lc.state !== 'draft';
  };

  // Sort: active/upcoming projects first, then by camp_date descending
  validRows.sort((a, b) => {
    const actA = isAccessible(a.camp);
    const actB = isAccessible(b.camp);
    if (actA && !actB) return -1;
    if (!actA && actB) return 1;
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

  const projectAssignments = targetProjectId
    ? assignments.filter((item) => item.camp.id === targetProjectId)
    : assignments;

  if (projectAssignments.length === 0) return null;

  const now = new Date();
  const activePhaseAssignment = projectAssignments.find((item) => {
    const lc = getProjectLifecycleState(item.camp, now);
    const assignedPhase = (item.campPerson as any).phase;

    if (assignedPhase === null) return true; // Legacy matches any active phase
    if (lc.isSurveyActive && assignedPhase === 'survey') return true;
    if (lc.isCampActive && assignedPhase === 'camp') return true;
    if (lc.isBetweenPhases && assignedPhase === 'camp') return true;
    if (lc.state === 'survey_scheduled' && assignedPhase === 'survey') return true;
    if (lc.state === 'camp_scheduled' && assignedPhase === 'camp') return true;
    return false;
  });

  const result = activePhaseAssignment || projectAssignments[0] || null;

  if (result?.camp?.id) {
    try {
      await ensureSurveyActivityExists(result.camp.id);
    } catch (err) {
      console.error('[volunteerService] Failed to ensure Survey Activity:', err);
    }
  }

  return result;
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

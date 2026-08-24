import { supabase } from '@/services/supabase';
import type { ProjectPersonWithDetails } from '@/types';
import type { ProjectRole } from '@/constants';

export async function fetchProjectPeople(
  projectId: string,
  phase?: 'survey' | 'camp'
): Promise<ProjectPersonWithDetails[]> {
  let query = supabase
    .from('camp_people')
    .select('*, person:persons(*)');

  if (phase) {
    // Show phase-specific assignments AND legacy/neutral assignments whose phase is unknown (NULL)
    query = query.eq('camp_id', projectId).or(`phase.eq.${phase},phase.is.null`);
  } else {
    query = query.eq('camp_id', projectId);
  }

  const { data, error } = await query.order('assigned_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ProjectPersonWithDetails[];
}

export async function assignPersonToProject(
  projectId: string,
  personId: string,
  projectRole: ProjectRole,
  phase: 'survey' | 'camp'
): Promise<ProjectPersonWithDetails> {
  const { data, error } = await supabase
    .from('camp_people')
    .insert([{ camp_id: projectId, person_id: personId, camp_role: projectRole, phase }])
    .select('*, person:persons(*)')
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as ProjectPersonWithDetails;
}

export async function assignMultiplePeopleToProject(
  projectId: string,
  personIds: string[],
  projectRole: ProjectRole,
  phase: 'survey' | 'camp'
): Promise<void> {
  if (personIds.length === 0) return;
  const rows = personIds.map((pId) => ({
    camp_id: projectId,
    person_id: pId,
    camp_role: projectRole,
    phase,
  }));

  const { error } = await supabase.from('camp_people').insert(rows);
  if (error) throw new Error(error.message);
}

export async function updateProjectPersonRole(
  projectPersonId: string,
  projectRole: ProjectRole,
  _personId?: string
): Promise<ProjectPersonWithDetails> {
  const { data, error } = await supabase
    .from('camp_people')
    .update({ camp_role: projectRole })
    .eq('id', projectPersonId)
    .select('*, person:persons(*)')
    .single();
  if (error) throw new Error(error.message);

  return data as unknown as ProjectPersonWithDetails;
}

export async function removePersonFromProject(projectPersonId: string): Promise<void> {
  const { error } = await supabase.from('camp_people').delete().eq('id', projectPersonId);
  if (error) throw new Error(error.message);
}

export async function resolveLegacyAssignment(
  projectPersonId: string,
  phase: 'survey' | 'camp'
): Promise<ProjectPersonWithDetails> {
  const { data, error } = await supabase
    .from('camp_people')
    .update({ phase })
    .eq('id', projectPersonId)
    .select('*, person:persons(*)')
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as ProjectPersonWithDetails;
}

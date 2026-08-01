import { supabase } from '@/services/supabase';
import type { ProjectPersonWithDetails } from '@/types';
import type { ProjectRole } from '@/constants';

export async function fetchProjectPeople(projectId: string): Promise<ProjectPersonWithDetails[]> {
  const { data, error } = await supabase
    .from('camp_people')
    .select('*, person:persons(*)')
    .eq('camp_id', projectId)
    .order('assigned_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ProjectPersonWithDetails[];
}

export async function assignPersonToProject(
  projectId: string,
  personId: string,
  projectRole: ProjectRole
): Promise<ProjectPersonWithDetails> {
  const { data, error } = await supabase
    .from('camp_people')
    .insert([{ camp_id: projectId, person_id: personId, camp_role: projectRole }])
    .select('*, person:persons(*)')
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as ProjectPersonWithDetails;
}

export async function assignMultiplePeopleToProject(
  projectId: string,
  personIds: string[],
  projectRole: ProjectRole
): Promise<void> {
  if (personIds.length === 0) return;
  const rows = personIds.map((pId) => ({
    camp_id: projectId,
    person_id: pId,
    camp_role: projectRole,
  }));

  const { error } = await supabase.from('camp_people').insert(rows);
  if (error) throw new Error(error.message);
}

export async function updateProjectPersonRole(
  projectPersonId: string,
  projectRole: ProjectRole,
  personId?: string
): Promise<ProjectPersonWithDetails> {
  const { data, error } = await supabase
    .from('camp_people')
    .update({ camp_role: projectRole })
    .eq('id', projectPersonId)
    .select('*, person:persons(*)')
    .single();
  if (error) throw new Error(error.message);

  // Sync user table role for system access if personId is provided
  if (personId) {
    if (projectRole === 'team_lead') {
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'team_lead')
        .single();
      if (roleData) {
        await supabase.from('users').update({ role_id: roleData.id }).eq('person_id', personId);
      }
    } else if (projectRole === 'volunteer') {
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

  return data as unknown as ProjectPersonWithDetails;
}

export async function removePersonFromProject(projectPersonId: string): Promise<void> {
  const { error } = await supabase.from('camp_people').delete().eq('id', projectPersonId);
  if (error) throw new Error(error.message);
}

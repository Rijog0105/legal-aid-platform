import { supabase } from '@/services/supabase';
import type { Project, ReportSettings } from '@/types';
import type { ProjectStatus } from '@/constants';
import { ensureSurveyActivityExists } from '@/features/activities/services/activityService';
import { withOfflineCache } from '@/services/offlineCache';

export interface ProjectPayload {
  camp_name: string;
  description?: string | null;
  camp_date: string;
  start_time?: string | null;
  end_time?: string | null;
  village_name: string;
  taluk: string;
  district: string;
  report_settings: ReportSettings;
  created_by: string;
}

export interface ProjectFilters {
  search?: string;
  status?: ProjectStatus | null;
}

export async function fetchProjects(filters: ProjectFilters = {}): Promise<Project[]> {
  const all = await withOfflineCache('projects:all', async () => {
    const { data, error } = await supabase
      .from('camps')
      .select('*')
      .order('camp_date', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Project[];
  });

  // Filtering happens on the device so the saved list also works offline.
  const search = filters.search?.trim().toLowerCase();
  return all.filter(
    (p) =>
      (!filters.status || p.status === filters.status) &&
      (!search || p.camp_name.toLowerCase().includes(search))
  );
}

export async function fetchProject(id: string): Promise<Project | null> {
  try {
    return await withOfflineCache(`project:${id}`, async () => {
      const { data, error } = await supabase
        .from('camps')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data as Project;
    });
  } catch {
    return null;
  }
}

export async function createProject(payload: ProjectPayload): Promise<Project> {
  const { data, error } = await supabase
    .from('camps')
    .insert([{ ...payload, status: 'draft' }])
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Ensure compulsory Survey Activity exists for the new project
  try {
    await ensureSurveyActivityExists(data.id);
  } catch (err) {
    console.error('[projectService] Failed to auto-create Survey Activity on project creation:', err);
  }

  return data as Project;
}

export async function updateProject(
  id: string,
  payload: Partial<Omit<ProjectPayload, 'created_by'>>
): Promise<Project> {
  const { data, error } = await supabase
    .from('camps')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Project;
}

export async function updateProjectStatus(id: string, status: ProjectStatus): Promise<Project> {
  const { data, error } = await supabase
    .from('camps')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Project;
}

export async function deleteProject(id: string): Promise<void> {
  // Step 1 — Issue the DELETE statement.
  // NOTE: Supabase / PostgREST returns { error: null } with 0 rows affected
  // when RLS silently blocks a DELETE. We cannot rely solely on `error` here.
  const { error } = await supabase.from('camps').delete().eq('id', id);
  if (error) throw new Error(error.message);

  // Step 2 — Defensive verification: confirm the row no longer exists.
  // If RLS blocked the delete without an error, the row will still be present.
  const { data: surviving } = await supabase
    .from('camps')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (surviving) {
    throw new Error(
      'Project could not be deleted. You may not have permission to delete this project, or it may be referenced by another record. Please contact an administrator.'
    );
  }
}


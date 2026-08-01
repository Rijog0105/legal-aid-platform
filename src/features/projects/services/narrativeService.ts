import { supabase } from '@/services/supabase';
import type { NarrativeSection } from '@/types';
import type { NarrativeSectionType } from '@/constants';

/**
 * Fetch all narrative sections for a given project.
 */
export async function fetchNarrativeSections(projectId: string): Promise<NarrativeSection[]> {
  const { data, error } = await supabase
    .from('narrative_sections')
    .select('*')
    .eq('camp_id', projectId);

  if (error) throw new Error(error.message);
  return (data as NarrativeSection[]) || [];
}

/**
 * Upsert a narrative section for a project.
 */
export async function upsertNarrativeSection(
  projectId: string,
  sectionType: NarrativeSectionType,
  content: string,
  updatedBy: string
): Promise<NarrativeSection> {
  const { data, error } = await supabase
    .from('narrative_sections')
    .upsert(
      {
        camp_id: projectId,
        section_type: sectionType,
        content,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'camp_id,section_type' }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as NarrativeSection;
}

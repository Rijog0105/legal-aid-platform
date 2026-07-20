import { supabase } from '@/services/supabase';
import type { NarrativeSection } from '@/types';
import type { NarrativeSectionType } from '@/constants';

/**
 * Fetch all narrative sections for a given camp.
 */
export async function fetchNarrativeSections(campId: string): Promise<NarrativeSection[]> {
  const { data, error } = await supabase
    .from('narrative_sections')
    .select('*')
    .eq('camp_id', campId);

  if (error) throw new Error(error.message);
  return (data as NarrativeSection[]) || [];
}

/**
 * Upsert a narrative section for a camp.
 */
export async function upsertNarrativeSection(
  campId: string,
  sectionType: NarrativeSectionType,
  content: string,
  updatedBy: string
): Promise<NarrativeSection> {
  const { data, error } = await supabase
    .from('narrative_sections')
    .upsert(
      {
        camp_id: campId,
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

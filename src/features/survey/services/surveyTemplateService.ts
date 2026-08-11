import { supabase } from '@/services/supabase';
import type { SurveyTemplate } from '@/types/database.types';

export const surveyTemplateService = {
  /**
   * Create a new survey template.
   */
  async createTemplate(payload: {
    title: string;
    description?: string | null;
    version?: number;
    created_by: string;
  }): Promise<SurveyTemplate> {
    const { data, error } = await supabase
      .from('survey_templates')
      .insert([
        {
          title: payload.title,
          description: payload.description || null,
          version: payload.version ?? 1,
          is_active: false, // draft by default
          created_by: payload.created_by,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as SurveyTemplate;
  },

  /**
   * Publish a template (sets it active and deactivates others of the same title).
   */
  async publishTemplate(templateId: string): Promise<SurveyTemplate> {
    // 1. Fetch target template
    const { data: target, error: fetchErr } = await supabase
      .from('survey_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (fetchErr || !target) throw new Error(fetchErr?.message || 'Template not found');

    // 2. Deactivate other active templates with the same title
    await supabase
      .from('survey_templates')
      .update({ is_active: false })
      .eq('title', target.title)
      .eq('is_active', true);

    // 3. Activate target template
    const { data, error } = await supabase
      .from('survey_templates')
      .update({ is_active: true })
      .eq('id', templateId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as SurveyTemplate;
  },

  /**
   * Fetch the currently active template.
   */
  async fetchActiveTemplate(): Promise<SurveyTemplate | null> {
    const { data, error } = await supabase
      .from('survey_templates')
      .select('*')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as SurveyTemplate | null;
  },

  /**
   * Fetch all survey templates.
   */
  async fetchTemplates(): Promise<SurveyTemplate[]> {
    const { data, error } = await supabase
      .from('survey_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as SurveyTemplate[];
  },
};

import { supabase } from '@/services/supabase';
import type { SurveySection, SurveyQuestion } from '@/types/database.types';

export const surveyQuestionService = {
  /**
   * Fetch all sections for a template, ordered by display_order.
   */
  async fetchSections(templateId: string): Promise<SurveySection[]> {
    const { data, error } = await supabase
      .from('survey_sections')
      .select('*')
      .eq('template_id', templateId)
      .order('display_order', { ascending: true });

    if (error) throw new Error(error.message);
    return data as SurveySection[];
  },

  /**
   * Fetch all questions for a template, ordered by display_order.
   * Joins via sections.
   */
  async fetchQuestions(templateId: string): Promise<SurveyQuestion[]> {
    // 1. Fetch section IDs (already ordered by display_order ASC)
    const sections = await this.fetchSections(templateId);
    if (sections.length === 0) return [];
    const sectionIds = sections.map((s) => s.id);

    // 2. Fetch questions
    const { data, error } = await supabase
      .from('survey_questions')
      .select('*')
      .in('section_id', sectionIds)
      .order('display_order', { ascending: true });

    if (error) throw new Error(error.message);

    // 3. Sort in-memory: first by the parent section's display order, then by display_order
    const sectionOrderMap = new Map(sections.map((s, idx) => [s.id, idx]));
    const sortedQuestions = (data as SurveyQuestion[]).sort((a, b) => {
      const orderA = sectionOrderMap.get(a.section_id) ?? 999;
      const orderB = sectionOrderMap.get(b.section_id) ?? 999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.display_order - b.display_order;
    });

    return sortedQuestions;
  },

  /**
   * Create a new section.
   */
  async createSection(payload: {
    template_id: string;
    title: string;
    description?: string | null;
    display_order?: number;
  }): Promise<SurveySection> {
    const { data, error } = await supabase
      .from('survey_sections')
      .insert([
        {
          template_id: payload.template_id,
          title: payload.title,
          description: payload.description || null,
          display_order: payload.display_order ?? 0,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as SurveySection;
  },

  /**
   * Create a new question.
   */
  async createQuestion(payload: {
    section_id: string;
    question_text: string;
    question_code: string;
    question_type: SurveyQuestion['question_type'];
    is_required?: boolean;
    validation_rules?: any;
    question_options?: any;
    conditional_logic?: any;
    display_order?: number;
  }): Promise<SurveyQuestion> {
    const { data, error } = await supabase
      .from('survey_questions')
      .insert([
        {
          section_id: payload.section_id,
          question_text: payload.question_text,
          question_code: payload.question_code,
          question_type: payload.question_type,
          is_required: payload.is_required ?? false,
          validation_rules: payload.validation_rules ?? {},
          question_options: payload.question_options ?? [],
          conditional_logic: payload.conditional_logic ?? {},
          display_order: payload.display_order ?? 0,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as SurveyQuestion;
  },
};

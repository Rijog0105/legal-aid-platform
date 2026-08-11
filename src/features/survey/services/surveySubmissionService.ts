import { supabase } from '@/services/supabase';
import type { Survey, SurveyAnswer } from '@/types/database.types';

export interface SubmitSurveyPayload {
  camp_id: string;
  template_id: string;
  survey_reference_id: string;
  submitted_by: string;
  gps_latitude?: number | null;
  gps_longitude?: number | null;
  gps_accuracy?: number | null;
  proof_photo_url?: string | null;
  device_telemetry?: any;
  sync_status?: 'synced' | 'pending' | 'failed';
  answers: Array<{
    question_id: string;
    answer_value?: string | null;
    answer_payload?: any;
  }>;
}

export const surveySubmissionService = {
  /**
   * Submit a full survey response (header + answer rows) inside a database transaction sequence.
   */
  async submitSurvey(payload: SubmitSurveyPayload): Promise<{ success: boolean; surveyId?: string; error?: string }> {
    try {
      console.log("Survey submit payload", payload);
      const headerPayload = [
        {
          camp_id: payload.camp_id,
          template_id: payload.template_id,
          survey_reference_id: payload.survey_reference_id,
          submitted_by: payload.submitted_by,
          gps_latitude: payload.gps_latitude || null,
          gps_longitude: payload.gps_longitude || null,
          gps_accuracy: payload.gps_accuracy || null,
          proof_photo_url: payload.proof_photo_url || null,
          device_telemetry: payload.device_telemetry || {},
          sync_status: payload.sync_status || 'synced',
        },
      ];
      console.log('PAYLOAD', headerPayload);
      const { data: survey, error: surveyErr } = await supabase
        .from('surveys')
        .insert(headerPayload)
        .select()
        .single();
      console.log('DATA', survey);
      if (surveyErr) {
        console.error('ERROR', surveyErr);
      }

      if (surveyErr || !survey) {
        throw new Error(surveyErr?.message || 'Failed to create survey submission header');
      }

      const surveyId = (survey as Survey).id;

      // 2. Prepare and batch insert answers
      if (payload.answers.length > 0) {
        const answerRows = payload.answers.map((ans) => ({
          survey_id: surveyId,
          question_id: ans.question_id,
          answer_value: ans.answer_value || null,
          answer_payload: ans.answer_payload || {},
        }));

        console.log('PAYLOAD', answerRows);
        const { data: answersData, error: answersErr } = await supabase
          .from('survey_answers')
          .insert(answerRows)
          .select();
        console.log('DATA', answersData);
        if (answersErr) {
          console.error('ERROR', answersErr);
        }

        if (answersErr) {
          // If answers fail, delete the header to clean up (manual rollback cascade fallback)
          await supabase.from('surveys').delete().eq('id', surveyId);
          throw new Error(answersErr.message);
        }
      }

      const result = { success: true, surveyId };
      console.log("Survey insert success", result);
      return result;
    } catch (err: any) {
      console.error("Survey insert failure", err);
      console.error('[surveySubmissionService] Submission error:', err);
      return { success: false, error: err.message || 'Failed to submit survey responses' };
    }
  },

  /**
   * Fetch submitted surveys for a project camp.
   */
  async fetchSurveyResponses(campId: string): Promise<Survey[]> {
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('camp_id', campId)
      .order('submitted_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as Survey[];
  },

  /**
   * Fetch answers for a given survey submission.
   */
  async fetchAnswersForSurvey(surveyId: string): Promise<SurveyAnswer[]> {
    const { data, error } = await supabase
      .from('survey_answers')
      .select('*')
      .eq('survey_id', surveyId);

    if (error) throw new Error(error.message);
    return data as SurveyAnswer[];
  },
};

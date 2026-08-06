import { supabase } from '@/services/supabase';
import type { SurveyResponseData } from '@/types/survey';

const LOCAL_STORAGE_SURVEYS_KEY = 'legal_aid_submitted_surveys_v2';
const DRAFT_SURVEY_KEY = 'legal_aid_survey_draft_v2';

export const surveyService = {
  // Save current active draft locally with safe quota handling
  saveDraft(draft: { answers: Partial<SurveyResponseData>; currentIndex: number; campId?: string }): void {
    try {
      localStorage.setItem(DRAFT_SURVEY_KEY, JSON.stringify({
        ...draft,
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('LocalStorage draft quota warning, attempting compact save', e);
      try {
        // Strip heavy image string from draft if quota exceeded
        const compactAnswers = { ...draft.answers };
        if (compactAnswers.proofPhotoUrl && compactAnswers.proofPhotoUrl.length > 50000) {
          compactAnswers.proofPhotoUrl = '';
        }
        localStorage.setItem(DRAFT_SURVEY_KEY, JSON.stringify({
          ...draft,
          answers: compactAnswers,
          updatedAt: new Date().toISOString(),
        }));
      } catch (err) {
        console.error('Failed to save draft to localStorage', err);
      }
    }
  },

  // Get active draft if any
  getDraft(): { answers: Partial<SurveyResponseData>; currentIndex: number; campId?: string; updatedAt: string } | null {
    try {
      const data = localStorage.getItem(DRAFT_SURVEY_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to read draft from localStorage', e);
    }
    return null;
  },

  // Clear active draft
  clearDraft(): void {
    try {
      localStorage.removeItem(DRAFT_SURVEY_KEY);
    } catch (e) {
      console.error('Failed to clear draft', e);
    }
  },

  // Helper to safely store in localStorage without quota error
  safeSaveLocalSurveys(newResponse: SurveyResponseData): void {
    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_SURVEYS_KEY);
      let existing: SurveyResponseData[] = existingStr ? JSON.parse(existingStr) : [];
      // Prevent duplicates
      existing = existing.filter((s) => s.surveyReferenceId !== newResponse.surveyReferenceId);
      existing.unshift(newResponse);

      // Keep up to 25 recent items in local cache
      const capped = existing.slice(0, 25);
      localStorage.setItem(LOCAL_STORAGE_SURVEYS_KEY, JSON.stringify(capped));
    } catch (quotaErr) {
      console.warn('LocalStorage quota reached, reducing cached array length', quotaErr);
      try {
        const existingStr = localStorage.getItem(LOCAL_STORAGE_SURVEYS_KEY);
        let existing: SurveyResponseData[] = existingStr ? JSON.parse(existingStr) : [];
        existing = existing.filter((s) => s.surveyReferenceId !== newResponse.surveyReferenceId);
        // Keep top 10 items with complete proofPhotoUrl intact
        const trimmed = [newResponse, ...existing.slice(0, 8)];
        localStorage.setItem(LOCAL_STORAGE_SURVEYS_KEY, JSON.stringify(trimmed));
      } catch (err) {
        console.error('Storage quota reached, skipping local cache write', err);
      }
    }
  },

  // Submit survey response
  async submitSurvey(response: SurveyResponseData): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Try persisting to Supabase
      const { error } = await supabase
        .from('surveys')
        .insert([
          {
            survey_reference_id: response.surveyReferenceId,
            camp_id: response.campId || null,
            submitted_by: response.submittedBy,
            submitted_at: response.submittedAt,
            respondent_name: response.nameOfDataCollector,
            village_name: response.villageDistrict,
            response_payload: response,
          },
        ]);

      if (error) {
        console.warn('Supabase insert failed, falling back to local persistent store', error);
      }

      // 2. Safely maintain local persistent store
      this.safeSaveLocalSurveys(response);

      // Clear draft on submission
      this.clearDraft();

      return { success: true };
    } catch (err: any) {
      console.error('Error submitting survey', err);
      try {
        this.safeSaveLocalSurveys(response);
        this.clearDraft();
        return { success: true };
      } catch (localErr: any) {
        return { success: false, error: localErr.message || 'Failed to save survey response' };
      }
    }
  },

  // Fetch all submitted surveys (from Supabase + local merge)
  async fetchAllSurveys(campId?: string): Promise<SurveyResponseData[]> {
    let remoteSurveys: SurveyResponseData[] = [];
    try {
      let query = supabase.from('surveys').select('*').order('submitted_at', { ascending: false });
      if (campId) {
        query = query.eq('camp_id', campId);
      }
      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        remoteSurveys = data.map((item: any) => {
          if (item.response_payload) {
            return item.response_payload as SurveyResponseData;
          }
          return {
            surveyReferenceId: item.survey_reference_id || item.id,
            campId: item.camp_id,
            submittedBy: item.submitted_by,
            submittedAt: item.submitted_at,
            nameOfDataCollector: item.respondent_name || 'Anonymous',
            villageDistrict: item.village_name || 'Village',
          } as unknown as SurveyResponseData;
        });
      }
    } catch (e) {
      console.warn('Could not fetch from Supabase, loading from local store', e);
    }

    let localSurveys: SurveyResponseData[] = [];
    try {
      const dataStr = localStorage.getItem(LOCAL_STORAGE_SURVEYS_KEY);
      if (dataStr) {
        localSurveys = JSON.parse(dataStr);
      }
    } catch (e) {
      console.error('Error loading local surveys', e);
    }

    const map = new Map<string, SurveyResponseData>();
    [...remoteSurveys, ...localSurveys].forEach((item) => {
      if (item && item.surveyReferenceId) {
        if (!map.has(item.surveyReferenceId)) {
          map.set(item.surveyReferenceId, item);
        }
      }
    });

    return Array.from(map.values());
  },

  // Fetch single survey by reference ID
  async fetchSurveyById(referenceId: string): Promise<SurveyResponseData | null> {
    const all = await this.fetchAllSurveys();
    return all.find((s) => s.surveyReferenceId === referenceId) || null;
  },
};

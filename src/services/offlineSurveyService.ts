import { offlineDb } from '../db/offlineDb';

export const offlineSurveyService = {
  /**
   * Caches the active template, sections, and questions to IndexedDB.
   * Clears old cache to ensure consistency.
   */
  async cacheSurveyData(template: any, sections: any[], questions: any[]): Promise<void> {
    try {
      await offlineDb.transaction('rw', [
        offlineDb.offlineSurveyTemplates,
        offlineDb.offlineSurveySections,
        offlineDb.offlineSurveyQuestions
      ], async () => {
        // Clear existing cached templates, sections, and questions
        await offlineDb.offlineSurveyTemplates.clear();
        await offlineDb.offlineSurveySections.clear();
        await offlineDb.offlineSurveyQuestions.clear();

        // Insert new template
        await offlineDb.offlineSurveyTemplates.add({
          id: template.id,
          title: template.title,
          description: template.description || null,
          version: template.version,
          is_active: template.is_active,
          cached_at: new Date().toISOString()
        });

        // Insert sections
        const sectionRows = sections.map(s => ({
          id: s.id,
          template_id: s.template_id,
          title: s.title,
          description: s.description || null,
          display_order: s.display_order
        }));
        await offlineDb.offlineSurveySections.bulkAdd(sectionRows);

        // Insert questions
        const questionRows = questions.map(q => ({
          id: q.id,
          section_id: q.section_id,
          template_id: template.id,
          question_text: q.question_text,
          question_code: q.question_code,
          question_type: q.question_type,
          is_required: q.is_required,
          validation_rules: q.validation_rules || {},
          question_options: q.question_options || [],
          conditional_logic: q.conditional_logic || {},
          display_order: q.display_order
        }));
        await offlineDb.offlineSurveyQuestions.bulkAdd(questionRows);
      });
      console.info('[offlineSurveyService] Successfully cached survey template and questions.');
    } catch (error) {
      console.error('[offlineSurveyService] Error caching survey data:', error);
    }
  },

  /**
   * Retrieves cached survey template and questions, sorted exactly like the online service.
   */
  async getCachedSurveyData(): Promise<{ template: any; sections: any[]; questions: any[] } | null> {
    try {
      // Fetch the active cached template
      const template = await offlineDb.offlineSurveyTemplates.orderBy('cached_at').reverse().first();
      if (!template) {
        console.info('[offlineSurveyService] No cached survey template found.');
        return null;
      }

      const sections = await offlineDb.offlineSurveySections.where('template_id').equals(template.id).toArray();
      const questions = await offlineDb.offlineSurveyQuestions.where('template_id').equals(template.id).toArray();

      // Sort sections by display_order ASC
      sections.sort((a, b) => a.display_order - b.display_order);

      // Sort questions: first by their parent section's display order, then by question display_order
      const sectionOrderMap = new Map(sections.map((s, idx) => [s.id, idx]));
      questions.sort((a, b) => {
        const orderA = sectionOrderMap.get(a.section_id) ?? 999;
        const orderB = sectionOrderMap.get(b.section_id) ?? 999;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.display_order - b.display_order;
      });

      return { template, sections, questions };
    } catch (error) {
      console.error('[offlineSurveyService] Error retrieving cached survey data:', error);
      return null;
    }
  },

  /**
   * Saves a survey draft to IndexedDB.
   */
  async saveDraft(
    draftKey: string,
    userId: string,
    campId: string,
    templateId: string,
    answers: any,
    currentIndex: number
  ): Promise<void> {
    try {
      await offlineDb.offlineSurveyDrafts.put({
        draftKey,
        userId,
        campId,
        templateId,
        answers,
        currentIndex,
        updatedAt: new Date().toISOString()
      });
      console.info('[offlineSurveyService] Draft saved successfully to IndexedDB.');
    } catch (error) {
      console.error('[offlineSurveyService] Error saving draft to IndexedDB:', error);
    }
  },

  /**
   * Reads a survey draft from IndexedDB.
   */
  async getDraft(draftKey: string): Promise<any | null> {
    try {
      const record = await offlineDb.offlineSurveyDrafts.get(draftKey);
      if (!record) return null;
      return {
        answers: record.answers,
        currentIndex: record.currentIndex,
        campId: record.campId,
        updatedAt: record.updatedAt
      };
    } catch (error) {
      console.error('[offlineSurveyService] Error reading draft from IndexedDB:', error);
      return null;
    }
  },

  /**
   * Removes a survey draft from IndexedDB.
   */
  async clearDraft(draftKey: string): Promise<void> {
    try {
      await offlineDb.offlineSurveyDrafts.delete(draftKey);
      console.info('[offlineSurveyService] Draft cleared from IndexedDB.');
    } catch (error) {
      console.error('[offlineSurveyService] Error clearing draft from IndexedDB:', error);
    }
  },

  /**
   * Checks if a survey with the given surveyReferenceId is already in the pending queue.
   */
  async hasPendingSubmission(surveyReferenceId: string): Promise<boolean> {
    try {
      const match = await offlineDb.pendingSurveySubmissions
        .where('surveyReferenceId')
        .equals(surveyReferenceId)
        .first();
      return !!match;
    } catch (error) {
      console.error('[offlineSurveyService] Error checking pending submissions:', error);
      return false;
    }
  },

  /**
   * Adds a new survey submission to the offline pending queue.
   */
  async queueSubmission(submission: {
    surveyReferenceId: string;
    userId: string;
    campId: string;
    templateId: string;
    payload: any;
  }): Promise<void> {
    try {
      await offlineDb.pendingSurveySubmissions.add({
        surveyReferenceId: submission.surveyReferenceId,
        userId: submission.userId,
        campId: submission.campId,
        templateId: submission.templateId,
        payload: submission.payload,
        sync_status: 'pending',
        created_at: new Date().toISOString(),
        last_attempt_at: null,
        error_message: null,
        attempt_count: 0
      });
      console.info('[offlineSurveyService] Survey successfully queued in pendingSurveySubmissions.');
    } catch (error) {
      console.error('[offlineSurveyService] Failed to queue submission in IndexedDB:', error);
      throw error; // Rethrow to let caller handle failure
    }
  }
};

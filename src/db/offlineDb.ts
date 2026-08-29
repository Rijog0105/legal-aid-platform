import Dexie, { type Table } from 'dexie';

// Cached from Supabase while online
export interface OfflineSurveyTemplate {
  id: string;                  // PK = template UUID
  title: string;
  description: string | null;
  version: number;
  is_active: boolean;
  cached_at: string;           // ISO timestamp of last cache
}

export interface OfflineSurveySection {
  id: string;                  // PK = section UUID
  template_id: string;
  title: string;
  description: string | null;
  display_order: number;
}

export interface OfflineSurveyQuestion {
  id: string;                  // PK = question UUID
  section_id: string;
  template_id: string;         // denormalized for efficient lookup
  question_text: string;
  question_code: string;
  question_type: string;
  is_required: boolean;
  validation_rules: any;
  question_options: any;
  conditional_logic: any;
  display_order: number;
}

// Active survey answer drafts (IndexedDB is authoritative; localStorage is fast UI layer)
export interface OfflineSurveyDraft {
  draftKey: string;            // PK = 'legal_aid_draft_{userId}_{campId}_{templateId}'
  userId: string;
  campId: string;
  templateId: string;
  answers: Record<string, any>;
  currentIndex: number;
  updatedAt: string;
}

// Completed surveys waiting for internet
export interface PendingSurveySubmission {
  localId?: number;            // Auto-incremented PK
  surveyReferenceId: string;   // Idempotency key = surveys.survey_reference_id (UNIQUE in DB)
  userId: string;
  campId: string;
  templateId: string;
  payload: any;                // Full SubmitSurveyPayload including proof photo base64
  sync_status: 'pending' | 'synced' | 'failed';
  created_at: string;
  last_attempt_at: string | null;
  error_message: string | null;
  attempt_count: number;
}

// Cached user profile for offline startup
export interface OfflineCachedUserProfile {
  userId: string;              // PK = auth user UUID
  personId: string;
  roleName: string;
  displayName: string;
  campAssignment: any | null;  // Minimal project/camp context
  cached_at: string;
}

export class LegalAidOfflineDB extends Dexie {
  offlineSurveyTemplates!: Table<OfflineSurveyTemplate, string>;
  offlineSurveySections!: Table<OfflineSurveySection, string>;
  offlineSurveyQuestions!: Table<OfflineSurveyQuestion, string>;
  offlineSurveyDrafts!: Table<OfflineSurveyDraft, string>;
  pendingSurveySubmissions!: Table<PendingSurveySubmission, number>;
  offlineCachedUserProfiles!: Table<OfflineCachedUserProfile, string>;

  constructor() {
    super('LegalAidOfflineDB');
    this.version(1).stores({
      offlineSurveyTemplates: 'id, is_active, cached_at',
      offlineSurveySections: 'id, template_id',
      offlineSurveyQuestions: 'id, section_id, template_id',
      offlineSurveyDrafts: 'draftKey, userId, campId, templateId, updatedAt',
      pendingSurveySubmissions: '++localId, surveyReferenceId, userId, campId, sync_status, created_at',
      offlineCachedUserProfiles: 'userId, cached_at',
    });
  }
}

export const offlineDb = new LegalAidOfflineDB();

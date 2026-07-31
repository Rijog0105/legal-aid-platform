/* ─── Database Types ───────────────────────────────────────── *
 * Single source of truth for all database entity types.
 * These mirror the Supabase/PostgreSQL schema exactly.
 * Feature-level types should extend/pick from these.
 * ──────────────────────────────────────────────────────────── */

import type { CampStatus, ActivityStatus, ReportStatus, CampRole, PersonCategory, NarrativeSectionType, RoleName, RegistrationStatus } from '@/constants';

/* ─── 1. roles ────────────────────────────────────────────── */

export interface Role {
  id: string;
  name: RoleName;
  created_at: string;
}

/* ─── 2. users ────────────────────────────────────────────── */

export interface User {
  id: string;
  auth_user_id: string;
  role_id: string;
  person_id: string;
  is_active: boolean;
  created_at: string;
}

export interface UserWithDetails extends User {
  role: Role;
  person: Person;
}

/* ─── 3. persons ──────────────────────────────────────────── */

export interface Person {
  id: string;
  full_name: string;
  category: PersonCategory;
  designation: string | null;
  organization: string | null;
  phone: string | null;
  email: string | null;
  usn_employee_id?: string | null;
  department?: string | null;
  semester?: string | null;
  registration_status?: RegistrationStatus | null;
  created_at: string;
}

/* ─── 4. camps ────────────────────────────────────────────── */

export interface ReportSettings {
  include_budget: boolean;
  include_survey_stats: boolean;
  max_photos_per_activity: number;
}

export interface Camp {
  id: string;
  camp_name: string;
  description: string | null;
  camp_date: string;
  start_time: string | null;
  end_time: string | null;
  village_name: string;
  taluk: string;
  district: string;
  status: CampStatus;
  allocated_budget?: number | null;
  report_settings: ReportSettings;
  created_by: string;
  created_at: string;
}

/* ─── 5. camp_people ──────────────────────────────────────── */

export interface CampPerson {
  id: string;
  camp_id: string;
  person_id: string;
  camp_role: CampRole;
  assigned_at: string;
}

export interface CampPersonWithDetails extends CampPerson {
  person: Person;
}

/* ─── 6. activities ───────────────────────────────────────── */

export interface Activity {
  id: string;
  camp_id: string;
  activity_name: string;
  activity_order: number;
  status: ActivityStatus;
  created_at: string;
}

/* ─── 7. photos ───────────────────────────────────────────── */

export interface Photo {
  id: string;
  camp_id: string;
  activity_id: string;
  uploaded_by: string;
  file_url: string;
  latitude: number | null;
  longitude: number | null;
  captured_at: string;
  is_selected_for_report: boolean;
  created_at: string;
}

/* ─── 8. surveys ──────────────────────────────────────────── */

export interface Survey {
  id: string;
  camp_id: string;
  survey_reference_id: string;
  submitted_by: string;
  submitted_at: string;
}

/* ─── 9. expenses ─────────────────────────────────────────── */

export interface Expense {
  id: string;
  camp_id: string;
  category: string;
  description: string | null;
  unit_cost: number;
  quantity: number;
  total_amount: number;
  expense_date: string;
  remarks: string | null;
  receipt_url: string | null;
  created_by: string;
  created_at: string;
}

/* ─── 10. narrative_sections ──────────────────────────────── */

export interface NarrativeSection {
  id: string;
  camp_id: string;
  section_type: NarrativeSectionType;
  content: string;
  updated_by: string;
  updated_at: string;
}

/* ─── 11. reports ─────────────────────────────────────────── */

export interface Report {
  id: string;
  camp_id: string;
  generated_by: string;
  generated_at: string;
  pdf_url: string | null;
  docx_url: string | null;
  version: number;
  status: ReportStatus;
}

/* ─── Composite / View Types ──────────────────────────────── */

export interface CampWithCounts extends Camp {
  activity_count?: number;
  photo_count?: number;
  volunteer_count?: number;
}

export interface CampReportData {
  camp: Camp;
  faculty: CampPersonWithDetails[];
  guests: CampPersonWithDetails[];
  volunteers: CampPersonWithDetails[];
  activities: Activity[];
  photos: Photo[];
  expenses: Expense[];
  narratives: NarrativeSection[];
  surveyStats: SurveyStats | null;
}

export interface SurveyStats {
  total_surveys: number;
  completed: number;
  pending: number;
}

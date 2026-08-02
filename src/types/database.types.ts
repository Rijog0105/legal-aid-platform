/* ─── Database Types ───────────────────────────────────────── *
 * Single source of truth for all database entity types.
 * These mirror the Supabase/PostgreSQL schema exactly.
 * Feature-level types should extend/pick from these.
 * ──────────────────────────────────────────────────────────── */

import type { ProjectStatus, ActivityStatus, ReportStatus, ProjectRole, PersonCategory, NarrativeSectionType, RoleName, RegistrationStatus } from '@/constants';

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
  survey_date?: string;
  survey_start_time?: string;
  survey_end_time?: string;
  survey_notes?: string;
  camp_notes?: string;
  state?: string;
  academic_year?: string;
  venue?: string;
  survey_location?: string;
}

export interface Project {
  id: string;
  camp_name: string;
  description: string | null;
  camp_date: string;
  start_time: string | null;
  end_time: string | null;
  village_name: string;
  taluk: string;
  district: string;
  status: ProjectStatus;
  allocated_budget?: number | null;
  report_settings: ReportSettings;
  created_by: string;
  created_at: string;
}

/* ─── 5. camp_people ──────────────────────────────────────── */

export interface ProjectPerson {
  id: string;
  camp_id: string;
  person_id: string;
  camp_role: ProjectRole;
  assigned_at: string;
}

export interface ProjectPersonWithDetails extends ProjectPerson {
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

export interface ProjectWithCounts extends Project {
  activity_count?: number;
  photo_count?: number;
  volunteer_count?: number;
}

export interface ProjectReportData {
  camp: Project;
  faculty: ProjectPersonWithDetails[];
  guests: ProjectPersonWithDetails[];
  volunteers: ProjectPersonWithDetails[];
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

/* ─── 12. attendance_sessions ────────────────────────────── */

export interface AttendanceSession {
  id: string;
  camp_id: string;
  phase: 'survey' | 'camp';
  session_type: 'check_in' | 'check_out';
  created_by: string;
  faculty_latitude: number;
  faculty_longitude: number;
  faculty_gps_accuracy?: number | null;
  radius_meters: number;
  duration_minutes: number;
  starts_at: string;
  expires_at: string;
  status: 'open' | 'closed';
  created_at: string;
}

/* ─── 13. attendance_records ─────────────────────────────── */

export interface AttendanceRecord {
  id: string;
  session_id: string;
  user_id: string;
  camp_id: string;
  phase: 'survey' | 'camp';
  record_type: 'check_in' | 'check_out';
  latitude: number | null;
  longitude: number | null;
  distance_meters: number | null;
  gps_accuracy?: number | null;
  device_timestamp: string;
  server_timestamp: string;
  device_platform: string;
  browser?: string | null;
  os?: string | null;
  app_version?: string | null;
  status: 'present' | 'rejected' | 'pending';
  rejection_reason: string | null;
  sync_status: 'synced' | 'pending' | 'failed';
  created_at: string;
}

/* ─── 14. notifications ──────────────────────────────────── */

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}


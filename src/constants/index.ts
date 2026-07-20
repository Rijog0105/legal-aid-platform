/* ─── Role Constants ──────────────────────────────────────── */

export const ROLES = {
  ADMIN: 'admin',
  FACULTY: 'faculty',
  TEAM_LEAD: 'team_lead',
  VOLUNTEER: 'volunteer',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

/* ─── Camp Status ─────────────────────────────────────────── */

export const CAMP_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;

export type CampStatus = (typeof CAMP_STATUS)[keyof typeof CAMP_STATUS];

/* ─── Activity Status ─────────────────────────────────────── */

export const ACTIVITY_STATUS = {
  PLANNED: 'planned',
  ACTIVE: 'active',
  COMPLETED: 'completed',
} as const;

export type ActivityStatus = (typeof ACTIVITY_STATUS)[keyof typeof ACTIVITY_STATUS];

/* ─── Report Status ───────────────────────────────────────── */

export const REPORT_STATUS = {
  DRAFT: 'draft',
  GENERATED: 'generated',
  FINAL: 'final',
} as const;

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

/* ─── Camp People Roles ───────────────────────────────────── */

export const CAMP_ROLE = {
  FACULTY_COORDINATOR: 'faculty_coordinator',
  GUEST: 'guest',
  VOLUNTEER: 'volunteer',
  TEAM_LEAD: 'team_lead',
} as const;

export type CampRole = (typeof CAMP_ROLE)[keyof typeof CAMP_ROLE];

/* ─── Person Category ─────────────────────────────────────── */

export const PERSON_CATEGORY = {
  FACULTY: 'faculty',
  STUDENT: 'student',
  EXTERNAL: 'external',
} as const;

export type PersonCategory = (typeof PERSON_CATEGORY)[keyof typeof PERSON_CATEGORY];

/* ─── Narrative Section Types ─────────────────────────────── */

export const NARRATIVE_SECTION_TYPE = {
  SYNOPSIS: 'synopsis',
  OBJECTIVES: 'objectives',
  OBSERVATIONS: 'observations',
  RECOMMENDATIONS: 'recommendations',
  CONCLUSION: 'conclusion',
} as const;

export type NarrativeSectionType = (typeof NARRATIVE_SECTION_TYPE)[keyof typeof NARRATIVE_SECTION_TYPE];

export const NARRATIVE_SECTION_LABELS: Record<NarrativeSectionType, string> = {
  [NARRATIVE_SECTION_TYPE.SYNOPSIS]: 'Synopsis',
  [NARRATIVE_SECTION_TYPE.OBJECTIVES]: 'Objectives',
  [NARRATIVE_SECTION_TYPE.OBSERVATIONS]: 'Observations',
  [NARRATIVE_SECTION_TYPE.RECOMMENDATIONS]: 'Recommendations',
  [NARRATIVE_SECTION_TYPE.CONCLUSION]: 'Conclusion',
};

/* ─── Predefined Activity Names ───────────────────────────── */

export const PREDEFINED_ACTIVITIES = [
  'Inauguration',
  'Welcome Address',
  'Bouquet Presentation',
  'Guest Speech',
  'Legal Awareness Session',
  'Survey Activity',
  'Group Photo',
  'Vote of Thanks',
  'Registration',
  'Legal Consultation',
  'Document Verification',
  'Valedictory Function',
] as const;

/* ─── App Config ──────────────────────────────────────────── */

export const APP_CONFIG = {
  APP_NAME: 'Legal Aid Camp Platform',
  APP_SHORT_NAME: 'LACP',
  APP_DESCRIPTION: 'Legal Aid Camp Documentation & Report Automation',
  MAX_PHOTO_SIZE_MB: 10,
  MAX_PHOTOS_PER_UPLOAD: 5,
  DEFAULT_MAX_PHOTOS_PER_ACTIVITY: 4,
  PHOTO_BUCKET: 'camp-photos',
  REPORT_BUCKET: 'camp-reports',
} as const;

/* ─── Route Paths ─────────────────────────────────────────── */

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  UNAUTHORIZED: '/unauthorized',
  
  // Faculty / Admin routes
  DASHBOARD: '/dashboard',
  CAMPS: '/camps',
  CAMP_CREATE: '/camps/new',
  CAMP_DETAIL: '/camps/:campId',
  CAMP_ACTIVITIES: '/camps/:campId/activities',
  CAMP_PHOTOS: '/camps/:campId/photos',
  CAMP_BUDGET: '/camps/:campId/budget',
  CAMP_NARRATIVES: '/camps/:campId/narratives',
  CAMP_REPORT: '/camps/:campId/report',
  CAMP_PEOPLE: '/camps/:campId/people',
  PEOPLE: '/people',
  
  // Volunteer & Team Lead routes
  VOLUNTEER_HOME: '/volunteer',
  VOLUNTEER_CAPTURE: '/volunteer/capture',
  VOLUNTEER_SUBMISSIONS: '/volunteer/submissions',
  TEAM_LEAD_WORKSPACE: '/team-lead',
  TEAM_LEAD_PHOTOS: '/team-lead/photos',
  TEAM_LEAD_SURVEYS: '/team-lead/surveys',
  TEAM_LEAD_REPORTS: '/team-lead/reports',
  TEAM_LEAD_BUDGET: '/team-lead/budget',
} as const;

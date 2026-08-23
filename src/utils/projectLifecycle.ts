/**
 * Project Lifecycle Utility
 *
 * Derives the operational phase state of a Legal Aid Project from its
 * scheduled Survey Phase and Camp Phase datetimes. All evaluation is
 * performed locally in the browser's timezone — no network calls or
 * database writes are made.
 *
 * Boundary semantics (inclusive start, exclusive end):
 *   Survey Active:    surveyStart <= now < surveyEnd
 *   Camp Active:      campStart   <= now < campEnd
 *   Between Phases:   surveyEnd   <= now < campStart
 *   Completed:        now >= campEnd   (camp schedule exists)
 *
 * This utility drives:
 *   - UI visibility/access gating for Team Lead and Volunteer roles.
 *   - Application-level behavioral guards on write operations
 *     (correct behavior enforcement; not a substitute for backend
 *     security since the existing Supabase RLS does not enforce
 *     time-based access windows).
 */

import type { Project, Activity } from '@/types';
import type { ActivityStatus } from '@/constants';

/* ─── Phase state type ───────────────────────────────────────── */

export type PhaseState =
  | 'draft'           // No survey schedule set
  | 'survey_scheduled' // Survey scheduled, not yet started
  | 'survey_active'   // Survey window is live
  | 'between_phases'  // Survey ended, camp not yet started
  | 'camp_scheduled'  // Camp scheduled (no survey), not yet started
  | 'camp_active'     // Camp window is live
  | 'completed';      // Camp phase has ended

/* ─── Return type ────────────────────────────────────────────── */

export interface ProjectLifecycleInfo {
  state: PhaseState;
  /** True only during the survey window. */
  isSurveyActive: boolean;
  /** True only during the camp window. */
  isCampActive: boolean;
  /** True in the gap between survey end and camp start. */
  isBetweenPhases: boolean;
  /** True after the camp window has closed. */
  isCompleted: boolean;
  /** True if state is anything other than 'completed' and project has schedules. */
  hasAccess: boolean;
  /** Resolved datetime objects (null if schedule not set). */
  surveyStart: Date | null;
  surveyEnd: Date | null;
  campStart: Date | null;
  campEnd: Date | null;
}

/* ─── Helper: build Date from date string + time string ──────── */

function buildDatetime(dateStr: string | null | undefined, timeStr: string | null | undefined, defaultTime: string): Date | null {
  if (!dateStr) return null;
  const time = timeStr?.trim() || defaultTime;
  // "YYYY-MM-DDThh:mm" is parsed as local time in all modern browsers.
  return new Date(`${dateStr}T${time}`);
}

/* ─── Main utility ───────────────────────────────────────────── */

export function getProjectLifecycleState(
  project: Project,
  now: Date = new Date()
): ProjectLifecycleInfo {
  const rs = project.report_settings;

  // Build survey datetimes
  const surveyStart = buildDatetime(rs?.survey_date, rs?.survey_start_time, '00:00');
  const surveyEnd   = buildDatetime(rs?.survey_date, rs?.survey_end_time,   '23:59');

  // Build camp datetimes
  const campStart = buildDatetime(project.camp_date, project.start_time, '00:00');
  const campEnd   = buildDatetime(project.camp_date, project.end_time,   '23:59');

  const nowMs = now.getTime();

  // Derived flags
  const isSurveyActive  = !!surveyStart && !!surveyEnd
    && nowMs >= surveyStart.getTime() && nowMs < surveyEnd.getTime();

  const isCampActive    = !!campStart && !!campEnd
    && nowMs >= campStart.getTime() && nowMs < campEnd.getTime();

  const isBetweenPhases = !!surveyEnd && !!campStart
    && nowMs >= surveyEnd.getTime() && nowMs < campStart.getTime();

  const isCompleted     = !!campEnd && nowMs >= campEnd.getTime();

  // Derive state
  let state: PhaseState;

  if (isCompleted) {
    state = 'completed';
  } else if (isCampActive) {
    state = 'camp_active';
  } else if (isBetweenPhases) {
    state = 'between_phases';
  } else if (isSurveyActive) {
    state = 'survey_active';
  } else if (campStart && nowMs < campStart.getTime() && !surveyStart) {
    // Camp scheduled, no survey
    state = 'camp_scheduled';
  } else if (surveyStart && nowMs < surveyStart.getTime()) {
    state = 'survey_scheduled';
  } else {
    state = 'draft';
  }

  const hasAccess = state !== 'completed' && state !== 'draft';

  return {
    state,
    isSurveyActive,
    isCampActive,
    isBetweenPhases,
    isCompleted,
    hasAccess,
    surveyStart,
    surveyEnd,
    campStart,
    campEnd,
  };
}

/* ─── Human-readable labels ──────────────────────────────────── */

export const PHASE_STATE_LABELS: Record<PhaseState, string> = {
  draft:            'Draft',
  survey_scheduled: 'Survey Scheduled',
  survey_active:    'Survey Phase Active',
  between_phases:   'Between Phases',
  camp_scheduled:   'Camp Scheduled',
  camp_active:      'Camp Phase Active',
  completed:        'Completed',
};

export function deriveActivityStatus(
  activity: Activity,
  project: Project,
  now: Date = new Date()
): ActivityStatus {
  const lc = getProjectLifecycleState(project, now);
  const nowMs = now.getTime();

  if (activity.activity_name === 'Survey Activity' || activity.phase === 'survey') {
    // Before Survey Phase
    if (!lc.surveyStart || nowMs < lc.surveyStart.getTime()) {
      return 'planned';
    }
    // During Survey Phase
    if (lc.isSurveyActive) {
      return 'active';
    }
    // After Survey Phase
    return 'completed';
  } else {
    // Normal Camp Activity
    // Before Camp Phase
    if (!lc.campStart || nowMs < lc.campStart.getTime()) {
      return 'planned';
    }
    // During Camp Phase
    if (lc.isCampActive) {
      return 'active';
    }
    // After Camp Phase
    return 'completed';
  }
}

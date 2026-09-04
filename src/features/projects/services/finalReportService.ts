import { supabase } from '@/services/supabase';
import type { Project } from '@/types';

export interface FinalReportPhotoItem {
  id: string;
  url: string;
  caption?: string;
  aspectRatio: 'original' | '16:9' | '4:3' | '1:1';
  displayWidth: 'full' | 'half';
  scalePercent: number; // 60 - 100
}

export interface FinalReportData {
  // Autofilled & Locked fields (preserved from system data)
  eventName: string;
  dateOfEvent: string;
  venue: string;
  organizedBy: string;
  totalUniqueStudents: number;
  uniqueStudentsList: Array<{ id: string; name: string; usn?: string }>;
  overallBudget: {
    allocated: number;
    spent: number;
    balance: number;
  };

  // Editable / Addable fields (kept EMPTY for faculty entry, no sample mock text)
  collaborators: string;
  scheduleItems: string[];
  facultyConveners: string;
  studentConveners: string;
  guestsInvited: string[];
  objective: string;
  detailedReportParagraphs: string[];
  pressNote: string;
  photos: FinalReportPhotoItem[];
}

/**
 * Extracts attendance across survey and camp phases without duplication.
 */
export async function getDeduplicatedStudentAttendance(projectId: string): Promise<{
  count: number;
  students: Array<{ id: string; name: string; usn?: string }>;
}> {
  try {
    // 1. Fetch attendance records for both phases where status is 'present'
    const { data: records, error: recError } = await supabase
      .from('attendance_records')
      .select(`
        id,
        user_id,
        status,
        phase,
        user:users(
          id,
          person_id,
          person:persons(id, full_name, usn_employee_id, category)
        )
      `)
      .eq('camp_id', projectId)
      .eq('status', 'present');

    if (recError) {
      console.warn('Could not query attendance_records directly:', recError.message);
    }

    const uniqueMap = new Map<string, { id: string; name: string; usn?: string }>();

    if (records && records.length > 0) {
      for (const rec of records as any[]) {
        const person = rec.user?.person;
        const studentId = person?.id || rec.user_id;
        const name = person?.full_name || 'Volunteer Student';
        const usn = person?.usn_employee_id || undefined;

        if (studentId && !uniqueMap.has(studentId)) {
          uniqueMap.set(studentId, { id: studentId, name, usn });
        }
      }
    }

    // 2. If no check-in records logged yet, check roster volunteers assigned to this project
    if (uniqueMap.size === 0) {
      const { data: roster } = await supabase
        .from('camp_people')
        .select(`
          person_id,
          camp_role,
          person:persons(id, full_name, usn_employee_id, category)
        `)
        .eq('camp_id', projectId)
        .in('camp_role', ['volunteer', 'team_lead']);

      if (roster && roster.length > 0) {
        for (const item of roster as any[]) {
          const p = item.person;
          if (p && !uniqueMap.has(p.id)) {
            uniqueMap.set(p.id, {
              id: p.id,
              name: p.full_name,
              usn: p.usn_employee_id || undefined,
            });
          }
        }
      }
    }

    const count = uniqueMap.size;
    const students = Array.from(uniqueMap.values());

    return { count, students };
  } catch (err) {
    console.error('Error computing deduplicated attendance:', err);
    return { count: 0, students: [] };
  }
}

/**
 * Computes overall budget and expenditure for the project across all phases.
 */
export async function getOverallProjectBudget(
  projectId: string,
  project: Project
): Promise<{ allocated: number; spent: number; balance: number }> {
  try {
    const allocatedSurvey = Number(project.allocated_budget_survey) || 0;
    const allocatedCamp = Number(project.allocated_budget_camp) || 0;
    const totalAllocated =
      Number(project.allocated_budget) ||
      (allocatedSurvey + allocatedCamp > 0 ? allocatedSurvey + allocatedCamp : 0);

    const { data: expenses } = await supabase
      .from('expenses')
      .select('total_amount, quantity, unit_cost')
      .eq('camp_id', projectId);

    let totalSpent = 0;
    if (expenses && expenses.length > 0) {
      totalSpent = expenses.reduce((sum, item: any) => {
        const itemTotal =
          Number(item.total_amount) ||
          Number(item.unit_cost || 0) * Number(item.quantity || 1);
        return sum + itemTotal;
      }, 0);
    }

    const balance = Math.max(0, totalAllocated - totalSpent);

    return {
      allocated: totalAllocated,
      spent: totalSpent,
      balance,
    };
  } catch (err) {
    console.error('Error calculating overall budget:', err);
    return { allocated: 0, spent: 0, balance: 0 };
  }
}

/**
 * Retrieves conveners from assigned project people if any, or empty.
 */
export async function getProjectConveners(projectId: string): Promise<{
  facultyConveners: string;
  studentConveners: string;
}> {
  try {
    const { data: people } = await supabase
      .from('camp_people')
      .select(`
        camp_role,
        person:persons(full_name, designation)
      `)
      .eq('camp_id', projectId);

    const faculties: string[] = [];
    const students: string[] = [];

    if (people && people.length > 0) {
      for (const p of people as any[]) {
        const name = p.person?.full_name;
        if (!name) continue;
        if (p.camp_role === 'faculty') {
          faculties.push(`Prof. ${name}`);
        } else if (p.camp_role === 'team_lead') {
          students.push(name);
        }
      }
    }

    return {
      facultyConveners: faculties.join(', '),
      studentConveners: students.join(', '),
    };
  } catch (err) {
    return {
      facultyConveners: '',
      studentConveners: '',
    };
  }
}

/**
 * Loads or initializes the report payload with empty editable fields.
 */
export async function initializeFinalReportData(
  projectId: string,
  project: Project
): Promise<FinalReportData> {
  const draftKey = `final_report_draft_${projectId}`;
  const savedDraft = localStorage.getItem(draftKey);

  // Fetch real-time system metrics that must ALWAYS be accurate
  const [{ count: uniqueCount, students: uniqueStudents }, budget, conveners] = await Promise.all([
    getDeduplicatedStudentAttendance(projectId),
    getOverallProjectBudget(projectId, project),
    getProjectConveners(projectId),
  ]);

  const venueStr = [project.village_name, project.taluk, project.district, 'Karnataka']
    .filter(Boolean)
    .join(', ');

  const formattedDate = project.camp_date
    ? new Date(project.camp_date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  if (savedDraft) {
    try {
      const parsed = JSON.parse(savedDraft);
      const isLegacyMock =
        parsed.collaborators === 'Department Of Justice, Ministry of Law and Justice, and Government of India' &&
        parsed.objective?.includes('promote awareness about the International Day of Poverty Eradication');

      if (!isLegacyMock) {
        return {
          ...parsed,
          // Always bind to live project facts for autofilled fields
          eventName: project.camp_name || parsed.eventName || '',
          dateOfEvent: formattedDate || parsed.dateOfEvent || '',
          venue: venueStr || parsed.venue || '',
          organizedBy: 'School of Legal Studies, Reva University',
          totalUniqueStudents: uniqueCount,
          uniqueStudentsList: uniqueStudents,
          overallBudget: budget,
        };
      }
    } catch (e) {
      console.warn('Failed to parse cached report draft:', e);
    }
  }

  // Fresh report data: Autofilled fields set from project, editable fields are completely empty!
  return {
    eventName: project.camp_name || '',
    dateOfEvent: formattedDate,
    venue: venueStr,
    organizedBy: 'School of Legal Studies, Reva University',
    totalUniqueStudents: uniqueCount,
    uniqueStudentsList: uniqueStudents,
    overallBudget: budget,

    // To-be-filled fields are initialized empty (no mock PDF text)
    collaborators: '',
    scheduleItems: [''],
    facultyConveners: conveners.facultyConveners || '',
    studentConveners: conveners.studentConveners || '',
    guestsInvited: [''],
    objective: '',
    detailedReportParagraphs: [''],
    pressNote: '',
    photos: [],
  };
}

/**
 * Saves current report draft to localStorage.
 */
export function saveFinalReportDraft(projectId: string, data: FinalReportData): void {
  const draftKey = `final_report_draft_${projectId}`;
  try {
    localStorage.setItem(draftKey, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save final report draft:', err);
  }
}

export interface AvailableCampPhoto {
  id: string;
  url: string;
  activityName: string;
  caption?: string;
  capturedAt?: string;
}

/**
 * Fetches ONLY photos actually captured for this camp from the database.
 * No dummy or random Unsplash photos.
 */
export async function fetchAvailableCampPhotos(projectId: string): Promise<AvailableCampPhoto[]> {
  try {
    const { data: dbPhotos, error } = await supabase
      .from('photos')
      .select('id, file_url, created_at, activity:activities(activity_name)')
      .eq('camp_id', projectId)
      .order('created_at', { ascending: false });

    if (error || !dbPhotos || dbPhotos.length === 0) {
      return [];
    }

    const resolvedList: AvailableCampPhoto[] = [];
    for (const p of dbPhotos as any[]) {
      let resolvedUrl = p.file_url;
      if (
        p.file_url &&
        !p.file_url.startsWith('http://') &&
        !p.file_url.startsWith('https://') &&
        !p.file_url.startsWith('data:')
      ) {
        const { data: signed } = await supabase.storage
          .from('camp-photos')
          .createSignedUrl(p.file_url, 7200);
        if (signed?.signedUrl) {
          resolvedUrl = signed.signedUrl;
        }
      }

      if (resolvedUrl) {
        resolvedList.push({
          id: p.id,
          url: resolvedUrl,
          activityName: p.activity?.activity_name || 'Camp Documentation',
          caption: p.activity?.activity_name || 'Camp Documentation Photo',
          capturedAt: p.created_at,
        });
      }
    }

    return resolvedList;
  } catch (err) {
    console.error('Failed to fetch available camp photos:', err);
    return [];
  }
}

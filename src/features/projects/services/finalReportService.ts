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
    const uniqueMap = new Map<string, { id: string; name: string; usn?: string }>();

    // 1. Fetch attendance sessions for this project (survey + camp phases)
    const { data: sessions } = await supabase
      .from('attendance_sessions')
      .select('id, phase')
      .eq('camp_id', projectId);

    const sessionIds = (sessions || []).map((s) => s.id);

    // 2. Fetch present records for this camp across both survey and camp phases
    const presentUserIds = new Set<string>();

    // Query by camp_id
    const { data: recByCamp } = await supabase
      .from('attendance_records')
      .select('user_id, status, phase')
      .eq('camp_id', projectId)
      .eq('status', 'present');

    if (recByCamp && recByCamp.length > 0) {
      recByCamp.forEach((r) => {
        if (r.user_id) presentUserIds.add(r.user_id);
      });
    }

    // Query by session_id
    if (sessionIds.length > 0) {
      const { data: recBySession } = await supabase
        .from('attendance_records')
        .select('user_id, status, phase')
        .in('session_id', sessionIds)
        .eq('status', 'present');

      if (recBySession && recBySession.length > 0) {
        recBySession.forEach((r) => {
          if (r.user_id) presentUserIds.add(r.user_id);
        });
      }
    }

    const uniqueUserIds = Array.from(presentUserIds);

    // 3. Resolve student records for users who marked attendance present
    if (uniqueUserIds.length > 0) {
      const { data: usersWithPersons } = await supabase
        .from('users')
        .select(`
          id,
          person_id,
          person:persons(id, full_name, usn_employee_id, category)
        `)
        .in('id', uniqueUserIds);

      if (usersWithPersons && usersWithPersons.length > 0) {
        for (const u of usersWithPersons as any[]) {
          const p = u.person;
          if (p?.category === 'faculty') continue;
          const studentId = p?.id || u.person_id || u.id;
          const name = p?.full_name || 'Volunteer Student';
          const usn = p?.usn_employee_id || undefined;
          const normKey = (studentId || name).trim().toLowerCase();

          if (!uniqueMap.has(normKey)) {
            uniqueMap.set(normKey, { id: studentId, name, usn });
          }
        }
      }
    }

    // 4. Also check attendance roster for survey & camp phases to capture all student participants without duplication
    if (uniqueMap.size === 0) {
      const { data: roster } = await supabase
        .from('camp_people')
        .select(`
          person_id,
          camp_role,
          phase,
          person:persons(id, full_name, usn_employee_id, category)
        `)
        .eq('camp_id', projectId)
        .in('camp_role', ['volunteer', 'team_lead']);

      if (roster && roster.length > 0) {
        for (const item of roster as any[]) {
          const p = item.person;
          if (p && p.full_name && p.category !== 'faculty') {
            const normKey = (p.id || p.full_name).trim().toLowerCase();
            if (!uniqueMap.has(normKey)) {
              uniqueMap.set(normKey, {
                id: p.id || normKey,
                name: p.full_name,
                usn: p.usn_employee_id || undefined,
              });
            }
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
    // 1. Fetch live camp record to ensure latest allocation figures
    const { data: liveCamp } = await supabase
      .from('camps')
      .select('allocated_budget, allocated_budget_survey, allocated_budget_camp')
      .eq('id', projectId)
      .maybeSingle();

    const campData = liveCamp || project;
    const allocatedSurvey = Number(campData?.allocated_budget_survey) || 0;
    const allocatedCamp = Number(campData?.allocated_budget_camp) || 0;
    const totalAllocated =
      allocatedSurvey + allocatedCamp > 0
        ? allocatedSurvey + allocatedCamp
        : Number(campData?.allocated_budget) || 0;

    // 2. Fetch all expenses for this project across both survey and camp phases
    const { data: expenses } = await supabase
      .from('expenses')
      .select('total_amount, quantity, unit_cost, phase')
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

    const balance = totalAllocated - totalSpent;

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

export interface ConvenerGuestPersonOption {
  id: string;
  name: string;
  subtitle?: string;
  category: 'student' | 'faculty' | 'guest';
}

export interface ConvenerAndGuestOptions {
  availableStudents: ConvenerGuestPersonOption[];
  availableFaculty: ConvenerGuestPersonOption[];
  availableGuests: ConvenerGuestPersonOption[];
}

/**
 * Fetches available students, faculty, and guests from project roster, attendance, and institutional directory.
 */
export async function fetchReportConvenerAndGuestOptions(
  projectId: string
): Promise<ConvenerAndGuestOptions> {
  const studentMap = new Map<string, ConvenerGuestPersonOption>();
  const facultyMap = new Map<string, ConvenerGuestPersonOption>();
  const guestMap = new Map<string, ConvenerGuestPersonOption>();

  // 1. Fetch only registered website users who have faculty access
  try {
    const { data: facultyUsers } = await supabase
      .from('users')
      .select(`
        id,
        is_active,
        role:roles(*),
        person:persons(*)
      `)
      .eq('is_active', true);

    if (facultyUsers && facultyUsers.length > 0) {
      for (const item of facultyUsers as any[]) {
        const roleName = item.role?.name;
        if (roleName === 'faculty' || roleName === 'admin') {
          const p = item.person;
          if (p && p.full_name) {
            const normKey = p.full_name.trim().toLowerCase();
            facultyMap.set(normKey, {
              id: p.id || item.id,
              name: p.full_name.startsWith('Dr.') || p.full_name.startsWith('Prof.') ? p.full_name : `Prof. ${p.full_name}`,
              subtitle: p.designation || (roleName === 'admin' ? 'Faculty Admin' : 'Faculty Coordinator'),
              category: 'faculty',
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('Error querying faculty users with access:', e);
  }

  // 2. Fetch assigned faculty from project roster (camp_people)
  try {
    const { data: campFaculties } = await supabase
      .from('camp_people')
      .select(`
        camp_role,
        person:persons(id, full_name, designation, category)
      `)
      .eq('camp_id', projectId)
      .in('camp_role', ['faculty', 'faculty_coordinator']);

    if (campFaculties && campFaculties.length > 0) {
      for (const item of campFaculties as any[]) {
        const p = item.person;
        if (p && p.full_name) {
          const normKey = p.full_name.trim().toLowerCase();
          if (!facultyMap.has(normKey)) {
            facultyMap.set(normKey, {
              id: p.id || normKey,
              name: p.full_name.startsWith('Dr.') || p.full_name.startsWith('Prof.') ? p.full_name : `Prof. ${p.full_name}`,
              subtitle: p.designation || 'Assigned Faculty Coordinator',
              category: 'faculty',
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('Error querying camp_people for faculty coordinators:', e);
  }

  // 3. Fetch persons in database registered under faculty category
  try {
    const { data: facultyPersons } = await supabase
      .from('persons')
      .select('id, full_name, designation, category')
      .eq('category', 'faculty');

    if (facultyPersons && facultyPersons.length > 0) {
      for (const p of facultyPersons as any[]) {
        if (p && p.full_name) {
          const normKey = p.full_name.trim().toLowerCase();
          if (!facultyMap.has(normKey)) {
            facultyMap.set(normKey, {
              id: p.id || normKey,
              name: p.full_name.startsWith('Dr.') || p.full_name.startsWith('Prof.') ? p.full_name : `Prof. ${p.full_name}`,
              subtitle: p.designation || 'School of Legal Studies Faculty',
              category: 'faculty',
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('Error querying persons for faculty category:', e);
  }

  // 4. Fetch camp coordinator if set
  try {
    const { data: campInfo } = await supabase
      .from('camps')
      .select('coordinator_name, faculty_coordinator:faculty_coordinator_id(id, full_name, designation)')
      .eq('id', projectId)
      .maybeSingle();

    if (campInfo) {
      const fc = (campInfo as any).faculty_coordinator;
      if (fc && fc.full_name) {
        const normKey = fc.full_name.trim().toLowerCase();
        if (!facultyMap.has(normKey)) {
          facultyMap.set(normKey, {
            id: fc.id || normKey,
            name: fc.full_name.startsWith('Dr.') || fc.full_name.startsWith('Prof.') ? fc.full_name : `Prof. ${fc.full_name}`,
            subtitle: fc.designation || 'Project Faculty Coordinator',
            category: 'faculty',
          });
        }
      } else if (campInfo.coordinator_name) {
        const normKey = campInfo.coordinator_name.trim().toLowerCase();
        if (!facultyMap.has(normKey)) {
          facultyMap.set(normKey, {
            id: normKey,
            name: campInfo.coordinator_name.startsWith('Dr.') || campInfo.coordinator_name.startsWith('Prof.') ? campInfo.coordinator_name : `Prof. ${campInfo.coordinator_name}`,
            subtitle: 'Project Coordinator',
            category: 'faculty',
          });
        }
      }
    }
  } catch (e) {
    console.warn('Error querying camp coordinator:', e);
  }

  // 5. Fetch available students from project roster & attendees
  try {
    const { data: campStudents } = await supabase
      .from('camp_people')
      .select(`
        camp_role,
        person:persons(id, full_name, category, designation, usn_employee_id)
      `)
      .eq('camp_id', projectId)
      .in('camp_role', ['volunteer', 'team_lead']);

    if (campStudents && campStudents.length > 0) {
      for (const item of campStudents as any[]) {
        const p = item.person;
        if (p && p.full_name) {
          const normKey = p.full_name.trim().toLowerCase();
          if (!studentMap.has(normKey)) {
            studentMap.set(normKey, {
              id: p.id || normKey,
              name: p.full_name,
              subtitle: p.usn_employee_id ? `USN: ${p.usn_employee_id}` : (item.camp_role === 'team_lead' ? 'Team Lead' : 'Student Volunteer'),
              category: 'student',
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('Error querying students for roster:', e);
  }

  // 6. Fetch available guests from external invitees and camp people
  try {
    const { data: externalPersons } = await supabase
      .from('persons')
      .select('id, full_name, designation, organization, category')
      .eq('category', 'external');

    if (externalPersons && externalPersons.length > 0) {
      for (const p of externalPersons as any[]) {
        if (p && p.full_name) {
          const normKey = p.full_name.trim().toLowerCase();
          if (!guestMap.has(normKey)) {
            guestMap.set(normKey, {
              id: p.id || normKey,
              name: p.full_name,
              subtitle: p.designation || p.organization || 'Guest of Honour',
              category: 'guest',
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('Error querying external persons for guests:', e);
  }

  // Standard legal aid institutional guest panels
  const institutionalGuests: ConvenerGuestPersonOption[] = [
    { id: 'inst-gst-1', name: 'Justice R. Venkataraman (Retd.)', subtitle: 'Retired Judge, High Court of Karnataka', category: 'guest' },
    { id: 'inst-gst-2', name: 'Adv. Meera Iyer', subtitle: 'Senior Advocate, District Bar Association', category: 'guest' },
    { id: 'inst-gst-3', name: 'Member Secretary, DLSA', subtitle: 'District Legal Services Authority', category: 'guest' },
    { id: 'inst-gst-4', name: 'President, Grama Panchayat', subtitle: 'Local Village Administration', category: 'guest' },
    { id: 'inst-gst-5', name: 'Senior Civil Judge & CJM', subtitle: 'Chief Judicial Magistrate', category: 'guest' },
  ];

  for (const g of institutionalGuests) {
    const key = g.name.toLowerCase();
    if (!guestMap.has(key)) guestMap.set(key, g);
  }

  return {
    availableStudents: Array.from(studentMap.values()),
    availableFaculty: Array.from(facultyMap.values()),
    availableGuests: Array.from(guestMap.values()),
  };
}


import { supabase } from '@/services/supabase';
import type { Activity } from '@/types';
import type { ActivityStatus } from '@/constants';
import { isOffline, withOfflineCache } from '@/services/offlineCache';

export interface ActivityPayload {
  camp_id: string;
  activity_name: string;
  activity_order: number;
  status?: ActivityStatus;
  phase: 'survey' | 'camp';
}

export async function fetchActivities(
  campId: string,
  phase?: 'survey' | 'camp'
): Promise<Activity[]> {
  return withOfflineCache(`activities:${campId}:${phase ?? 'all'}`, async () => {
    let query = supabase
      .from('activities')
      .select('*')
      .eq('camp_id', campId)
      .order('activity_order', { ascending: true });

    if (phase) {
      query = query.eq('phase', phase);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as Activity[];
  });
}

export async function fetchActivity(id: string): Promise<Activity | null> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Activity;
}

/**
 * Returns the next `activity_order` value for a camp (current max + 1),
 * so newly created activities are appended to the end of the list.
 * Reordering itself is out of scope for this milestone.
 */
export async function getNextActivityOrder(campId: string): Promise<number> {
  const { data, error } = await supabase
    .from('activities')
    .select('activity_order')
    .eq('camp_id', campId)
    .order('activity_order', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const maxOrder = data?.[0]?.activity_order ?? -1;
  return maxOrder + 1;
}

export async function createActivity(payload: ActivityPayload): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .insert([{ ...payload, status: payload.status ?? 'planned' }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Activity;
}

export async function updateActivity(
  id: string,
  payload: Partial<Pick<ActivityPayload, 'activity_name'>>
): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Activity;
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase.from('activities').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateActivityStatus(
  id: string,
  status: ActivityStatus
): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Activity;
}

/**
 * Persists a new activity_order for each activity in a camp, based on the
 * order of `orderedIds` (0-indexed). Used by the drag-and-drop reorder UI.
 */
export async function reorderActivities(campId: string, orderedIds: string[]): Promise<void> {
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('activities')
        .update({ activity_order: index })
        .eq('id', id)
        .eq('camp_id', campId)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

export async function ensureSurveyActivityExists(campId: string): Promise<void> {
  if (isOffline()) return;
  try {
    // 1. Check if an activity with name 'Survey Activity' and phase = 'camp' already exists for this camp
    const { data: existing, error: fetchError } = await supabase
      .from('activities')
      .select('id')
      .eq('camp_id', campId)
      .eq('phase', 'camp')
      .eq('activity_name', 'Survey Activity')
      .maybeSingle();

    if (fetchError) {
      console.error('[activityService] Error checking Survey Activity existence:', fetchError.message);
      return;
    }

    // 2. If it does not exist, insert it exactly once
    if (!existing) {
      console.log(`[activityService] Auto-creating compulsory Survey Activity for camp ${campId}`);
      await supabase
        .from('activities')
        .insert([
          {
            camp_id: campId,
            activity_name: 'Survey Activity',
            phase: 'camp',
            activity_order: 0,
            status: 'planned',
          },
        ]);
    }
  } catch (err) {
    console.error('[activityService] Exception in ensureSurveyActivityExists:', err);
  }
}

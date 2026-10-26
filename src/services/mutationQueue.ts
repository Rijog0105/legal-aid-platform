import { supabase } from '@/services/supabase';
import { APP_CONFIG } from '@/constants';
import { offlineDb, type PendingMutation } from '@/db/offlineDb';
import { isNetworkError } from '@/services/offlineCache';

const MAX_AUTO_ATTEMPTS = 5;

export async function queueMutation(
  mutation: Omit<PendingMutation, 'localId' | 'status' | 'created_at' | 'attempt_count' | 'error_message'>
): Promise<number> {
  return offlineDb.pendingMutations.add({
    ...mutation,
    status: 'pending',
    created_at: new Date().toISOString(),
    attempt_count: 0,
    error_message: null,
  });
}

export async function getPendingMutations(
  filter: (m: PendingMutation) => boolean
): Promise<PendingMutation[]> {
  const all = await offlineDb.pendingMutations.orderBy('created_at').toArray();
  return all.filter(filter);
}

export async function countMutations(userId: string): Promise<{ pending: number; failed: number; lastError: string | null }> {
  const items = await offlineDb.pendingMutations.where('userId').equals(userId).toArray();
  const failed = items.filter((m) => m.status === 'failed');
  return {
    pending: items.filter((m) => m.status === 'pending').length,
    failed: failed.length,
    lastError: failed[0]?.error_message ?? null,
  };
}

export async function resetFailedMutations(userId: string): Promise<void> {
  const failed = await offlineDb.pendingMutations
    .where('userId')
    .equals(userId)
    .filter((m) => m.status === 'failed')
    .toArray();
  for (const m of failed) {
    await offlineDb.pendingMutations.update(m.localId!, { status: 'pending', attempt_count: 0, error_message: null });
  }
}

async function runMutation(m: PendingMutation): Promise<string | null> {
  const p = m.payload;
  switch (m.type) {
    case 'photo_upload': {
      const blob: Blob = p.blob;
      const { error: uploadError } = await supabase.storage
        .from(APP_CONFIG.PHOTO_BUCKET)
        .upload(p.path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      const { data, error } = await supabase
        .from('photos')
        .insert([
          {
            camp_id: p.camp_id,
            activity_id: p.activity_id,
            uploaded_by: p.uploaded_by,
            file_url: p.path,
            latitude: p.latitude,
            longitude: p.longitude,
            captured_at: p.captured_at,
          },
        ])
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data.id as string;
    }
    case 'expense_create': {
      const { data, error } = await supabase.from('expenses').insert([p]).select('id').single();
      if (error) throw new Error(error.message);
      return data.id as string;
    }
    case 'expense_update': {
      const { error } = await supabase.from('expenses').update(p.updateData).eq('id', p.id);
      if (error) throw new Error(error.message);
      return null;
    }
    case 'expense_delete': {
      const { error } = await supabase.from('expenses').delete().eq('id', p.id);
      if (error) throw new Error(error.message);
      return null;
    }
  }
}

/**
 * Replays queued offline writes for one user, oldest first.
 * Returns how many were applied and how many are still waiting or failed.
 */
export async function processPendingMutations(userId: string): Promise<{ processed: number; remaining: number }> {
  const items = await offlineDb.pendingMutations
    .where('userId')
    .equals(userId)
    .filter((m) => m.status === 'pending')
    .toArray();
  items.sort((a, b) => a.created_at.localeCompare(b.created_at));

  let processed = 0;
  for (const item of items) {
    const fresh = await offlineDb.pendingMutations.get(item.localId!);
    if (!fresh || fresh.status !== 'pending') continue;

    const attempt = fresh.attempt_count + 1;
    await offlineDb.pendingMutations.update(fresh.localId!, { attempt_count: attempt });

    try {
      const realId = await runMutation(fresh);
      await offlineDb.pendingMutations.delete(fresh.localId!);
      processed++;

      // Later queued edits/deletes of a row created offline must target its real id.
      if (realId && fresh.tempId) {
        const dependents = await offlineDb.pendingMutations
          .filter((m) => m.payload?.id === fresh.tempId)
          .toArray();
        for (const d of dependents) {
          await offlineDb.pendingMutations.update(d.localId!, { payload: { ...d.payload, id: realId } });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (isNetworkError(err)) {
        // Connection dropped again; stop and retry on the next online event.
        await offlineDb.pendingMutations.update(fresh.localId!, { error_message: message });
        break;
      }
      const permanent = attempt >= MAX_AUTO_ATTEMPTS || /row-level security|permission|violates|invalid/i.test(message);
      await offlineDb.pendingMutations.update(fresh.localId!, {
        status: permanent ? 'failed' : 'pending',
        error_message: message,
      });
    }
  }

  const remaining = await offlineDb.pendingMutations.where('userId').equals(userId).count();
  return { processed, remaining };
}

import { supabase } from '@/services/supabase';
import type { Expense, Project } from '@/types';
import { offlineDb } from '@/db/offlineDb';
import { isNetworkError, isOffline, makeTempId, withOfflineCache } from '@/services/offlineCache';
import { getPendingMutations, queueMutation } from '@/services/mutationQueue';
import { useAuthStore } from '@/store/authStore';

export interface CreateExpensePayload {
  camp_id: string;
  category: string;
  description?: string | null;
  unit_cost: number;
  quantity: number;
  expense_date: string;
  remarks?: string | null;
  receipt_url?: string | null;
  phase: 'survey' | 'camp';
  created_by: string;
}

export type UpdateExpensePayload = Partial<Omit<CreateExpensePayload, 'camp_id' | 'created_by'>>;

const isLocalId = (id: string) => id.startsWith('local_');

/**
 * Applies expense changes made offline (not yet synced) on top of the last known server list.
 */
async function applyPendingExpenseChanges(campId: string, phase: 'survey' | 'camp', base: Expense[]): Promise<Expense[]> {
  const pending = await getPendingMutations((m) => m.campId === campId && m.type.startsWith('expense_'));
  let result = [...base];
  for (const m of pending) {
    if (m.type === 'expense_create' && m.payload.phase === phase) {
      result = [{ ...m.payload, id: m.tempId, created_at: m.created_at } as Expense, ...result];
    } else if (m.type === 'expense_update') {
      result = result.map((e) => (e.id === m.payload.id ? { ...e, ...m.payload.updateData } : e));
    } else if (m.type === 'expense_delete') {
      result = result.filter((e) => e.id !== m.payload.id);
    }
  }
  return result;
}

/**
 * Fetch all expenses for a camp phase, sorted by created_at DESC (newest first).
 */
export async function fetchExpenses(campId: string, phase: 'survey' | 'camp'): Promise<Expense[]> {
  const base = await withOfflineCache(`expenses:${campId}:${phase}`, async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('camp_id', campId)
      .eq('phase', phase)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as Expense[];
  });
  return applyPendingExpenseChanges(campId, phase, base);
}

/**
 * Create a new expense line item. Total amount is auto-calculated as unit_cost * quantity.
 * Saved on the device and synced later when offline.
 */
export async function createExpense(payload: CreateExpensePayload): Promise<Expense> {
  const total_amount = Number((payload.unit_cost * payload.quantity).toFixed(2));

  const insertData = {
    camp_id: payload.camp_id,
    category: payload.category,
    description: payload.description ?? null,
    unit_cost: payload.unit_cost,
    quantity: payload.quantity,
    total_amount,
    expense_date: payload.expense_date,
    remarks: payload.remarks ?? null,
    receipt_url: payload.receipt_url ?? null,
    phase: payload.phase,
    created_by: payload.created_by,
  };

  const queueForLater = async (): Promise<Expense> => {
    const tempId = makeTempId();
    await queueMutation({
      type: 'expense_create',
      userId: payload.created_by,
      campId: payload.camp_id,
      tempId,
      payload: insertData,
    });
    return { ...insertData, id: tempId, created_at: new Date().toISOString() } as Expense;
  };

  if (isOffline()) return queueForLater();

  const { data, error } = await supabase
    .from('expenses')
    .insert([insertData])
    .select()
    .single();

  if (error) {
    if (isNetworkError(error.message)) return queueForLater();
    throw new Error(error.message);
  }
  return data as Expense;
}

/**
 * Update an existing expense line item. Total amount is re-calculated if unit_cost or quantity change.
 */
export async function updateExpense(id: string, payload: UpdateExpensePayload): Promise<Expense> {
  const updateData: Record<string, unknown> = { ...payload };

  // Expense created offline and not synced yet: edit the queued insert directly.
  if (isLocalId(id)) {
    const [queued] = await getPendingMutations((m) => m.tempId === id);
    if (!queued) throw new Error('This expense could not be found on the device.');
    const merged = { ...queued.payload, ...updateData };
    merged.total_amount = Number((Number(merged.unit_cost) * Number(merged.quantity)).toFixed(2));
    await offlineDb.pendingMutations.update(queued.localId!, { payload: merged });
    return { ...merged, id, created_at: queued.created_at } as Expense;
  }

  const queueForLater = async (): Promise<Expense> => {
    if (payload.unit_cost !== undefined && payload.quantity !== undefined) {
      updateData.total_amount = Number((payload.unit_cost * payload.quantity).toFixed(2));
    }
    const cached = await offlineDb.queryCache.toArray().catch(() => []);
    const existing = cached
      .filter((c) => c.key.startsWith('expenses:'))
      .flatMap((c) => c.data as Expense[])
      .find((e) => e.id === id);
    await queueMutation({
      type: 'expense_update',
      userId: useAuthStore.getState().userId ?? existing?.created_by ?? 'unknown',
      campId: existing?.camp_id ?? '',
      tempId: null,
      payload: { id, updateData },
    });
    return { ...(existing ?? {}), ...updateData, id } as Expense;
  };

  if (isOffline()) return queueForLater();

  try {
    if (payload.unit_cost !== undefined || payload.quantity !== undefined) {
      const existing = await fetchExpenseById(id);
      const unit_cost = payload.unit_cost ?? existing?.unit_cost ?? 0;
      const quantity = payload.quantity ?? existing?.quantity ?? 1;
      updateData.total_amount = Number((unit_cost * quantity).toFixed(2));
    }

    const { data, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Expense;
  } catch (err) {
    if (isNetworkError(err)) return queueForLater();
    throw err;
  }
}

/**
 * Fetch a single expense by ID.
 */
export async function fetchExpenseById(id: string): Promise<Expense | null> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Expense;
}

/**
 * Delete an expense line item.
 */
export async function deleteExpense(id: string): Promise<void> {
  if (isLocalId(id)) {
    const related = await getPendingMutations((m) => m.tempId === id || m.payload?.id === id);
    await Promise.all(related.map((m) => offlineDb.pendingMutations.delete(m.localId!)));
    return;
  }

  const queueForLater = async () => {
    const cached = await offlineDb.queryCache.toArray().catch(() => []);
    const existing = cached
      .filter((c) => c.key.startsWith('expenses:'))
      .flatMap((c) => c.data as Expense[])
      .find((e) => e.id === id);
    await queueMutation({
      type: 'expense_delete',
      userId: useAuthStore.getState().userId ?? existing?.created_by ?? 'unknown',
      campId: existing?.camp_id ?? '',
      tempId: null,
      payload: { id },
    });
  };

  if (isOffline()) return queueForLater();

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) {
    if (isNetworkError(error.message)) return queueForLater();
    throw new Error(error.message);
  }
}

/**
 * Update allocated budget for a project phase (survey or camp).
 */
export async function updateAllocatedBudget(
  campId: string,
  phase: 'survey' | 'camp',
  allocatedBudget: number
): Promise<Project> {
  const updateField = phase === 'survey' ? 'allocated_budget_survey' : 'allocated_budget_camp';
  const { data, error } = await supabase
    .from('camps')
    .update({ [updateField]: allocatedBudget })
    .eq('id', campId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Project;
}

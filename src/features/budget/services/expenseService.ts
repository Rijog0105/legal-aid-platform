import { supabase } from '@/services/supabase';
import type { Expense, Project } from '@/types';

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

/**
 * Fetch all expenses for a camp phase, sorted by created_at DESC (newest first).
 */
export async function fetchExpenses(campId: string, phase: 'survey' | 'camp'): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('camp_id', campId)
    .eq('phase', phase)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Expense[];
}

/**
 * Create a new expense line item. Total amount is auto-calculated as unit_cost * quantity.
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

  const { data, error } = await supabase
    .from('expenses')
    .insert([insertData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Expense;
}

/**
 * Update an existing expense line item. Total amount is re-calculated if unit_cost or quantity change.
 */
export async function updateExpense(id: string, payload: UpdateExpensePayload): Promise<Expense> {
  const updateData: Record<string, unknown> = { ...payload };

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
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
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

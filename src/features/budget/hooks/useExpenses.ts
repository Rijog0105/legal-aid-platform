import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Expense, Project } from '@/types';
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  updateAllocatedBudget,
  type CreateExpensePayload,
  type UpdateExpensePayload,
} from '../services/expenseService';

export function useExpenses(campId: string, phase: 'survey' | 'camp', allocatedBudget?: number | null) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    setExpenses([]);
    if (!campId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchExpenses(campId, phase);
      setExpenses(data);
    } catch (err) {
      console.error('[useExpenses] Error loading expenses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, [campId, phase]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const addExpense = useCallback(
    async (payload: CreateExpensePayload): Promise<Expense> => {
      const newExpense = await createExpense(payload);
      setExpenses((prev) => [newExpense, ...prev]);
      return newExpense;
    },
    []
  );

  const editExpense = useCallback(
    async (id: string, payload: UpdateExpensePayload): Promise<Expense> => {
      const updated = await updateExpense(id, payload);
      setExpenses((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
      return updated;
    },
    []
  );

  const removeExpense = useCallback(async (id: string): Promise<void> => {
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const setAllocatedBudget = useCallback(
    async (newBudget: number): Promise<Project> => {
      return await updateAllocatedBudget(campId, phase, newBudget);
    },
    [campId, phase]
  );

  /* Computations & Safety Guards */
  const totalSpent = useMemo(() => {
    return expenses.reduce((sum, item) => {
      const val = Number(item.total_amount);
      return sum + (typeof val === 'number' && !isNaN(val) ? val : 0);
    }, 0);
  }, [expenses]);

  const budgetLimit = useMemo(() => {
    const val = Number(allocatedBudget);
    return typeof val === 'number' && !isNaN(val) ? val : 0;
  }, [allocatedBudget]);

  const remainingBudget = useMemo(() => {
    const res = budgetLimit - totalSpent;
    return typeof res === 'number' && !isNaN(res) ? res : 0;
  }, [budgetLimit, totalSpent]);

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((item) => {
      const cat = item.category || 'Miscellaneous';
      const val = Number(item.total_amount);
      const safeVal = typeof val === 'number' && !isNaN(val) ? val : 0;
      map[cat] = (map[cat] || 0) + safeVal;
    });
    return map;
  }, [expenses]);

  /**
   * TODO (Offline-First Sync Architecture):
   * Currently expense mutations (addExpense, editExpense, removeExpense) execute
   * direct Supabase network operations with local optimistic state updates.
   * In a future offline enhancement phase, mutation payloads should be queued into
   * an IndexedDB offline mutation buffer when offline (navigator.onLine === false)
   * and synchronized automatically upon reconnection.
   */

  return {
    expenses,
    isLoading,
    error,
    totalSpent,
    remainingBudget,
    expenseCount: expenses.length,
    categoryTotals,
    refetch: loadExpenses,
    addExpense,
    editExpense,
    removeExpense,
    setAllocatedBudget,
  };
}

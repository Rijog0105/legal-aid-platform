import { useState, useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Receipt, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui';
import type { Expense } from '@/types';
import { formatCurrency } from '@/utils';
import { EXPENSE_CATEGORIES } from '../constants';

const expenseSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional().nullable(),
  unit_cost: z.number().min(0.01, 'Unit cost must be greater than 0'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  expense_date: z.string().min(1, 'Expense date is required'),
  remarks: z.string().optional().nullable(),
  receipt_url: z.string().url('Invalid URL').or(z.literal('')).optional().nullable(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit?: Expense | null;
  onSave: (values: ExpenseFormValues) => Promise<void>;
}

export function ExpenseFormModal({
  isOpen,
  onClose,
  expenseToEdit,
  onSave,
}: ExpenseFormModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const isEdit = Boolean(expenseToEdit);

  const defaultDate = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: EXPENSE_CATEGORIES[0],
      description: '',
      unit_cost: 0,
      quantity: 1,
      expense_date: defaultDate,
      remarks: '',
      receipt_url: '',
    },
  });

  const watchUnitCost = useWatch({ control, name: 'unit_cost', defaultValue: 0 });
  const watchQuantity = useWatch({ control, name: 'quantity', defaultValue: 1 });

  const calculatedTotal = useMemo(() => {
    const cost = Number(watchUnitCost) || 0;
    const qty = Number(watchQuantity) || 0;
    return Number((cost * qty).toFixed(2));
  }, [watchUnitCost, watchQuantity]);

  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        reset({
          category: expenseToEdit.category || EXPENSE_CATEGORIES[0],
          description: expenseToEdit.description || '',
          unit_cost: expenseToEdit.unit_cost ?? 0,
          quantity: expenseToEdit.quantity ?? 1,
          expense_date: expenseToEdit.expense_date
            ? expenseToEdit.expense_date.split('T')[0]
            : defaultDate,
          remarks: expenseToEdit.remarks || '',
          receipt_url: expenseToEdit.receipt_url || '',
        });
      } else {
        reset({
          category: EXPENSE_CATEGORIES[0],
          description: '',
          unit_cost: 0,
          quantity: 1,
          expense_date: defaultDate,
          remarks: '',
          receipt_url: '',
        });
      }
      setServerError(null);
    }
  }, [isOpen, expenseToEdit, defaultDate, reset]);

  if (!isOpen) return null;

  const onSubmit = async (values: ExpenseFormValues) => {
    setServerError(null);
    try {
      await onSave(values);
      onClose();
    } catch (err) {
      console.error('[ExpenseFormModal] Error saving expense:', err);
      setServerError(err instanceof Error ? err.message : 'Failed to save expense line item');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Receipt size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {isEdit ? 'Edit Expense Item' : 'Add Expense Item'}
              </h3>
              <p className="text-xs text-slate-400">Record unit cost, quantity, and receipt reference</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1">
          {serverError && (
            <div className="flex items-start gap-2 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{serverError}</p>
            </div>
          )}

          {/* Category Dropdown */}
          <div className="space-y-1">
            <label htmlFor="category" className="block text-xs font-bold text-slate-700">
              Expense Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              {...register('category')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs cursor-pointer"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-xs text-red-600 mt-1">{errors.category.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label htmlFor="description" className="block text-xs font-bold text-slate-700">
              Description / Particulars
            </label>
            <Input
              id="description"
              placeholder="e.g. Bus fare for 15 volunteers to camp venue"
              {...register('description')}
              error={errors.description?.message}
            />
          </div>

          {/* Unit Cost & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label htmlFor="unit_cost" className="block text-xs font-bold text-slate-700">
                Unit Cost (₹) <span className="text-red-500">*</span>
              </label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 250"
                {...register('unit_cost', { valueAsNumber: true })}
                error={errors.unit_cost?.message}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="quantity" className="block text-xs font-bold text-slate-700">
                Quantity <span className="text-red-500">*</span>
              </label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="1"
                {...register('quantity', { valueAsNumber: true })}
                error={errors.quantity?.message}
              />
            </div>
          </div>

          {/* Auto-calculated Total Banner */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900">Total Calculated Amount</span>
            <span className="text-base font-black text-indigo-700">{formatCurrency(calculatedTotal)}</span>
          </div>

          {/* Expense Date */}
          <div className="space-y-1">
            <label htmlFor="expense_date" className="block text-xs font-bold text-slate-700">
              Expense Date <span className="text-red-500">*</span>
            </label>
            <Input
              id="expense_date"
              type="date"
              {...register('expense_date')}
              error={errors.expense_date?.message}
            />
          </div>

          {/* Remarks & Receipt URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label htmlFor="remarks" className="block text-xs font-bold text-slate-700">
                Remarks (Optional)
              </label>
              <Input
                id="remarks"
                placeholder="Bill #104"
                {...register('remarks')}
                error={errors.remarks?.message}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="receipt_url" className="block text-xs font-bold text-slate-700">
                Receipt Link (Optional)
              </label>
              <Input
                id="receipt_url"
                type="url"
                placeholder="https://..."
                {...register('receipt_url')}
                error={errors.receipt_url?.message}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>{isEdit ? 'Save Changes' : 'Add Expense'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

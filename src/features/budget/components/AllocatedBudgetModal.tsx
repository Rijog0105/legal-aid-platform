import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, AlertCircle } from 'lucide-react';
import { Input, IndianRupeeIcon } from '@/components/ui';

const budgetSchema = z.object({
  allocated_budget: z.number().min(0, 'Budget must be a non-negative number'),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

interface AllocatedBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudget?: number | null;
  onSave: (amount: number) => Promise<void>;
  phaseLabel?: string;
}

export function AllocatedBudgetModal({
  isOpen,
  onClose,
  currentBudget,
  onSave,
  phaseLabel = 'Camp Phase',
}: AllocatedBudgetModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      allocated_budget: currentBudget ?? 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ allocated_budget: currentBudget ?? 0 });
      setServerError(null);
    }
  }, [isOpen, currentBudget, reset]);

  if (!isOpen) return null;

  const onSubmit = async (values: BudgetFormValues) => {
    setServerError(null);
    try {
      await onSave(values.allocated_budget);
      onClose();
    } catch (err) {
      console.error('[AllocatedBudgetModal] Error saving allocated budget:', err);
      setServerError(err instanceof Error ? err.message : 'Failed to update allocated budget');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <IndianRupeeIcon size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">Allocated {phaseLabel} Budget</h3>
              <p className="text-xs text-slate-400">Set approved institutional budget cap for this phase</p>
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
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {serverError && (
            <div className="flex items-start gap-2 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{serverError}</p>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="allocated_budget" className="block text-xs font-bold text-slate-700">
              Allocated Amount (₹) <span className="text-red-500">*</span>
            </label>
            <Input
              id="allocated_budget"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 25000"
              {...register('allocated_budget', { valueAsNumber: true })}
              error={errors.allocated_budget?.message}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
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
                <span>Save Budget</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

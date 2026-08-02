import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, DollarSign, AlertCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-surface-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-surface-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              <DollarSign size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-surface-900 leading-tight">Allocated {phaseLabel} Budget</h3>
              <p className="text-xs text-surface-500">Set the maximum approved budget limit for this {phaseLabel.toLowerCase()}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {serverError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{serverError}</p>
            </div>
          )}

          <div>
            <label htmlFor="allocated_budget" className="block text-xs font-semibold text-surface-700 mb-1">
              Allocated Amount (₹)
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Save Allocated Budget
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

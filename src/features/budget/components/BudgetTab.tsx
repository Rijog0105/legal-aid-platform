import { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingDown,
  PieChart,
  Plus,
  Download,
  Edit2,
  Trash2,
  Search,
  Receipt,
  ExternalLink,
} from 'lucide-react';
import { Card, Button, Spinner, EmptyState } from '@/components/ui';
import { useExpenses } from '../hooks/useExpenses';
import { AllocatedBudgetModal } from './AllocatedBudgetModal';
import { ExpenseFormModal } from './ExpenseFormModal';
import { EXPENSE_CATEGORIES } from '../constants';
import { generateBudgetReportPDF } from '../utils/budgetReportGenerator';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROLES } from '@/constants';
import type { Project, Expense } from '@/types';
import { formatCurrency, formatDate } from '@/utils';

interface BudgetTabProps {
  campId: string;
  camp: Project;
  phase: 'survey' | 'camp';
  onCampUpdate?: () => void;
}

export function BudgetTab({ campId, camp, phase, onCampUpdate }: BudgetTabProps) {
  const { hasRole, userId } = useAuth();
  const canEditAllocatedBudget = hasRole([ROLES.FACULTY, ROLES.ADMIN]);
  const canManageExpenses = hasRole([ROLES.FACULTY, ROLES.ADMIN, ROLES.TEAM_LEAD]);

  const allocatedBudget = phase === 'survey' ? (camp.allocated_budget_survey ?? 0) : (camp.allocated_budget_camp ?? 0);

  const {
    expenses,
    isLoading,
    error,
    totalSpent,
    remainingBudget,
    expenseCount,
    categoryTotals,
    addExpense,
    editExpense,
    removeExpense,
    setAllocatedBudget,
  } = useExpenses(campId, phase, allocatedBudget);

  /* Filter & Search State */
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  /* Modals State */
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  /* Delete Confirmation State */
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  /* Filtered Expenses List */
  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const matchesCategory =
        selectedCategory === 'ALL' || item.category === selectedCategory;
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        item.category.toLowerCase().includes(searchLower) ||
        (item.description && item.description.toLowerCase().includes(searchLower)) ||
        (item.remarks && item.remarks.toLowerCase().includes(searchLower));
      return matchesCategory && matchesSearch;
    });
  }, [expenses, selectedCategory, searchTerm]);

  /* Save Handlers */
  const handleSaveBudget = async (newBudget: number) => {
    await setAllocatedBudget(newBudget);
    if (onCampUpdate) onCampUpdate();
  };

  const handleSaveExpense = async (values: {
    category: string;
    description?: string | null;
    unit_cost: number;
    quantity: number;
    expense_date: string;
    remarks?: string | null;
    receipt_url?: string | null;
  }) => {
    if (expenseToEdit) {
      await editExpense(expenseToEdit.id, values);
    } else {
      await addExpense({
        camp_id: campId,
        category: values.category,
        description: values.description,
        unit_cost: values.unit_cost,
        quantity: values.quantity,
        expense_date: values.expense_date,
        remarks: values.remarks,
        receipt_url: values.receipt_url,
        phase: phase,
        created_by: userId ?? '',
      });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setDeletingExpenseId(id);
    try {
      await removeExpense(id);
    } catch (err) {
      console.error('[BudgetTab] Error deleting expense:', err);
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const handleDownloadReport = () => {
    generateBudgetReportPDF({
      camp,
      expenses,
      allocatedBudget,
      totalSpent,
      remainingBudget,
      categoryTotals,
    });
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-surface-500 font-medium">Loading camp budget &amp; expenses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
            Project Budget &amp; Expenses
          </h2>
          <p className="text-xs text-surface-500 mt-0.5 font-medium">
            Track line-item expenditures, category allocations, and balance statement.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadReport}
            className="flex items-center gap-1.5 text-surface-700 border-surface-300 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download size={15} />
            <span>Download Budget Report</span>
          </Button>

          {canManageExpenses && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setExpenseToEdit(null);
                setIsExpenseModalOpen(true);
              }}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>Add Expense</span>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <p className="font-semibold">Failed to load budget entries</p>
          <p className="text-xs mt-0.5">{error}</p>
        </div>
      )}

      {/* 4 Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Allocated Budget */}
        <Card
          padding="none"
          className="p-5 relative bg-white border border-surface-200 shadow-sm rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-default group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-surface-500">
              Allocated Budget
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center transition-colors group-hover:bg-blue-100">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-black text-surface-900 tracking-tight">
              {formatCurrency(allocatedBudget)}
            </span>
            {canEditAllocatedBudget && (
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(true)}
                className="text-xs text-primary-600 hover:text-primary-850 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Edit2 size={12} />
                <span>Edit Limit</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-surface-400 mt-2 font-medium">Approved financial limit</p>
        </Card>

        {/* Card 2: Total Spent */}
        <Card
          padding="none"
          className="p-5 relative bg-white border border-surface-200 shadow-sm rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-default group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-surface-500">
              Total Spent
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center transition-colors group-hover:bg-rose-100">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-rose-700 tracking-tight">
              {formatCurrency(totalSpent)}
            </span>
          </div>
          <p className="text-[11px] text-surface-400 mt-2 font-medium">Sum of recorded expenses</p>
        </Card>

        {/* Card 3: Remaining Balance */}
        <Card
          padding="none"
          className="p-5 relative bg-white border border-surface-200 shadow-sm rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-default group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-surface-500">
              Remaining Balance
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                remainingBudget >= 0
                  ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
                  : 'bg-red-50 text-red-600 group-hover:bg-red-100'
              }`}
            >
              <PieChart size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span
              className={`text-2xl font-black tracking-tight ${
                remainingBudget >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {formatCurrency(remainingBudget)}
            </span>
          </div>
          <p className="text-[11px] text-surface-400 mt-2 font-medium">
            {remainingBudget >= 0 ? 'Budget within limit' : 'Over budget warning'}
          </p>
        </Card>

        {/* Card 4: Expense Count */}
        <Card
          padding="none"
          className="p-5 relative bg-white border border-surface-200 shadow-sm rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-default group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-surface-500">
              Expense Line Items
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center transition-colors group-hover:bg-purple-100">
              <Receipt size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-surface-900 tracking-tight">{expenseCount}</span>
          </div>
          <p className="text-[11px] text-surface-400 mt-2 font-medium">Line items entered</p>
        </Card>
      </div>

      {/* Category-Wise Breakdown Grid */}
      <Card padding="none" className="p-6 border border-surface-200 shadow-sm rounded-2xl">
        <h3 className="text-xs font-bold uppercase tracking-widest text-surface-400 mb-4">
          Category-Wise Totals Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPENSE_CATEGORIES.map((category) => {
            const amount = categoryTotals[category] || 0;
            const percent = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
            return (
              <div
                key={category}
                className="p-4 rounded-xl bg-white border border-surface-200 shadow-xs flex items-center justify-between transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm hover:border-surface-300"
              >
                <div>
                  <p className="text-xs font-bold text-surface-700 tracking-tight">{category}</p>
                  <p className="text-[11px] text-surface-400 mt-1 font-medium">{percent}% of total spent</p>
                </div>
                <div className="text-right pl-3">
                  <p className="text-sm font-black text-surface-900 tracking-tight">
                    {formatCurrency(amount)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Line Item Expense History Section */}
      <Card padding="none" className="p-6 border border-surface-200 shadow-sm rounded-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">Expense History Entries</h3>
            <p className="text-[11px] text-surface-400 mt-0.5 font-medium">Detailed list of recorded transaction details and receipts.</p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search expense description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-surface-200 bg-white text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium"
              />
            </div>

            {/* Category Select Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-surface-200 bg-white text-xs font-semibold text-surface-700 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <EmptyState
            title="No Expenses Found"
            description={
              expenses.length === 0
                ? 'No line-item expenses recorded for this camp yet.'
                : 'No expense items match your search or category filter.'
            }
            action={
              canManageExpenses ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setExpenseToEdit(null);
                    setIsExpenseModalOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  Add First Expense
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-150 bg-slate-50/75 text-[10px] font-extrabold text-surface-500 uppercase tracking-widest">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Remarks / Link</th>
                  {canManageExpenses && <th className="py-3 px-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 text-xs text-surface-800 bg-white">
                {filteredExpenses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-surface-700 whitespace-nowrap">
                      {item.expense_date
                        ? formatDate(item.expense_date)
                        : formatDate(item.created_at)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-surface-900 max-w-xs truncate">
                      {item.description || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-surface-600">
                      {formatCurrency(item.unit_cost)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-surface-700">
                      {item.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-primary-600 whitespace-nowrap">
                      {formatCurrency(item.total_amount)}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-center gap-2">
                        {item.remarks && (
                          <span className="truncate text-surface-550 font-medium" title={item.remarks}>
                            {item.remarks}
                          </span>
                        )}
                        {item.receipt_url && (
                          <a
                            href={item.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-850 font-bold underline shrink-0 cursor-pointer"
                          >
                            <span>Receipt</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </td>
                    {canManageExpenses && (
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            title="Edit Expense"
                            onClick={() => {
                              setExpenseToEdit(item);
                              setIsExpenseModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-surface-450 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            type="button"
                            title="Delete Expense"
                            disabled={deletingExpenseId === item.id}
                            onClick={() => handleDeleteExpense(item.id)}
                            className="p-1.5 rounded-lg text-surface-450 hover:text-red-650 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            {deletingExpenseId === item.id ? (
                              <Spinner size="sm" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modals */}
      <AllocatedBudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        currentBudget={allocatedBudget}
        onSave={handleSaveBudget}
        phaseLabel={phase === 'survey' ? 'Survey Phase' : 'Camp Phase'}
      />

      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setExpenseToEdit(null);
        }}
        expenseToEdit={expenseToEdit}
        onSave={handleSaveExpense}
      />
    </div>
  );
}

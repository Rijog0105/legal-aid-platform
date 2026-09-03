import { useEffect, useState } from 'react';
import { Check, X, Clock, AlertCircle, UserCheck, Mail, Phone } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { fetchPendingRegistrations, approvePendingRegistration, rejectPendingRegistration } from '@/features/people/services/peopleService';
import type { Person } from '@/types';
import type { PersonCategory } from '@/constants';

interface PendingRegistrationsListProps {
  onUpdated: () => void;
}

export function PendingRegistrationsList({ onUpdated }: PendingRegistrationsListProps) {
  const [pendingList, setPendingList] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [approvalModalPerson, setApprovalModalPerson] = useState<Person | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PersonCategory>('student');

  const loadPending = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPendingRegistrations();
      setPendingList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pending registrations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const openApproveModal = (person: Person) => {
    setApprovalModalPerson(person);
    setSelectedCategory(person.category || 'student');
  };

  const handleConfirmApproval = async () => {
    if (!approvalModalPerson) return;
    setActioningId(approvalModalPerson.id);
    setError(null);
    try {
      await approvePendingRegistration(approvalModalPerson.id, selectedCategory);
      setApprovalModalPerson(null);
      await loadPending();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve registration');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (person: Person) => {
    if (!window.confirm(`Reject registration for "${person.full_name}"?`)) return;
    setActioningId(person.id);
    setError(null);
    try {
      await rejectPendingRegistration(person.id);
      await loadPending();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject registration');
    } finally {
      setActioningId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
        <AlertCircle size={16} className="shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (pendingList.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <UserCheck size={28} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">No Pending Registrations</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          All incoming volunteer and faculty registration requests have been reviewed and processed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl text-amber-900 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Clock size={16} className="text-amber-600 shrink-0" />
          <span>
            <strong>{pendingList.length} applicant{pendingList.length !== 1 ? 's' : ''}</strong> awaiting Faculty Coordinator approval.
          </span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-600 text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Applicant</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 hidden md:table-cell">SRN / ID</th>
                <th className="px-6 py-4 hidden lg:table-cell">Department</th>
                <th className="px-6 py-4 hidden sm:table-cell">Contact</th>
                <th className="px-6 py-4 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingList.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 leading-snug">{p.full_name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Applied {new Date(p.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                        p.category === 'faculty'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {p.category}
                    </span>
                  </td>

                  <td className="px-6 py-4 hidden md:table-cell text-slate-700 font-mono text-xs font-semibold">
                    {p.usn_employee_id || '—'}
                  </td>

                  <td className="px-6 py-4 hidden lg:table-cell text-slate-600 text-xs">
                    <p className="font-medium">{p.department || '—'}</p>
                    {p.semester && <p className="text-[11px] text-slate-400">{p.semester}</p>}
                  </td>

                  <td className="px-6 py-4 hidden sm:table-cell text-slate-600 text-xs">
                    {p.email && (
                      <div className="flex items-center gap-1 text-slate-700 font-medium truncate max-w-[180px]">
                        <Mail size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{p.email}</span>
                      </div>
                    )}
                    {p.phone && (
                      <div className="flex items-center gap-1 text-slate-400 mt-0.5">
                        <Phone size={12} className="shrink-0" />
                        <span>{p.phone}</span>
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        disabled={actioningId === p.id}
                        onClick={() => openApproveModal(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Check size={14} />
                        <span>Approve</span>
                      </button>
                      <button
                        disabled={actioningId === p.id}
                        onClick={() => handleReject(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 text-red-600 font-bold text-xs border border-red-200 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Confirmation Dialog */}
      {approvalModalPerson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setApprovalModalPerson(null)}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 space-y-4 border border-slate-200 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Check size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Approve Applicant</h3>
                <p className="text-xs text-slate-500">Activate platform access for this user</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              Approve account for <strong className="text-slate-900">{approvalModalPerson.full_name}</strong> (<span className="text-indigo-600 font-medium">{approvalModalPerson.email}</span>)?
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Assigned Role Permissions
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as PersonCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="student">Student Volunteer Account</option>
                <option value="faculty">Faculty Coordinator Account</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApprovalModalPerson(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actioningId === approvalModalPerson.id}
                onClick={handleConfirmApproval}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                {actioningId === approvalModalPerson.id ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Activating…</span>
                  </>
                ) : (
                  <span>Confirm &amp; Activate</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

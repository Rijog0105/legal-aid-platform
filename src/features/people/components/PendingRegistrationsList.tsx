import { useEffect, useState } from 'react';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { Button, Badge, Spinner, EmptyState } from '@/components/ui';
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
      <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        <AlertCircle size={16} className="shrink-0" />
        {error}
      </div>
    );
  }

  if (pendingList.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6">
        <EmptyState
          icon={<Clock size={28} />}
          title="No pending registrations"
          description="All user self-registrations have been processed."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-900 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-amber-600 shrink-0" />
          <span>
            <strong>{pendingList.length} pending</strong> registration{pendingList.length !== 1 ? 's' : ''} requiring Faculty/Admin review.
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-100 bg-surface-50">
              <th className="text-left px-5 py-3.5 font-medium text-surface-600">Applicant</th>
              <th className="text-left px-5 py-3.5 font-medium text-surface-600">Requested Category</th>
              <th className="text-left px-5 py-3.5 font-medium text-surface-600 hidden md:table-cell">SRN</th>

              <th className="text-left px-5 py-3.5 font-medium text-surface-600 hidden lg:table-cell">Dept &amp; Sem</th>
              <th className="text-left px-5 py-3.5 font-medium text-surface-600 hidden sm:table-cell">Contact</th>
              <th className="px-5 py-3.5 text-right font-medium text-surface-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {pendingList.map((p) => (
              <tr key={p.id} className="hover:bg-surface-50/60 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-semibold text-surface-900">{p.full_name}</p>
                  <p className="text-xs text-surface-400">
                    {new Date(p.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <Badge variant={p.category === 'faculty' ? 'primary' : 'info'} className="capitalize">
                    {p.category}
                  </Badge>
                </td>
                <td className="px-5 py-4 hidden md:table-cell text-surface-700 font-mono text-xs">
                  {p.usn_employee_id || '—'}
                </td>
                <td className="px-5 py-4 hidden lg:table-cell text-surface-600">
                  <p>{p.department || '—'}</p>
                  {p.semester && <p className="text-xs text-surface-400">{p.semester}</p>}
                </td>
                <td className="px-5 py-4 hidden sm:table-cell text-surface-600">
                  {p.email && <p className="text-xs font-medium text-surface-800">{p.email}</p>}
                  {p.phone && <p className="text-xs text-surface-400">{p.phone}</p>}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={actioningId === p.id}
                      onClick={() => openApproveModal(p)}
                      leftIcon={<Check size={14} />}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actioningId === p.id}
                      onClick={() => handleReject(p)}
                      leftIcon={<X size={14} />}
                    >
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Approve Confirmation Modal */}
      {approvalModalPerson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setApprovalModalPerson(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-fade-in">
            <h3 className="text-lg font-bold text-surface-900">Approve Registration</h3>
            <p className="text-sm text-surface-600">
              Approve registration for <strong>{approvalModalPerson.full_name}</strong> ({approvalModalPerson.email})?
            </p>

            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold text-surface-700">Assign Category Role</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as PersonCategory)}
                className="w-full px-3.5 py-2 rounded-xl border border-surface-300 text-sm bg-white text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              >
                <option value="student">Student (Volunteer User Account)</option>
                <option value="faculty">Faculty (Faculty User Account)</option>
              </select>
              <p className="text-[11px] text-surface-400">
                Approving creates their system authentication user record with the selected role permissions.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200">
              <Button variant="secondary" size="sm" onClick={() => setApprovalModalPerson(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={actioningId === approvalModalPerson.id}
                onClick={handleConfirmApproval}
              >
                Confirm &amp; Activate Access
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

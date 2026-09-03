import { useState, useEffect } from 'react';
import { Users, Plus, Search, Pencil, Trash2, AlertCircle, Clock, UserPlus, Phone, Mail } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { PERSON_CATEGORY, type PersonCategory } from '@/constants';
import type { Person } from '@/types';
import { deletePerson, fetchPendingRegistrations } from '@/features/people/services/peopleService';
import { usePeople } from '@/features/people/hooks/usePeople';
import { PersonForm } from './PersonForm';
import { GuestFormModal } from './GuestFormModal';
import { PendingRegistrationsList } from './PendingRegistrationsList';

const CATEGORY_LABELS: Record<PersonCategory, string> = {
  [PERSON_CATEGORY.FACULTY]: 'Faculty',
  [PERSON_CATEGORY.STUDENT]: 'Student',
  [PERSON_CATEGORY.EXTERNAL]: 'Guest',
};

type ViewMode = 'active' | 'pending';

export function PeoplePage() {
  const { people, isLoading, error, search, setSearch, categoryFilter, setCategoryFilter, reload } =
    usePeople();

  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [pendingCount, setPendingCount] = useState<number>(0);

  const [showForm, setShowForm] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadPendingCount = async () => {
    try {
      const pending = await fetchPendingRegistrations();
      setPendingCount(pending.length);
    } catch (e) {
      console.error('Failed to fetch pending count:', e);
    }
  };

  useEffect(() => {
    loadPendingCount();
  }, []);

  const openCreate = () => {
    setEditingPerson(null);
    setShowForm(true);
  };

  const openEdit = (p: Person) => {
    setEditingPerson(p);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPerson(null);
  };

  const handleSaved = (_p: Person) => {
    closeForm();
    reload();
  };

  const handleGuestSaved = (_p: Person) => {
    setShowGuestModal(false);
    reload();
  };

  const handleDelete = async (p: Person) => {
    if (!window.confirm(`Delete "${p.full_name}" from registry? This cannot be undone.`)) return;
    setDeletingId(p.id);
    setDeleteError(null);
    try {
      await deletePerson(p.id);
      reload();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">People Registry</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
              {people.length} Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Institutional directory of Faculty Coordinators, Student Volunteers, Team Leads, and external Guests.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            id="btn-add-guest"
            onClick={() => setShowGuestModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200 shadow-xs transition-all cursor-pointer"
          >
            <UserPlus size={15} className="text-slate-500" />
            <span>Add Guest</span>
          </button>

          <button
            id="btn-add-person"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Person</span>
          </button>
        </div>
      </div>

      {/* ─── Segmented Mode Selector ─── */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200 w-fit">
        <button
          onClick={() => setViewMode('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            viewMode === 'active'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users size={15} className={viewMode === 'active' ? 'text-indigo-600' : 'text-slate-400'} />
          <span>Active Directory</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            {people.length}
          </span>
        </button>

        <button
          onClick={() => setViewMode('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            viewMode === 'pending'
              ? 'bg-white text-amber-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock size={15} className={viewMode === 'pending' ? 'text-amber-600' : 'text-slate-400'} />
          <span>Pending Approvals</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold shadow-xs">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* ─── PENDING REGISTRATIONS VIEW ─── */}
      {viewMode === 'pending' ? (
        <PendingRegistrationsList
          onUpdated={() => {
            loadPendingCount();
            reload();
          }}
        />
      ) : (
        /* ─── ACTIVE REGISTRY VIEW ─── */
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                id="people-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, SRN, email, or department…"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { key: null, label: 'All Roles' },
                { key: PERSON_CATEGORY.FACULTY, label: 'Faculty' },
                { key: PERSON_CATEGORY.STUDENT, label: 'Students' },
                { key: PERSON_CATEGORY.EXTERNAL, label: 'Guests' },
              ].map(({ key, label }) => {
                const active = categoryFilter === key;
                return (
                  <button
                    key={key ?? 'all'}
                    id={`filter-${key ?? 'all'}`}
                    onClick={() => setCategoryFilter(key)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      active
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Banner */}
          {(error || deleteError) && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error ?? deleteError}</span>
            </div>
          )}

          {/* Directory Table */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : people.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                <Users size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {search || categoryFilter ? 'No matching people found' : 'No records registered yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
                {search || categoryFilter
                  ? 'Try clearing or changing your search filters.'
                  : 'Add faculty, students, or guests to the institutional directory.'}
              </p>
              {!search && !categoryFilter && (
                <button
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Add Person</span>
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-600 text-xs uppercase tracking-wider font-bold">
                      <th className="px-6 py-4">Name &amp; Role</th>
                      <th className="px-6 py-4 hidden md:table-cell">ID / Designation</th>
                      <th className="px-6 py-4 hidden lg:table-cell">Dept / Organization</th>
                      <th className="px-6 py-4 hidden sm:table-cell">Contact</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {people.map((p) => {
                      const isStudent = p.category === PERSON_CATEGORY.STUDENT;
                      const isFaculty = p.category === PERSON_CATEGORY.FACULTY;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isFaculty
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : isStudent
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {p.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 leading-snug">{p.full_name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isFaculty
                                        ? 'bg-purple-100 text-purple-800'
                                        : isStudent
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {CATEGORY_LABELS[p.category]}
                                  </span>
                                  {isStudent && p.usn_employee_id && (
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {p.usn_employee_id.replace(/^SRN:\s*/i, '')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 hidden md:table-cell text-slate-600 text-xs">
                            <p className="font-medium">{p.designation || p.usn_employee_id || '—'}</p>
                          </td>

                          <td className="px-6 py-4 hidden lg:table-cell text-slate-600 text-xs">
                            <p className="font-medium">{p.department || p.organization || '—'}</p>
                            {p.semester && <p className="text-[11px] text-slate-400">{p.semester}</p>}
                          </td>

                          <td className="px-6 py-4 hidden sm:table-cell text-slate-600 text-xs">
                            <div className="space-y-0.5">
                              {p.email && (
                                <div className="flex items-center gap-1 text-slate-700 truncate max-w-[200px]">
                                  <Mail size={12} className="text-slate-400 shrink-0" />
                                  <span className="truncate">{p.email}</span>
                                </div>
                              )}
                              {p.phone && (
                                <div className="flex items-center gap-1 text-slate-500">
                                  <Phone size={12} className="text-slate-400 shrink-0" />
                                  <span>{p.phone}</span>
                                </div>
                              )}
                              {!p.email && !p.phone && <span className="text-slate-300">—</span>}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center gap-1 justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                id={`btn-edit-${p.id}`}
                                onClick={() => openEdit(p)}
                                title="Edit Person"
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                id={`btn-delete-${p.id}`}
                                onClick={() => handleDelete(p)}
                                disabled={deletingId === p.id}
                                title="Delete Person"
                                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 cursor-pointer"
                              >
                                {deletingId === p.id ? (
                                  <span className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin block" />
                                ) : (
                                  <Trash2 size={15} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Modals */}
      {showForm && (
        <PersonForm
          person={editingPerson}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      {showGuestModal && (
        <GuestFormModal
          onClose={() => setShowGuestModal(false)}
          onSaved={handleGuestSaved}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Users, Plus, Search, Pencil, Trash2, AlertCircle, Clock, UserPlus } from 'lucide-react';
import { Button, Badge, EmptyState, Spinner } from '@/components/ui';
import { PERSON_CATEGORY, type PersonCategory } from '@/constants';
import type { Person } from '@/types';
import { deletePerson, fetchPendingRegistrations } from '@/features/people/services/peopleService';
import { usePeople } from '@/features/people/hooks/usePeople';
import { PersonForm } from './PersonForm';
import { GuestFormModal } from './GuestFormModal';
import { PendingRegistrationsList } from './PendingRegistrationsList';

const CATEGORY_LABELS: Record<PersonCategory, string> = {
  [PERSON_CATEGORY.FACULTY]: 'Faculty',
  [PERSON_CATEGORY.STUDENT]: 'Students',
  [PERSON_CATEGORY.EXTERNAL]: 'Guests',
};

const CATEGORY_BADGE_VARIANTS: Record<PersonCategory, 'primary' | 'info' | 'default'> = {
  [PERSON_CATEGORY.FACULTY]: 'primary',
  [PERSON_CATEGORY.STUDENT]: 'info',
  [PERSON_CATEGORY.EXTERNAL]: 'default',
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
    if (!window.confirm(`Delete "${p.full_name}"? This cannot be undone.`)) return;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">People Registry</h1>
          <p className="text-surface-500 mt-0.5 text-sm">
            Manage Faculty, Students, and Guests across the institution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button id="btn-add-guest" variant="outline" leftIcon={<UserPlus size={16} />} onClick={() => setShowGuestModal(true)}>
            + Add Guest
          </Button>
          <Button id="btn-add-person" leftIcon={<Plus size={16} />} onClick={openCreate}>
            Add Person
          </Button>
        </div>
      </div>

      {/* Main View Mode Selector (Approved Registry vs Pending Registrations) */}
      <div className="flex items-center gap-3 border-b border-surface-200">
        <button
          onClick={() => setViewMode('active')}
          className={`pb-3 px-1 font-semibold text-sm border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            viewMode === 'active'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-surface-500 hover:text-surface-700'
          }`}
        >
          <Users size={16} />
          <span>Active Registry</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-100 text-surface-600 text-xs font-bold">
            {people.length}
          </span>
        </button>

        <button
          onClick={() => setViewMode('pending')}
          className={`pb-3 px-1 font-semibold text-sm border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            viewMode === 'pending'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-surface-500 hover:text-surface-700'
          }`}
        >
          <Clock size={16} />
          <span>Pending Registrations</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold shadow-sm">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* VIEW MODE 1: PENDING REGISTRATIONS */}
      {viewMode === 'pending' ? (
        <PendingRegistrationsList
          onUpdated={() => {
            loadPendingCount();
            reload();
          }}
        />
      ) : (
        /* VIEW MODE 2: ACTIVE REGISTRY */
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
              />
              <input
                id="people-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name…"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-300 text-sm bg-white text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { key: null, label: 'All' },
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
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      active
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'bg-white text-surface-600 border-surface-300 hover:border-primary-400 hover:text-primary-600'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error banner */}
          {(error || deleteError) && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              {error ?? deleteError}
            </div>
          )}

          {/* Content Table */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : people.length === 0 ? (
            <div className="bg-white rounded-2xl border border-surface-200 shadow-sm">
              <EmptyState
                icon={<Users size={28} />}
                title={search || categoryFilter ? 'No results found' : 'No people registered yet'}
                description={
                  search || categoryFilter
                    ? 'Try a different name or category filter.'
                    : 'Add faculty, students, and guests to the registry.'
                }
                action={
                  !search && !categoryFilter ? (
                    <Button leftIcon={<Plus size={16} />} onClick={openCreate}>
                      Add Person
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 bg-surface-50">
                    <th className="text-left px-5 py-3.5 font-medium text-surface-600">Name</th>
                    <th className="text-left px-5 py-3.5 font-medium text-surface-600 hidden sm:table-cell">Category</th>
                    <th className="text-left px-5 py-3.5 font-medium text-surface-600 hidden md:table-cell">ID / Designation</th>
                    <th className="text-left px-5 py-3.5 font-medium text-surface-600 hidden lg:table-cell">Dept / Organization</th>
                    <th className="text-left px-5 py-3.5 font-medium text-surface-600 hidden lg:table-cell">Contact</th>
                    <th className="px-5 py-3.5 text-right font-medium text-surface-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {people.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-50/60 transition-colors group">
                      <td className="px-5 py-4">
                        <p className="font-medium text-surface-900">{p.full_name}</p>
                        {p.category === 'student' && p.usn_employee_id && (
                          <span className="text-[10px] text-surface-500 font-medium block mt-0.5">
                            SRN: <span className="font-mono">{p.usn_employee_id.replace(/^SRN:\s*/i, '')}</span>
                          </span>
                        )}
                        <span className="sm:hidden">
                          <Badge variant={CATEGORY_BADGE_VARIANTS[p.category]} className="mt-1">
                            {CATEGORY_LABELS[p.category]}
                          </Badge>
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <Badge variant={CATEGORY_BADGE_VARIANTS[p.category]}>
                          {CATEGORY_LABELS[p.category]}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell text-surface-600">
                        {p.usn_employee_id || p.designation || <span className="text-surface-300">—</span>}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell text-surface-600">
                        {p.department || p.organization || <span className="text-surface-300">—</span>}
                        {p.semester && <span className="block text-xs text-surface-400">{p.semester}</span>}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell text-surface-500">
                        {p.email || p.phone ? (
                          <div>
                            {p.email && <p className="truncate max-w-[180px]">{p.email}</p>}
                            {p.phone && <p className="text-xs text-surface-400">{p.phone}</p>}
                          </div>
                        ) : (
                          <span className="text-surface-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            id={`btn-edit-${p.id}`}
                            onClick={() => openEdit(p)}
                            title="Edit"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors cursor-pointer"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            id={`btn-delete-${p.id}`}
                            onClick={() => handleDelete(p)}
                            disabled={deletingId === p.id}
                            title="Delete"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            {deletingId === p.id ? (
                              <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

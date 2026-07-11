import { useState } from 'react';
import { Users, Plus, Search, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { EmptyState } from '@/components/ui';
import { Spinner } from '@/components/ui';
import { PERSON_CATEGORY, type PersonCategory } from '@/constants';
import type { Person } from '@/types';
import { deletePerson } from '@/features/people/services/peopleService';
import { usePeople } from '@/features/people/hooks/usePeople';
import { PersonForm } from './PersonForm';

const CATEGORY_LABELS: Record<PersonCategory, string> = {
  [PERSON_CATEGORY.FACULTY]: 'Faculty',
  [PERSON_CATEGORY.STUDENT]: 'Student',
  [PERSON_CATEGORY.EXTERNAL]: 'External / Guest',
};

const CATEGORY_BADGE_VARIANTS: Record<PersonCategory, 'primary' | 'info' | 'default'> = {
  [PERSON_CATEGORY.FACULTY]: 'primary',
  [PERSON_CATEGORY.STUDENT]: 'info',
  [PERSON_CATEGORY.EXTERNAL]: 'default',
};

const ALL_CATEGORIES: Array<PersonCategory | null> = [
  null,
  PERSON_CATEGORY.FACULTY,
  PERSON_CATEGORY.STUDENT,
  PERSON_CATEGORY.EXTERNAL,
];

export function PeoplePage() {
  const { people, isLoading, error, search, setSearch, categoryFilter, setCategoryFilter, reload } =
    usePeople();

  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreate = () => { setEditingPerson(null); setShowForm(true); };
  const openEdit = (p: Person) => { setEditingPerson(p); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingPerson(null); };

  const handleSaved = (_p: Person) => {
    closeForm();
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">People Registry</h1>
          <p className="text-surface-500 mt-0.5 text-sm">
            {people.length} {people.length === 1 ? 'person' : 'people'}{' '}
            {categoryFilter ? `· ${CATEGORY_LABELS[categoryFilter]}` : ''}
          </p>
        </div>
        <Button id="btn-add-person" leftIcon={<Plus size={16} />} onClick={openCreate}>
          Add Person
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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

        {/* Category filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {ALL_CATEGORIES.map((cat) => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat ?? 'all'}
                id={`filter-${cat ?? 'all'}`}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${
                  active
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white text-surface-600 border-surface-300 hover:border-primary-400 hover:text-primary-600'
                }`}
              >
                {cat ? CATEGORY_LABELS[cat] : 'All'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error banner */}
      {(error || deleteError) && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error ?? deleteError}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : people.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm">
          <EmptyState
            icon={<Users size={28} />}
            title={search || categoryFilter ? 'No results found' : 'No people yet'}
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
                <th className="text-left px-5 py-3.5 font-medium text-surface-600 hidden md:table-cell">Designation</th>
                <th className="text-left px-5 py-3.5 font-medium text-surface-600 hidden lg:table-cell">Organization</th>
                <th className="text-left px-5 py-3.5 font-medium text-surface-600 hidden lg:table-cell">Contact</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {people.map((p) => (
                <tr key={p.id} className="hover:bg-surface-50/60 transition-colors group">
                  <td className="px-5 py-4">
                    <p className="font-medium text-surface-900">{p.full_name}</p>
                    {/* Show category inline on mobile */}
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
                    {p.designation ?? <span className="text-surface-300">—</span>}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-surface-600">
                    {p.organization ?? <span className="text-surface-300">—</span>}
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
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        id={`btn-delete-${p.id}`}
                        onClick={() => handleDelete(p)}
                        disabled={deletingId === p.id}
                        title="Delete"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
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

      {/* Form modal */}
      {showForm && (
        <PersonForm
          person={editingPerson}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

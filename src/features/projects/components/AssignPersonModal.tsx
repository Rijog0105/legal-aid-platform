import { useEffect, useState } from 'react';
import { X, Search, CheckSquare, Square, Users } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { PROJECT_ROLE, PERSON_CATEGORY, type ProjectRole, type PersonCategory } from '@/constants';
import type { Person } from '@/types';
import { fetchPeople } from '@/features/people/services/peopleService';
import { assignMultiplePeopleToProject } from '@/features/projects/services/projectPeopleService';

/* ─── Labels ─────────────────────────────────────────────── */
const ROLE_LABELS: Record<ProjectRole, string> = {
  [PROJECT_ROLE.FACULTY_COORDINATOR]: 'Faculty Coordinator',
  [PROJECT_ROLE.GUEST]: 'Guest',
  [PROJECT_ROLE.VOLUNTEER]: 'Volunteer',
  [PROJECT_ROLE.TEAM_LEAD]: 'Team Lead',
};

const ROLE_SECTIONS: { role: ProjectRole; label: string; allowedCategories: PersonCategory[] }[] = [
  {
    role: PROJECT_ROLE.FACULTY_COORDINATOR,
    label: 'Faculty Coordinators',
    allowedCategories: [PERSON_CATEGORY.FACULTY],
  },
  {
    role: PROJECT_ROLE.VOLUNTEER,
    label: 'Student Volunteers',
    allowedCategories: [PERSON_CATEGORY.STUDENT],
  },
  {
    role: PROJECT_ROLE.GUEST,
    label: 'Guests',
    allowedCategories: [PERSON_CATEGORY.EXTERNAL],
  },
];

interface AssignPersonModalProps {
  campId: string;
  phase?: 'survey' | 'camp';
  alreadyAssignedPersonIds: string[];
  onClose: () => void;
  onAssigned: () => void;
}

export function AssignPersonModal({
  campId: projectId,
  phase,
  alreadyAssignedPersonIds,
  onClose,
  onAssigned,
}: AssignPersonModalProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [projectRole, setProjectRole] = useState<ProjectRole>(PROJECT_ROLE.VOLUNTEER);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchPeople({ search })
      .then((data) => {
        if (active) setPeople(data);
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Failed to load people'))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [search]);

  const section = ROLE_SECTIONS.find((s) => s.role === projectRole);
  const allowedCategories = section?.allowedCategories ?? [];

  const availablePeople = people.filter(
    (p) =>
      !alreadyAssignedPersonIds.includes(p.id) &&
      (allowedCategories.length === 0 || allowedCategories.includes(p.category))
  );

  const togglePerson = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === availablePeople.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availablePeople.map((p) => p.id)));
    }
  };

  const handleAssign = async () => {
    if (selectedIds.size === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      await assignMultiplePeopleToProject(projectId, Array.from(selectedIds), projectRole, phase || 'camp');
      onAssigned();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to assign people');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleChange = (role: ProjectRole) => {
    setProjectRole(role);
    setSelectedIds(new Set());
  };

  const allSelected =
    availablePeople.length > 0 && selectedIds.size === availablePeople.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[88vh] border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Users size={18} />
            </div>
            <h2 className="text-base font-bold text-slate-900">Assign People to Project</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Role selector tabs */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Assign Role in this Project
            </label>
            <div className="flex flex-wrap gap-2">
              {ROLE_SECTIONS.map((s) => (
                <button
                  key={s.role}
                  type="button"
                  onClick={() => handleRoleChange(s.role)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    projectRole === s.role
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  {ROLE_LABELS[s.role]}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by person name or SRN…"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
            />
          </div>

          {/* People list with checkboxes */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            {/* Select-all header */}
            {availablePeople.length > 1 && (
              <div
                onClick={toggleAll}
                className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <span className="text-indigo-600 shrink-0">
                  {allSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-400" />}
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {allSelected ? 'Deselect All' : `Select All (${availablePeople.length})`}
                </span>
              </div>
            )}

            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="sm" />
                </div>
              ) : availablePeople.length === 0 ? (
                <p className="text-xs text-slate-400 px-4 py-6 text-center">
                  {search ? 'No matching people found.' : 'All eligible people are already assigned.'}
                </p>
              ) : (
                availablePeople.map((p) => {
                  const checked = selectedIds.has(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-xs hover:bg-slate-50 transition-colors ${
                        checked ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePerson(p.id)}
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 cursor-pointer"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="font-bold text-slate-900 truncate block">{p.full_name}</span>
                        {p.category === 'student' && p.usn_employee_id ? (
                          <span className="text-[11px] text-slate-500 font-medium block">
                            SRN: <span className="font-mono">{p.usn_employee_id.replace(/^SRN:\s*/i, '')}</span>
                          </span>
                        ) : (
                          p.designation && (
                            <span className="text-[11px] text-slate-400 block">{p.designation}</span>
                          )
                        )}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                        {p.category}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {selectedIds.size > 0 && (
            <p className="text-xs text-indigo-600 font-bold">
              {selectedIds.size} person{selectedIds.size !== 1 ? 's' : ''} selected as{' '}
              {ROLE_LABELS[projectRole]}
            </p>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedIds.size === 0 || isSaving}
            onClick={handleAssign}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Assigning…</span>
              </>
            ) : (
              <span>Assign Selected ({selectedIds.size})</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

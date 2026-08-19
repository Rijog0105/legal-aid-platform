import { useEffect, useState } from 'react';
import { X, Search, CheckSquare, Square } from 'lucide-react';
import { Button, Badge, Spinner } from '@/components/ui';
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

const CATEGORY_BADGE: Record<PersonCategory, 'primary' | 'info' | 'default'> = {
  [PERSON_CATEGORY.FACULTY]: 'primary',
  [PERSON_CATEGORY.STUDENT]: 'info',
  [PERSON_CATEGORY.EXTERNAL]: 'default',
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
  campId: string; // campId is expected by ProjectPeopleTab to match the interface, let's keep it but internalize it as projectId
  alreadyAssignedPersonIds: string[];
  onClose: () => void;
  onAssigned: () => void;
}

export function AssignPersonModal({
  campId: projectId,
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

  // People not already assigned, filtered by allowed category for the selected role
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
      await assignMultiplePeopleToProject(projectId, Array.from(selectedIds), projectRole);
      onAssigned();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to assign people');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset selections when role changes
  const handleRoleChange = (role: ProjectRole) => {
    setProjectRole(role);
    setSelectedIds(new Set());
  };

  const allSelected =
    availablePeople.length > 0 && selectedIds.size === availablePeople.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-surface-900">Assign People to Project</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Role selector tabs */}
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-2">
              Assign as
            </label>
            <div className="flex flex-wrap gap-2">
              {ROLE_SECTIONS.map((s) => (
                <button
                  key={s.role}
                  type="button"
                  onClick={() => handleRoleChange(s.role)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    projectRole === s.role
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-white text-surface-600 border-surface-300 hover:border-primary-400 hover:text-primary-600'
                  }`}
                >
                  {ROLE_LABELS[s.role]}
                </button>
              ))}
            </div>
            {section && (
              <p className="text-[11px] text-surface-400 mt-1.5">
                Showing{' '}
                {allowedCategories.map((c) => c).join(' / ')}{' '}
                records only.
              </p>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-300 text-sm bg-white text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>

          {/* People list with checkboxes */}
          <div className="border border-surface-200 rounded-xl overflow-hidden">
            {/* Select-all header */}
            {availablePeople.length > 1 && (
              <label className="flex items-center gap-3 px-4 py-2.5 bg-surface-50 border-b border-surface-200 cursor-pointer hover:bg-surface-100 transition-colors">
                <span
                  onClick={toggleAll}
                  className="text-primary-600 flex-shrink-0 cursor-pointer"
                >
                  {allSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-surface-400" />}
                </span>
                <span className="text-xs font-semibold text-surface-700">
                  {allSelected ? 'Deselect all' : `Select all (${availablePeople.length})`}
                </span>
              </label>
            )}

            <div className="max-h-52 overflow-y-auto divide-y divide-surface-100">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="sm" />
                </div>
              ) : availablePeople.length === 0 ? (
                <p className="text-sm text-surface-400 px-4 py-6 text-center">
                  {search ? 'No matching people found.' : 'All eligible people are already assigned.'}
                </p>
              ) : (
                availablePeople.map((p) => {
                  const checked = selectedIds.has(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm hover:bg-surface-50 transition-colors ${
                        checked ? 'bg-primary-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePerson(p.id)}
                        className="w-4 h-4 rounded text-primary-600 border-surface-300 cursor-pointer"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="font-medium text-surface-900 truncate block">{p.full_name}</span>
                        {p.category === 'student' && p.usn_employee_id ? (
                          <span className="text-[11px] text-surface-500 font-medium block">
                            SRN: <span className="font-mono">{p.usn_employee_id.replace(/^SRN:\s*/i, '')}</span>
                          </span>
                        ) : (
                          p.designation && (
                            <span className="text-[11px] text-surface-400 block">{p.designation}</span>
                          )
                        )}
                      </span>
                      <Badge variant={CATEGORY_BADGE[p.category]} className="flex-shrink-0 capitalize text-[10px]">
                        {p.category}
                      </Badge>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {selectedIds.size > 0 && (
            <p className="text-xs text-primary-700 font-semibold">
              {selectedIds.size} person{selectedIds.size !== 1 ? 's' : ''} selected as{' '}
              {ROLE_LABELS[projectRole]}
            </p>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 bg-surface-50 flex-shrink-0">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={selectedIds.size === 0}
            isLoading={isSaving}
            onClick={handleAssign}
          >
            Assign Selected ({selectedIds.size})
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { X, Search } from 'lucide-react';
import { Button } from '@/components/ui';
import { CAMP_ROLE, type CampRole } from '@/constants';
import type { Person, CampPersonWithDetails } from '@/types';
import { fetchPeople } from '@/features/people/services/peopleService';
import { assignPersonToCamp } from '@/features/camps/services/campPeopleService';

const ROLE_LABELS: Record<CampRole, string> = {
  [CAMP_ROLE.FACULTY_COORDINATOR]: 'Faculty Coordinator',
  [CAMP_ROLE.GUEST]: 'Guest',
  [CAMP_ROLE.VOLUNTEER]: 'Volunteer',
  [CAMP_ROLE.TEAM_LEAD]: 'Team Lead',
};

const roleValues = [
  CAMP_ROLE.FACULTY_COORDINATOR,
  CAMP_ROLE.GUEST,
  CAMP_ROLE.VOLUNTEER,
  CAMP_ROLE.TEAM_LEAD,
] as const;

interface AssignPersonModalProps {
  campId: string;
  alreadyAssignedPersonIds: string[];
  onClose: () => void;
  onAssigned: (campPerson: CampPersonWithDetails) => void;
}

export function AssignPersonModal({
  campId,
  alreadyAssignedPersonIds,
  onClose,
  onAssigned,
}: AssignPersonModalProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [campRole, setCampRole] = useState<CampRole>(CAMP_ROLE.VOLUNTEER);
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

  const availablePeople = people.filter((p) => !alreadyAssignedPersonIds.includes(p.id));

  const handleAssign = async () => {
    if (!selectedPersonId) return;
    setIsSaving(true);
    setError(null);
    try {
      const result = await assignPersonToCamp(campId, selectedPersonId, campRole);
      onAssigned(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to assign person');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <h2 className="text-lg font-semibold text-surface-900">Assign Person to Camp</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-300 text-sm bg-white text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>

          <div className="max-h-56 overflow-y-auto border border-surface-200 rounded-xl divide-y divide-surface-100">
            {isLoading ? (
              <p className="text-sm text-surface-400 px-4 py-6 text-center">Loading…</p>
            ) : availablePeople.length === 0 ? (
              <p className="text-sm text-surface-400 px-4 py-6 text-center">
                No available people found.
              </p>
            ) : (
              availablePeople.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm hover:bg-surface-50 ${
                    selectedPersonId === p.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="selected-person"
                    checked={selectedPersonId === p.id}
                    onChange={() => setSelectedPersonId(p.id)}
                  />
                  <span className="flex-1 truncate">
                    {p.full_name}
                    <span className="text-surface-400"> · {p.category}</span>
                  </span>
                </label>
              ))
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="camp_role" className="text-sm font-medium text-surface-700">
              Camp Role
            </label>
            <select
              id="camp_role"
              value={campRole}
              onChange={(e) => setCampRole(e.target.value as CampRole)}
              className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white text-surface-900 border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            >
              {roleValues.map((val) => (
                <option key={val} value={val}>
                  {ROLE_LABELS[val]}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 bg-surface-50">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedPersonId}
            isLoading={isSaving}
            onClick={handleAssign}
          >
            Assign
          </Button>
        </div>
      </div>
    </div>
  );
}

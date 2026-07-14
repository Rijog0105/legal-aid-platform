import { useState } from 'react';
import { UserPlus, Trash2, Users, AlertCircle } from 'lucide-react';
import { Button, Badge, EmptyState, Spinner } from '@/components/ui';
import { CAMP_ROLE, type CampRole } from '@/constants';
import { useCampPeople } from '@/features/camps/hooks/useCampPeople';
import { removePersonFromCamp } from '@/features/camps/services/campPeopleService';
import { AssignPersonModal } from './AssignPersonModal';

const ROLE_LABELS: Record<CampRole, string> = {
  [CAMP_ROLE.FACULTY_COORDINATOR]: 'Faculty Coordinator',
  [CAMP_ROLE.GUEST]: 'Guest',
  [CAMP_ROLE.VOLUNTEER]: 'Volunteer',
  [CAMP_ROLE.TEAM_LEAD]: 'Team Lead',
};

interface CampPeopleTabProps {
  campId: string;
}

export function CampPeopleTab({ campId }: CampPeopleTabProps) {
  const { campPeople, isLoading, error, reload } = useCampPeople(campId);
  const [showAssign, setShowAssign] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const handleRemove = async (campPersonId: string, name: string) => {
    if (!window.confirm(`Remove "${name}" from this camp?`)) return;
    setRemovingId(campPersonId);
    setRemoveError(null);
    try {
      await removePersonFromCamp(campPersonId);
      reload();
    } catch (e) {
      setRemoveError(e instanceof Error ? e.message : 'Failed to remove person');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-surface-900">
          Assigned People ({campPeople.length})
        </h3>
        <Button size="sm" leftIcon={<UserPlus size={15} />} onClick={() => setShowAssign(true)}>
          Assign Person
        </Button>
      </div>

      {(error || removeError) && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error ?? removeError}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : campPeople.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm">
          <EmptyState
            icon={<Users size={28} />}
            title="No people assigned"
            description="Assign faculty, guests, volunteers, or team leads to this camp."
            action={
              <Button leftIcon={<UserPlus size={15} />} onClick={() => setShowAssign(true)}>
                Assign Person
              </Button>
            }
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50">
                <th className="text-left px-5 py-3.5 font-medium text-surface-600">Name</th>
                <th className="text-left px-5 py-3.5 font-medium text-surface-600">Camp Role</th>
                <th className="text-left px-5 py-3.5 font-medium text-surface-600 hidden sm:table-cell">
                  Category
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {campPeople.map((cp) => (
                <tr key={cp.id} className="hover:bg-surface-50/60 transition-colors group">
                  <td className="px-5 py-4 font-medium text-surface-900">
                    {cp.person?.full_name}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant="primary">{ROLE_LABELS[cp.camp_role]}</Badge>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-surface-600 capitalize">
                    {cp.person?.category}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRemove(cp.id, cp.person?.full_name ?? 'this person')}
                        disabled={removingId === cp.id}
                        title="Remove"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                      >
                        {removingId === cp.id ? (
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

      {showAssign && (
        <AssignPersonModal
          campId={campId}
          alreadyAssignedPersonIds={campPeople.map((cp) => cp.person_id)}
          onClose={() => setShowAssign(false)}
          onAssigned={() => {
            setShowAssign(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

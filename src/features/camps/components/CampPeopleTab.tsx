import { useState } from 'react';
import { UserPlus, Trash2, Users, AlertCircle, Crown, ShieldOff } from 'lucide-react';
import { Button, Badge, EmptyState, Spinner } from '@/components/ui';
import { CAMP_ROLE, type CampRole } from '@/constants';
import type { CampPersonWithDetails } from '@/types';
import { useCampPeople } from '@/features/camps/hooks/useCampPeople';
import {
  removePersonFromCamp,
  updateCampPersonRole,
} from '@/features/camps/services/campPeopleService';
import { AssignPersonModal } from './AssignPersonModal';

/* ─── Labels & Style ──────────────────────────────────────── */
const ROLE_LABELS: Record<CampRole, string> = {
  [CAMP_ROLE.FACULTY_COORDINATOR]: 'Faculty Coordinator',
  [CAMP_ROLE.GUEST]: 'Guest',
  [CAMP_ROLE.VOLUNTEER]: 'Volunteer',
  [CAMP_ROLE.TEAM_LEAD]: 'Team Lead',
};

const ROLE_BADGE_VARIANT: Record<CampRole, 'primary' | 'warning' | 'info' | 'default'> = {
  [CAMP_ROLE.FACULTY_COORDINATOR]: 'primary',
  [CAMP_ROLE.TEAM_LEAD]: 'warning',
  [CAMP_ROLE.VOLUNTEER]: 'info',
  [CAMP_ROLE.GUEST]: 'default',
};

/** Sections define the display order in the table. */
const SECTION_ORDER: CampRole[] = [
  CAMP_ROLE.FACULTY_COORDINATOR,
  CAMP_ROLE.TEAM_LEAD,
  CAMP_ROLE.VOLUNTEER,
  CAMP_ROLE.GUEST,
];

interface CampPeopleTabProps {
  campId: string;
}

export function CampPeopleTab({ campId }: CampPeopleTabProps) {
  const { campPeople, isLoading, error, reload } = useCampPeople(campId);
  const [showAssign, setShowAssign] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  /* ─── Remove ──────────────────────────────────────────── */
  const handleRemove = async (cp: CampPersonWithDetails) => {
    if (!window.confirm(`Remove "${cp.person?.full_name}" from this camp?`)) return;
    setRemovingId(cp.id);
    setActionError(null);
    try {
      await removePersonFromCamp(cp.id);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to remove person');
    } finally {
      setRemovingId(null);
    }
  };

  /* ─── Promote / Demote Team Lead ─────────────────────── */
  const handlePromoteToTeamLead = async (cp: CampPersonWithDetails) => {
    if (
      !window.confirm(
        `Promote "${cp.person?.full_name}" to Team Lead for this camp?\n\nThis changes their system role to Team Lead.`
      )
    )
      return;
    setPromotingId(cp.id);
    setActionError(null);
    try {
      await updateCampPersonRole(cp.id, CAMP_ROLE.TEAM_LEAD, cp.person_id);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to promote to Team Lead');
    } finally {
      setPromotingId(null);
    }
  };

  const handleDemoteTeamLead = async (cp: CampPersonWithDetails) => {
    if (
      !window.confirm(
        `Remove Team Lead role from "${cp.person?.full_name}"?\n\nThey will revert to Volunteer.`
      )
    )
      return;
    setPromotingId(cp.id);
    setActionError(null);
    try {
      await updateCampPersonRole(cp.id, CAMP_ROLE.VOLUNTEER, cp.person_id);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to remove Team Lead');
    } finally {
      setPromotingId(null);
    }
  };

  /* ─── Sorted People ───────────────────────────────────── */
  const sortedPeople = [...campPeople].sort(
    (a, b) =>
      SECTION_ORDER.indexOf(a.camp_role) - SECTION_ORDER.indexOf(b.camp_role)
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-surface-900">
          Assigned People ({campPeople.length})
        </h3>
        <Button size="sm" leftIcon={<UserPlus size={15} />} onClick={() => setShowAssign(true)}>
          Assign People
        </Button>
      </div>

      {/* Error */}
      {(error || actionError) && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error ?? actionError}
        </div>
      )}

      {/* Team Lead info banner */}
      {campPeople.length > 0 && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <Crown size={14} className="text-amber-600 shrink-0" />
          <span>
            Team Lead is a <strong>camp-level role</strong>. Use the{' '}
            <Crown size={12} className="inline" /> button on a Volunteer row to promote them.
          </span>
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
            description="Assign faculty, guests, and students to this camp."
            action={
              <Button leftIcon={<UserPlus size={15} />} onClick={() => setShowAssign(true)}>
                Assign People
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
                  Registry Category
                </th>
                <th className="text-left px-5 py-3.5 font-medium text-surface-600 hidden md:table-cell">
                  ID / Dept
                </th>
                <th className="px-5 py-3.5 text-right font-medium text-surface-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {sortedPeople.map((cp) => {
                const isTeamLead = cp.camp_role === CAMP_ROLE.TEAM_LEAD;
                const isVolunteer = cp.camp_role === CAMP_ROLE.VOLUNTEER;
                const isActioning = removingId === cp.id || promotingId === cp.id;

                return (
                  <tr
                    key={cp.id}
                    className={`hover:bg-surface-50/60 transition-colors group ${
                      isTeamLead ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {isTeamLead && (
                          <Crown size={14} className="text-amber-500 shrink-0" />
                        )}
                        <span className="font-medium text-surface-900">
                          {cp.person?.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={ROLE_BADGE_VARIANT[cp.camp_role]}>
                        {ROLE_LABELS[cp.camp_role]}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell text-surface-600 capitalize">
                      {cp.person?.category ?? '—'}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-surface-500 text-xs">
                      <span className="font-mono">
                        {cp.person?.usn_employee_id ?? '—'}
                      </span>
                      {cp.person?.department && (
                        <span className="block text-surface-400">{cp.person.department}</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        {/* Promote to Team Lead (only for Volunteers) */}
                        {isVolunteer && (
                          <button
                            onClick={() => handlePromoteToTeamLead(cp)}
                            disabled={isActioning}
                            title="Promote to Team Lead"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-amber-50 hover:text-amber-600 transition-colors disabled:opacity-40 opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            {promotingId === cp.id ? (
                              <span className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Crown size={15} />
                            )}
                          </button>
                        )}

                        {/* Demote from Team Lead (only for Team Lead) */}
                        {isTeamLead && (
                          <button
                            onClick={() => handleDemoteTeamLead(cp)}
                            disabled={isActioning}
                            title="Remove Team Lead"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-amber-500 hover:bg-amber-100 hover:text-amber-700 transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            {promotingId === cp.id ? (
                              <span className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ShieldOff size={15} />
                            )}
                          </button>
                        )}

                        {/* Remove from camp */}
                        <button
                          onClick={() => handleRemove(cp)}
                          disabled={isActioning}
                          title="Remove from camp"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 opacity-0 group-hover:opacity-100 cursor-pointer"
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
                );
              })}
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

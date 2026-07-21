import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { ChevronLeft, MapPin, Filter } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyCampAssignment } from '@/features/volunteer/hooks/useMyCampAssignment';
import { BudgetTab } from '@/features/budget';
import { Card, Spinner, Button } from '@/components/ui';
import { ROUTES } from '@/constants';

export function TeamLeadBudgetPage() {
  const { personId } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ campId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const targetCampId = params.campId || searchParams.get('campId');

  const { camp, allAssignments, isLoading, error, reload } = useMyCampAssignment(
    personId,
    targetCampId
  );

  const handleCampSelect = (newCampId: string) => {
    setSearchParams({ campId: newCampId });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4">
      {/* ─── Back Button & Camp Selector ─── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate(ROUTES.TEAM_LEAD_WORKSPACE)}
          className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} />
          Back to Team Lead Workspace
        </button>

        {allAssignments.length > 1 && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-surface-200 shadow-sm text-xs">
            <Filter size={13} className="text-surface-400" />
            <span className="font-semibold text-surface-600">Assigned Camp:</span>
            <select
              value={camp?.id ?? ''}
              onChange={(e) => handleCampSelect(e.target.value)}
              className="bg-transparent font-bold text-primary-700 focus:outline-none cursor-pointer"
            >
              {allAssignments.map((item) => (
                <option key={item.camp.id} value={item.camp.id}>
                  {item.camp.camp_name} ({item.camp.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ─── Page Title Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900">Team Lead Budget Workspace</h1>
          <p className="text-sm text-surface-500 mt-0.5">
            {camp ? camp.camp_name : 'No assigned camp selected'}
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-accent-100 text-accent-800 text-xs font-semibold">
          Team Lead
        </div>
      </div>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-sm text-red-600 text-center">{error}</p>
        </Card>
      )}

      {!camp && !isLoading ? (
        <Card className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-surface-100 text-surface-400 flex items-center justify-center mx-auto">
            <MapPin size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-surface-800">No Camp Assigned</h3>
            <p className="text-xs text-surface-500 max-w-md mx-auto">
              You are not currently assigned to a camp. Contact your faculty coordinator.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.TEAM_LEAD_WORKSPACE)}>
            Return to Workspace
          </Button>
        </Card>
      ) : (
        camp && <BudgetTab campId={camp.id} camp={camp} onCampUpdate={reload} />
      )}
    </div>
  );
}

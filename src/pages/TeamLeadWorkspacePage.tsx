import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyCampAssignment } from '@/features/volunteer/hooks/useMyCampAssignment';
import { Card, Spinner, Button } from '@/components/ui';
import { Camera, ClipboardList, Image as ImageIcon, FileText, DollarSign, MapPin } from 'lucide-react';
import { ROUTES } from '@/constants';

export function TeamLeadWorkspacePage() {
  const { displayName, personId } = useAuth();
  const navigate = useNavigate();
  const { camp, isLoading: campLoading, error: campError } = useMyCampAssignment(personId);

  if (campLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900">
            Welcome, {displayName || 'Team Lead'}
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            {camp ? camp.camp_name : 'Team Lead Workspace'}
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-accent-100 text-accent-800 text-xs font-semibold">
          Team Lead
        </div>
      </div>

      {campError && (
        <Card>
          <p className="text-sm text-red-600 text-center py-4">{campError}</p>
        </Card>
      )}

      {!camp && !campLoading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <MapPin className="w-8 h-8 text-surface-400" />
            <p className="text-sm font-semibold text-surface-800">No active camp assigned</p>
            <p className="text-xs text-surface-500">Contact your faculty coordinator for camp assignment.</p>
          </div>
        </Card>
      )}

      {/* ─── Launchpad Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Volunteer Mode Card */}
        <Card className="hover:border-primary-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0">
                <Camera size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-surface-900">Volunteer Mode</h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  Fill surveys and capture photos exactly like a volunteer.
                </p>
              </div>
            </div>
            <Button size="sm" variant="primary" onClick={() => navigate(ROUTES.VOLUNTEER_HOME)}>
              Open
            </Button>
          </div>
        </Card>

        {/* Survey Dashboard Card */}
        <Card className="hover:border-surface-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                <ClipboardList size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-surface-900">Survey Dashboard</h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  View total, completed, and pending survey forms.
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate(ROUTES.TEAM_LEAD_SURVEYS)}>
              Open
            </Button>
          </div>
        </Card>

        {/* Activity Photos Card */}
        <Card className="hover:border-surface-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <ImageIcon size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-surface-900">Activity Photos</h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  View all volunteer photographs grouped by activity.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(ROUTES.TEAM_LEAD_PHOTOS)}
              disabled={!camp}
            >
              Open
            </Button>
          </div>
        </Card>

        {/* Survey Reports Card */}
        <Card className="hover:border-surface-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-surface-900">Survey Reports</h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  Access individual beneficiary reports and camp survey metrics.
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate(ROUTES.TEAM_LEAD_REPORTS)}>
              Open
            </Button>
          </div>
        </Card>

        {/* Budget Card */}
        <Card className="hover:border-surface-300 transition-colors md:col-span-2">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                <DollarSign size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-surface-900">Budget</h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  Monitor requested, spent, and remaining camp budget allocation.
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate(ROUTES.TEAM_LEAD_BUDGET)}>
              Open
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Info, MapPin } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyProjectAssignment } from '@/features/volunteer/hooks/useMyProjectAssignment';
import { Card, Button, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';

interface TeamLeadPlaceholderPageProps {
  title: string;
  description: string;
  targetPhase: string;
}

export function TeamLeadPlaceholderPage({
  title,
  description,
  targetPhase,
}: TeamLeadPlaceholderPageProps) {
  const { personId } = useAuth();
  const navigate = useNavigate();
  const { project, isLoading } = useMyProjectAssignment(personId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto py-4">
      {/* ─── Back Button ─── */}
      <button
        onClick={() => navigate(ROUTES.TEAM_LEAD_WORKSPACE)}
        className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 transition-colors cursor-pointer"
      >
        <ChevronLeft size={16} />
        Back to Team Lead Workspace
      </button>

      <div>
        <h1 className="text-xl font-bold text-surface-900">{title}</h1>
        <p className="text-sm text-surface-500 mt-0.5">{project ? project.camp_name : 'Team Lead Module'}</p>
      </div>

      <Card className="p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto">
          <Info size={24} />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-surface-800">{title} Workspace</h3>
          <p className="text-xs text-surface-500 max-w-md mx-auto leading-relaxed">{description}</p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-100 text-surface-600 text-xs font-medium">
          <span>Target Roadmap Phase:</span>
          <span className="font-semibold text-primary-700">{targetPhase}</span>
        </div>

        {project && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-surface-400 pt-2 border-t border-surface-100">
            <MapPin size={13} />
            <span>{project.village_name}, {project.district}</span>
          </div>
        )}
      </Card>

      <div className="flex justify-center">
        <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.TEAM_LEAD_WORKSPACE)}>
          Return to Workspace
        </Button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Calendar, MapPin, Clock, X, AlertCircle, FileText } from 'lucide-react';
import { Button, Card, ProjectStatusBadge, Spinner } from '@/components/ui';
import { PROJECT_STATUS, ROUTES, type ProjectStatus } from '@/constants';
import { useProject } from '@/features/projects/hooks/useProject';
import { updateProjectStatus } from '@/features/projects/services/projectService';
import { ProjectForm } from './ProjectForm';
import { ProjectPeopleTab } from './ProjectPeopleTab';
import { ActivitiesTab } from '@/features/activities';
import { PhotosTab } from '@/features/volunteer';
import { ReportPreparationTab } from './ReportPreparationTab';
import { BudgetTab } from '@/features/budget';

const STATUS_FLOW: Record<ProjectStatus, ProjectStatus[]> = {
  [PROJECT_STATUS.DRAFT]: [PROJECT_STATUS.ACTIVE],
  [PROJECT_STATUS.ACTIVE]: [PROJECT_STATUS.COMPLETED],
  [PROJECT_STATUS.COMPLETED]: [PROJECT_STATUS.ARCHIVED],
  [PROJECT_STATUS.ARCHIVED]: [],
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  [PROJECT_STATUS.DRAFT]: 'Draft',
  [PROJECT_STATUS.ACTIVE]: 'Active',
  [PROJECT_STATUS.COMPLETED]: 'Completed',
  [PROJECT_STATUS.ARCHIVED]: 'Archived',
};

type Tab = 'overview' | 'people' | 'attendance' | 'activities' | 'photos' | 'surveys' | 'budget' | 'report';

const TABS: { key: Tab; label: string; phase?: string }[] = [
  { key: 'overview', label: 'Project Info' },
  { key: 'people', label: 'Assign People' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'activities', label: 'Activities' },
  { key: 'photos', label: 'Documentation' },
  { key: 'surveys', label: 'Surveys' },
  { key: 'budget', label: 'Budget', phase: 'Phase 7' },
  { key: 'report', label: 'Report Studio', phase: 'Phase 8' },
];

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { project, isLoading, error, setProject, reload } = useProject(projectId);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showEdit, setShowEdit] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const handleStatusChange = async (status: ProjectStatus) => {
    if (!project) return;
    setStatusUpdating(true);
    setStatusError(null);
    try {
      const updated = await updateProjectStatus(project.id, status);
      setProject(updated);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        <AlertCircle size={16} className="flex-shrink-0" />
        {error ?? 'Project not found'}
      </div>
    );
  }

  const nextStatuses = STATUS_FLOW[project.status];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ─── Back Link ─── */}
      <Link
        to={ROUTES.PROJECTS}
        className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 transition-colors"
      >
        <ArrowLeft size={15} /> Back to Projects
      </Link>

      {/* ─── Project Header ─── */}
      <div className="flex flex-wrap items-start justify-between gap-4 bg-white p-6 rounded-3xl border border-surface-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-surface-900">{project.camp_name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-surface-500">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-surface-400" /> {project.camp_date}
            </span>
            {(project.start_time || project.end_time) && (
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-surface-400" />
                {project.start_time ?? '—'} – {project.end_time ?? '—'}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-surface-400" />
              {project.village_name}, {project.taluk}, {project.district}
            </span>
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex items-center gap-2">
          {nextStatuses.map((status) => (
            <Button
              key={status}
              size="sm"
              variant="secondary"
              isLoading={statusUpdating}
              onClick={() => handleStatusChange(status)}
            >
              Mark {STATUS_LABELS[status]}
            </Button>
          ))}
          <Button size="sm" variant="outline" leftIcon={<Pencil size={14} />} onClick={() => setShowEdit(true)}>
            Edit Details
          </Button>
        </div>
      </div>

      {statusError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {statusError}
        </div>
      )}

      {/* ─── Project Workspace Modules (Tabs Navigation) ─── */}
      <div className="flex items-center gap-1 border-b border-surface-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-surface-500 hover:text-surface-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab Content Views ─── */}

      {/* 1. Project Info Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {project.description && (
            <Card>
              <h3 className="text-sm font-bold text-surface-900 mb-1">Project Description</h3>
              <p className="text-sm text-surface-600 leading-relaxed">{project.description}</p>
            </Card>
          )}

          <Card>
            <h3 className="text-sm font-bold text-surface-900 mb-3">Automation & Report Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="bg-surface-50 p-3 rounded-xl border border-surface-100">
                <p className="text-xs text-surface-400">Include Budget in Report</p>
                <p className="text-surface-900 font-semibold mt-0.5">
                  {project.report_settings?.include_budget ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="bg-surface-50 p-3 rounded-xl border border-surface-100">
                <p className="text-xs text-surface-400">Include Survey Statistics</p>
                <p className="text-surface-900 font-semibold mt-0.5">
                  {project.report_settings?.include_survey_stats ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="bg-surface-50 p-3 rounded-xl border border-surface-100">
                <p className="text-xs text-surface-400">Max Photos / Activity</p>
                <p className="text-surface-900 font-semibold mt-0.5">
                  {project.report_settings?.max_photos_per_activity}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 2. Assign People */}
      {activeTab === 'people' && <ProjectPeopleTab campId={project.id} />}

      {/* 3. Attendance */}
      {activeTab === 'attendance' && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-base font-bold text-surface-900">Project Attendance</h3>
            <span className="text-xs text-surface-500 font-normal">
              (Derived from assigned delegation roster)
            </span>
          </div>
          <ProjectPeopleTab campId={project.id} />
        </Card>
      )}

      {/* 4. Activities */}
      {activeTab === 'activities' && <ActivitiesTab campId={project.id} />}

      {/* 5. Documentation (Photos Curation) */}
      {activeTab === 'photos' && <PhotosTab campId={project.id} />}

      {/* 6. Surveys Placeholder */}
      {activeTab === 'surveys' && (
        <Card className="p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <FileText size={24} />
          </div>
          <h3 className="text-base font-bold text-surface-900">Surveys Module Integration</h3>
          <p className="text-xs text-surface-500 max-w-md mx-auto leading-relaxed">
            Beneficiary survey form collection and survey metric aggregation.
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-100 text-surface-600 text-xs font-medium">
            <span>Roadmap Target:</span>
            <span className="font-semibold text-primary-700">Phase 7 (Survey Integration)</span>
          </div>
        </Card>
      )}

      {/* 7. Budget Module */}
      {activeTab === 'budget' && (
        <BudgetTab campId={project.id} camp={project} onCampUpdate={reload} />
      )}

      {/* 8. Report Preparation Workspace */}
      {activeTab === 'report' && (
        <ReportPreparationTab
          projectId={project.id}
          onNavigateTab={(tabKey) => {
            if (tabKey === 'activities' || tabKey === 'photos') {
              setActiveTab(tabKey);
            }
          }}
        />
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowEdit(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
              <h2 className="text-lg font-semibold text-surface-900">Edit Project</h2>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
              <ProjectForm
                project={project}
                onCancel={() => setShowEdit(false)}
                onSaved={(updated) => {
                  setProject(updated);
                  setShowEdit(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

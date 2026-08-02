import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Calendar,
  MapPin,
  Clock,
  X,
  AlertCircle,
  FileText,
  CheckCircle,
  ClipboardList,
  Layers,
  Users,
  DollarSign,
  Camera,
  Trash2,
} from 'lucide-react';
import { Button, Card, ProjectStatusBadge, Spinner } from '@/components/ui';
import { PROJECT_STATUS, ROLES, ROUTES, type ProjectStatus } from '@/constants';
import { useProject } from '@/features/projects/hooks/useProject';
import { updateProjectStatus, deleteProject } from '@/features/projects/services/projectService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ProjectForm } from './ProjectForm';
import { ProjectPeopleTab } from './ProjectPeopleTab';
import { ActivitiesTab } from '@/features/activities';
import { PhotosTab } from '@/features/volunteer';
import { ReportPreparationTab } from './ReportPreparationTab';
import { BudgetTab } from '@/features/budget';
import { SurveySchedule } from './SurveySchedule';
import { CampSchedule } from './CampSchedule';
import { ProjectOverviewCard } from './ProjectOverviewCard';
import { AttendanceTab } from '@/features/attendance/components/AttendanceTab';

/* ─── Status Configuration ─────────────────────────────── */

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

/* ─── Navigation Tab Types ──────────────────────────────── */

type MainTab = 'overview' | 'survey' | 'camp' | 'report';
type SurveySubTab = 'dashboard' | 'schedule' | 'people' | 'attendance' | 'forms' | 'budget';
type CampSubTab = 'activities' | 'photos' | 'budget' | 'schedule' | 'people' | 'attendance';

const SURVEY_SUB_TABS = [
  { key: 'dashboard', label: 'Survey Dashboard', icon: <ClipboardList size={20} /> },
  { key: 'schedule', label: 'Schedule Survey', icon: <Calendar size={20} /> },
  { key: 'people', label: 'Assign People', icon: <Users size={20} /> },
  { key: 'attendance', label: 'Attendance', icon: <CheckCircle size={20} /> },
  { key: 'forms', label: 'Survey Forms', icon: <FileText size={20} /> },
  { key: 'budget', label: 'Survey Budget', icon: <DollarSign size={20} /> },
] as const;

const CAMP_SUB_TABS = [
  { key: 'activities', label: 'Activities', icon: <Layers size={20} /> },
  { key: 'photos', label: 'Documentation Photos', icon: <Camera size={20} /> },
  { key: 'budget', label: 'Camp Budget', icon: <DollarSign size={20} /> },
  { key: 'schedule', label: 'Schedule Camp', icon: <Calendar size={20} /> },
  { key: 'people', label: 'Assign People', icon: <Users size={20} /> },
  { key: 'attendance', label: 'Attendance', icon: <CheckCircle size={20} /> },
] as const;

/* ─── Component ─────────────────────────────────────────── */

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { project, isLoading, error, setProject, reload } = useProject(projectId);

  const canEdit = hasRole([ROLES.FACULTY, ROLES.ADMIN]);

  /* ── Persistent navigation state via localStorage ── */
  const storageKeyMain = `project_detail_${projectId}_active_main_tab`;
  const storageKeySurvey = `project_detail_${projectId}_active_survey_sub_tab`;
  const storageKeyCamp = `project_detail_${projectId}_active_camp_sub_tab`;

  const [activeMainTab, setActiveMainTab] = useState<MainTab>(
    () => (localStorage.getItem(storageKeyMain) as MainTab) || 'overview'
  );
  const [activeSurveySubTab, setActiveSurveySubTab] = useState<SurveySubTab>(
    () => (localStorage.getItem(storageKeySurvey) as SurveySubTab) || 'dashboard'
  );
  const [activeCampSubTab, setActiveCampSubTab] = useState<CampSubTab>(
    () => (localStorage.getItem(storageKeyCamp) as CampSubTab) || 'activities'
  );

  /* ── UI state ── */
  const [showEdit, setShowEdit] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  /* ── Delete Dialog state ── */
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /* ── Navigation handlers ── */
  const handleMainTabChange = (tab: MainTab) => {
    setActiveMainTab(tab);
    localStorage.setItem(storageKeyMain, tab);
  };

  const handleSurveySubTabChange = (tab: SurveySubTab) => {
    setActiveSurveySubTab(tab);
    localStorage.setItem(storageKeySurvey, tab);
  };

  const handleCampSubTabChange = (tab: CampSubTab) => {
    setActiveCampSubTab(tab);
    localStorage.setItem(storageKeyCamp, tab);
  };

  const navigateToSurveySchedule = () => {
    handleMainTabChange('survey');
    handleSurveySubTabChange('schedule');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToCampSchedule = () => {
    handleMainTabChange('camp');
    handleCampSubTabChange('schedule');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToAttendance = (phase: 'survey' | 'camp') => {
    handleMainTabChange(phase);
    if (phase === 'survey') {
      handleSurveySubTabChange('attendance');
    } else {
      handleCampSubTabChange('attendance');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── Status change ── */
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

  /* ── Delete Project ── */
  const isDeleteConfirmed = project
    ? deleteConfirmName.trim().toLowerCase() === project.camp_name.trim().toLowerCase()
    : false;

  const handleDeleteProject = async () => {
    if (!project || !isDeleteConfirmed) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteProject(project.id);
      // Clean up local storage keys for this project
      localStorage.removeItem(storageKeyMain);
      localStorage.removeItem(storageKeySurvey);
      localStorage.removeItem(storageKeyCamp);
      // Navigate to list, passing deletion success state
      navigate(ROUTES.PROJECTS, {
        state: { deletedProjectName: project.camp_name },
      });
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete project. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteDialog = () => {
    if (isDeleting) return;
    setShowDeleteDialog(false);
    setDeleteConfirmName('');
    setDeleteError(null);
  };

  /* ── Loading / Error states ── */
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

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
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
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Pencil size={14} />}
            onClick={() => setShowEdit(true)}
          >
            Edit Details
          </Button>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Trash2 size={14} />}
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              Delete Project
            </Button>
          )}
        </div>
      </div>

      {statusError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {statusError}
        </div>
      )}

      {/* ─── Segmented Workspace Switcher ─── */}
      <div className="flex bg-surface-100 p-1.5 rounded-2xl border border-surface-200/80 max-w-lg shadow-sm">
        {(
          [
            { key: 'overview', label: 'Overview' },
            { key: 'survey', label: 'Survey Phase' },
            { key: 'camp', label: 'Camp Phase' },
            { key: 'report', label: 'Final Report' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleMainTabChange(tab.key)}
            className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === tab.key
                ? 'bg-white text-surface-900 shadow-sm border border-surface-200/30'
                : 'text-surface-500 hover:text-surface-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}

      {/* 1. OVERVIEW — Executive Dashboard (read-only) */}
      {activeMainTab === 'overview' && (
        <ProjectOverviewCard
          project={project}
          onNavigateToSurveySchedule={navigateToSurveySchedule}
          onNavigateToCampSchedule={navigateToCampSchedule}
          onNavigateToAttendance={navigateToAttendance}
        />
      )}

      {/* 2. SURVEY PHASE */}
      {activeMainTab === 'survey' && (
        <div className="space-y-6">
          {/* Sub-navigation */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {SURVEY_SUB_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleSurveySubTabChange(tab.key)}
                className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer h-24 shadow-sm ${
                  activeSurveySubTab === tab.key
                    ? 'bg-primary-50/70 border-primary-300 text-primary-900 shadow-sm font-bold scale-[1.02]'
                    : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50 hover:border-surface-300 font-semibold'
                }`}
              >
                {tab.icon}
                <span className="text-[11px] leading-tight">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Sub-tab content */}
          {activeSurveySubTab === 'dashboard' && (
            <Card className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <ClipboardList size={24} />
              </div>
              <h3 className="text-base font-bold text-surface-900">Survey Dashboard</h3>
              <p className="text-xs text-surface-500 max-w-md mx-auto leading-relaxed">
                Aggregated survey metrics, response ratios, and list of submitted forms.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-100 text-surface-600 text-xs font-medium">
                <span>Phase Integration Target:</span>
                <span className="font-semibold text-primary-700">Phase 8 (Survey Engine)</span>
              </div>
            </Card>
          )}

          {activeSurveySubTab === 'schedule' && (
            <SurveySchedule project={project} onUpdate={reload} />
          )}

          {activeSurveySubTab === 'people' && (
            <ProjectPeopleTab campId={project.id} />
          )}

          {activeSurveySubTab === 'attendance' && (
            <AttendanceTab campId={project.id} phase="survey" />
          )}

          {activeSurveySubTab === 'forms' && (
            <Card className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-100 text-surface-600 flex items-center justify-center mx-auto">
                <FileText size={24} />
              </div>
              <h3 className="text-base font-bold text-surface-900">Survey Forms Integration</h3>
              <p className="text-xs text-surface-500 max-w-md mx-auto leading-relaxed">
                Survey forms will serve as the central module of the survey engine. Verification photos
                and survey photos will be integrated directly into individual survey submissions during
                Phase 8 implementation.
              </p>
            </Card>
          )}

          {activeSurveySubTab === 'budget' && (
            <BudgetTab campId={project.id} camp={project} phase="survey" onCampUpdate={reload} />
          )}
        </div>
      )}

      {/* 3. CAMP PHASE */}
      {activeMainTab === 'camp' && (
        <div className="space-y-6">
          {/* Sub-navigation */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {CAMP_SUB_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleCampSubTabChange(tab.key)}
                className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer h-24 shadow-sm ${
                  activeCampSubTab === tab.key
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-sm font-bold scale-[1.02]'
                    : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50 hover:border-surface-300 font-semibold'
                }`}
              >
                {tab.icon}
                <span className="text-[11px] leading-tight">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Sub-tab content */}
          {activeCampSubTab === 'activities' && <ActivitiesTab campId={project.id} />}

          {activeCampSubTab === 'photos' && <PhotosTab campId={project.id} />}

          {activeCampSubTab === 'budget' && (
            <BudgetTab campId={project.id} camp={project} phase="camp" onCampUpdate={reload} />
          )}

          {activeCampSubTab === 'schedule' && (
            <CampSchedule project={project} onUpdate={reload} />
          )}

          {activeCampSubTab === 'people' && <ProjectPeopleTab campId={project.id} />}

          {activeCampSubTab === 'attendance' && (
            <AttendanceTab campId={project.id} phase="camp" />
          )}
        </div>
      )}

      {/* 4. FINAL REPORT */}
      {activeMainTab === 'report' && (
        <ReportPreparationTab
          projectId={project.id}
          onNavigateTab={(tabKey) => {
            if (tabKey === 'activities') handleMainTabChange('camp');
            if (tabKey === 'photos') handleMainTabChange('camp');
          }}
        />
      )}

      {/* ─── Edit Modal ─── */}
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

      {/* ─── Delete Confirmation Dialog ─── */}
      {showDeleteDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && handleCloseDeleteDialog()}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Dialog Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-red-100 bg-red-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-red-900">Delete Project</h2>
                  <p className="text-xs text-red-600">This action cannot be undone</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDeleteDialog}
                disabled={isDeleting}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-surface-700">
                You are about to permanently delete{' '}
                <span className="font-bold text-surface-900">{project.camp_name}</span>.
              </p>

              {/* What will be deleted */}
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-red-800 uppercase tracking-wide">
                  The following will be permanently removed:
                </p>
                <ul className="space-y-1">
                  {[
                    'Survey Schedule & Camp Schedule',
                    'Assigned People & Roster',
                    'Activities & Activity Data',
                    'Attendance Records',
                    'Budget & Expense Records',
                    'Documentation Photos',
                    'Survey Forms (future)',
                    'Generated Reports (future)',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-red-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Confirmation input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-700">
                  Type the project name to confirm:{' '}
                  <span className="text-surface-900 font-bold">"{project.camp_name}"</span>
                </label>
                <input
                  id="delete-confirm-input"
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder="Enter project name…"
                  disabled={isDeleting}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white text-surface-900 border-surface-300 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-all disabled:opacity-60"
                  autoComplete="off"
                />
              </div>

              {deleteError && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCloseDeleteDialog}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                isLoading={isDeleting}
                disabled={!isDeleteConfirmed || isDeleting}
                onClick={handleDeleteProject}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Project
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
